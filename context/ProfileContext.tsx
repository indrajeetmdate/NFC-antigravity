
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

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  const initialLoadComplete = useRef(false); // Prevent visibility handler during initial load

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
    initialLoadComplete.current = false;

    // Fallback safety (keep as last resort)
    const safetyTimeout = setTimeout(() => {
      if (mounted.current && loading) {
        console.warn("Auth initialization fallback triggered");
        setLoading(false);
        initialLoadComplete.current = true;
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
          initialLoadComplete.current = true; // Mark initial load as complete
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

  // Helper function to refresh session with retry logic
  const refreshSessionWithRetry = useCallback(async (maxRetries = 3): Promise<Session | null> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          return data.session;
        }
        if (error) {
          console.warn(`Session refresh attempt ${i + 1} failed:`, error.message);
        }
      } catch (err) {
        console.warn(`Session refresh attempt ${i + 1} threw:`, err);
      }

      // Don't wait after the last attempt
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    return null;
  }, []);

  // Handle Tab Visibility Changes (Fix for Background Throttling)
  // Only runs AFTER initial auth is complete to prevent race conditions
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Don't run during initial load - let initAuth handle it
      if (!initialLoadComplete.current) {
        console.log("Visibility change ignored - initial load not complete");
        return;
      }

      if (document.visibilityState === 'visible' && mounted.current) {
        console.log("Tab active: Validating session...");
        try {
          // Always get fresh session from Supabase
          const { data: { session: freshSession }, error } = await supabase.auth.getSession();

          if (error) {
            console.error("Error getting session:", error);
            throw error;
          }

          if (freshSession) {
            // Always sync session state and re-fetch profile
            if (mounted.current) {
              setSession(freshSession);
              await fetchProfile(freshSession);
            }
          } else {
            // No session from getSession - try refresh with retry
            console.log("No session found, attempting refresh...");
            const refreshedSession = await refreshSessionWithRetry();

            if (mounted.current) {
              if (refreshedSession) {
                setSession(refreshedSession);
                await fetchProfile(refreshedSession);
              } else {
                // No session at all - user needs to log in again
                console.log("Session recovery failed - user needs to re-authenticate");
                setSession(null);
                setProfile(null);
              }
            }
          }
        } catch (err) {
          console.error("Session recovery failed:", err);
          if (mounted.current) {
            // Set error state so user gets feedback
            setError(err as Error);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchProfile, refreshSessionWithRetry]);

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
