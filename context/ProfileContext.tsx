
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useSupabaseLifecycle } from '../lib/supabaseLifecycle';
import { Profile } from '../types';

interface ProfileContextType {
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  isReconnecting: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const mounted = useRef(true);

  // Fetch profile helper
  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      if (mounted.current) setProfile(null);
      return;
    }

    if (mounted.current) setError(null);

    try {
      const { data, error: apiError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (apiError) {
        throw apiError;
      }

      if (mounted.current) {
        setProfile(data as Profile | null);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      if (mounted.current) setError(err);
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
      } catch (err: any) {
        console.error("Auth initialization error:", err);
        if (mounted.current) setError(err);
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
        if (newSession) await fetchProfile(newSession);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Handle Tab Visibility Changes with enhanced recovery using lifecycle hook
  useSupabaseLifecycle({
    onSessionRecovered: async (recoveredSession) => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Session recovered, refreshing profile...');
      setIsReconnecting(false);
      setSession(recoveredSession);

      // Re-fetch profile to ensure we have fresh data
      await fetchProfile(recoveredSession);
    },
    onSessionLost: () => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Session lost during recovery');
      setIsReconnecting(false);
      // Don't clear session here - let the auth state change handler deal with it
      // This prevents flash of logged-out state if the session is actually still valid
    },
    onVisibilityChange: (isVisible) => {
      if (isVisible && session) {
        // Tab became visible - mark as reconnecting
        setIsReconnecting(true);
      }
    },
    debounceMs: 300,
    timeoutMs: 5000
  });

  const refreshProfile = useCallback(async () => {
    if (session) {
      await fetchProfile(session);
    }
  }, [fetchProfile, session]);

  const handleSignOut = useCallback(async () => {
    // Optimistic clear to prevent redirect race conditions
    setSession(null);
    setProfile(null);
    setLoading(false);
    setError(null);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, session, loading, error, isReconnecting, refreshProfile, signOut: handleSignOut }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
};
