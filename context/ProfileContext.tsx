
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

  // Handle Tab Visibility Changes (Fix for Background Throttling)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isRefreshing = false;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      // Prevent concurrent refreshes
      if (isRefreshing) {
        console.log("Session refresh already in progress, skipping...");
        return;
      }

      // Debounce rapid tab switches
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        if (!mounted.current) return;

        isRefreshing = true;

        try {
          // Set a timeout to prevent hanging
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Session refresh timeout")), 5000);
          });

          const sessionPromise = supabase.auth.getSession();

          const { data: { session: currentSession }, error } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as Awaited<typeof sessionPromise>;

          if (!mounted.current) return;

          if (error) {
            console.warn("Session check error:", error.message);
            return;
          }

          // If session is stale or missing, try to refresh
          if (!currentSession) {
            const refreshPromise = supabase.auth.refreshSession();
            const { data, error: refreshError } = await Promise.race([
              refreshPromise,
              timeoutPromise
            ]) as Awaited<typeof refreshPromise>;

            if (refreshError) {
              console.warn("Session refresh failed:", refreshError.message);
            } else if (data.session && mounted.current) {
              setSession(data.session);
            }
          }
        } catch (err: any) {
          // Timeout or other error - don't freeze, just log
          if (err.message !== "Session refresh timeout") {
            console.error("Session recovery error:", err);
          } else {
            console.warn("Session refresh timed out - continuing without refresh");
          }
        } finally {
          isRefreshing = false;
        }
      }, 300); // 300ms debounce
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
