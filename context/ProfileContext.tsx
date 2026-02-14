import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface ProfileContextType {
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Minimal ProfileContext - No lifecycle complexity
 * 
 * INVARIANTS:
 * 1. Auth listener only updates session state
 * 2. Profile fetched once on mount if session exists
 * 3. No visibility-driven logic
 * 4. No recovery/fallback timers
 */
export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  // Fetch profile - pull-based, explicit calls only
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: apiError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (apiError) throw apiError;

      if (mounted.current) {
        setProfile(data as Profile | null);
      }
    } catch (err: any) {
      console.error('[ProfileContext] Error fetching profile:', err);
      if (mounted.current) setError(err);
    }
  }, []);

  // Initial auth check and listener setup
  useEffect(() => {
    mounted.current = true;

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (mounted.current) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            await fetchProfile(initialSession.user.id);
          }
        }
      } catch (err: any) {
        console.error('[ProfileContext] Auth init error:', err);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    initAuth();

    // Auth listener - only updates state, no side effects
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted.current) return;

      console.log(`[ProfileContext] Auth event: ${event}`);
      setSession(newSession);

      // Fetch profile on sign in
      if (event === 'SIGNED_IN' && newSession?.user?.id) {
        fetchProfile(newSession.user.id);
      }

      // Clear profile on sign out
      if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Explicit refresh for user-triggered actions
  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [fetchProfile, session]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    setSession(null);
    setProfile(null);
    setLoading(false);
    setError(null);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[ProfileContext] Sign out error:', err);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, session, loading, error, refreshProfile, signOut: handleSignOut }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
};
