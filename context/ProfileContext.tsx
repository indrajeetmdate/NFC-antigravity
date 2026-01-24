
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

    // Fallback safety (keep as last resort)
    const safetyTimeout = setTimeout(() => {
      if (mounted.current && loading) {
        console.warn("Auth initialization fallback triggered");
        setLoading(false);
      }
    }, 8000);

    const initAuth = async () => {
      try {
        // 1. Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted.current) {
          setSession(initialSession);
          if (initialSession) {
            await fetchProfile(initialSession);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // 2. Listen for changes (Login, Logout, Auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted.current) return;

      // Update session state
      setSession(newSession);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // If we already have a profile and the user ID hasn't changed, we might not need to refetch?
        // But to be safe and "lag-free", we can fetch in background if not loading.
        // If we are loading (initial boot), we wait for it.

        // However, to fix "stuck", let's be explicit:
        if (newSession) await fetchProfile(newSession);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false); // Immediate release on logout
      }

      // Note: We don't forcefully set loading=false here for INITIAL_SESSION because `initAuth` handles the primary loading state.
      // For other events like SIGNED_IN (manual login), we might want to ensure loading is handled if Auth component relies on it.
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
