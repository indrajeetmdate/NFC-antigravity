
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface ProfileContextType {
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // Fetch profile helper
  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      if (mounted.current) setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }
      
      if (mounted.current) {
         // maybeSingle returns null data if no row found, which is valid for new users
         setProfile(data as Profile | null);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      // We don't set profile to null here to preserve potential stale data or avoid UI flicker
      // but if it was null, it stays null.
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Safety timeout to ensure loading doesn't stick forever (e.g. network issues)
    const safetyTimeout = setTimeout(() => {
        if (mounted.current && loading) {
            console.warn("Auth initialization timed out - forcing app load");
            setLoading(false);
        }
    }, 5000); // 5 seconds max for initial load

    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted.current) {
          setSession(initialSession);
          if (initialSession) {
            await fetchProfile(initialSession);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        if (mounted.current) {
            setLoading(false);
            clearTimeout(safetyTimeout);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
       if (!mounted.current) return;
       
       setSession(newSession);
       
       if (newSession) {
         // If we have a new session (login/magic link), fetch profile
         // We await this to ensure profile is ready if possible, but we don't block `loading` here
         // because `loading` is mostly for the INITIAL app load.
         await fetchProfile(newSession);
       } else {
         setProfile(null);
       }
       
       // Ensure loading is false (handling cases where auth change happens before init finishes)
       setLoading(false);
    });

    return () => {
      mounted.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) {
        await fetchProfile(session);
    }
  }, [fetchProfile, session]);

  return (
    <ProfileContext.Provider value={{ profile, session, loading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
};
