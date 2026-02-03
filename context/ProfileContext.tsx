import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSupabase, onSupabaseRecreated, registerAuthListener } from '../lib/supabase';
import { useSupabaseLifecycle } from '../lib/supabaseLifecycle';
import { Profile } from '../types';
import { useReAuth } from './ReAuthContext';

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
  const reAuthContext = useReAuth();

  // Track unsubscribe function for auth listener
  const authUnsubscribeRef = useRef<(() => void) | null>(null);

  // Single-flight guard for profile fetching using fetch ID
  const fetchIdRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Fetch profile helper - with single-flight guard
  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user?.id) {
      if (mounted.current) setProfile(null);
      return;
    }

    // **SINGLE-FLIGHT GUARD: Increment fetch ID**
    const currentFetchId = ++fetchIdRef.current;

    // Log if we're cancelling a previous fetch
    if (isFetchingRef.current) {
      console.log('[ProfileContext] New profile fetch started (previous fetch will be ignored)');
    }

    isFetchingRef.current = true;

    if (mounted.current) setError(null);

    try {
      const client = getSupabase();
      const { data, error: apiError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      // **STALE CHECK: Ignore results if this is no longer the latest fetch**
      if (currentFetchId !== fetchIdRef.current) {
        console.log('[ProfileContext] Profile fetch result ignored (stale - newer fetch in progress)');
        return; // Silently return, not an error
      }

      if (apiError) {
        throw apiError;
      }

      if (mounted.current) {
        setProfile(data as Profile | null);
      }
    } catch (err: any) {
      // **STALE CHECK: Ignore errors if this is no longer the latest fetch**
      if (currentFetchId !== fetchIdRef.current) {
        console.log('[ProfileContext] Profile fetch error ignored (stale)');
        return; // Silently return
      }

      // **IGNORE AbortError - this is expected behavior**
      if (err.name === 'AbortError') {
        console.log('[ProfileContext] Profile fetch aborted (expected - single-flight)');
        return; // Silently return
      }

      console.error('[ProfileContext] Error fetching profile:', err);
      if (mounted.current) setError(err);
    } finally {
      // Clear fetching flag only if this was the latest fetch
      if (currentFetchId === fetchIdRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, []);

  // Subscribe to auth state changes using the tracked registerAuthListener
  const subscribeToAuthChanges = useCallback(() => {
    // Unsubscribe from any existing subscription
    if (authUnsubscribeRef.current) {
      authUnsubscribeRef.current();
      authUnsubscribeRef.current = null;
    }

    // Use registerAuthListener which tracks subscriptions for proper cleanup
    const unsubscribe = registerAuthListener(async (event, newSession) => {
      if (!mounted.current) return;

      console.log(`[ProfileContext] Auth event: ${event}`);

      // Update session state
      setSession(newSession);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (newSession?.user?.id) {
          await fetchProfile(newSession);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    authUnsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [fetchProfile]);

  // Initial setup
  useEffect(() => {
    mounted.current = true;

    // Fallback safety timeout
    const safetyTimeout = setTimeout(() => {
      if (mounted.current && loading) {
        console.warn("[ProfileContext] Auth initialization fallback triggered");
        setLoading(false);
      }
    }, 8000);

    const initAuth = async () => {
      try {
        const client = getSupabase();
        const { data: { session: initialSession }, error: sessionError } = await client.auth.getSession();

        if (sessionError) throw sessionError;

        if (mounted.current) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            await fetchProfile(initialSession);
          }
        }
      } catch (err: any) {
        console.error("[ProfileContext] Auth initialization error:", err);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth changes (this is tracked for cleanup)
    subscribeToAuthChanges();

    // Register for client recreation events
    // When client is recreated, we need to re-subscribe to auth changes
    const unsubscribeRecreation = onSupabaseRecreated(() => {
      if (!mounted.current) return;
      console.log('[ProfileContext] Supabase client recreated, re-subscribing to auth changes...');
      subscribeToAuthChanges();
    });

    return () => {
      mounted.current = false;
      clearTimeout(safetyTimeout);
      // Clean up auth subscription
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
      }
      unsubscribeRecreation();
    };
  }, [fetchProfile, subscribeToAuthChanges]);

  // Handle Tab Visibility Changes - PASSIVE APPROACH (no client recreation)
  useSupabaseLifecycle({
    // Called when session is verified after tab return (no recreation happened)
    onSessionValidated: async (client, validatedSession) => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Session validated on tab return (no recreation)');
      setIsReconnecting(false);

      // Only update if session is different
      if (validatedSession?.user?.id !== session?.user?.id) {
        setSession(validatedSession);
        if (validatedSession?.user?.id) {
          await fetchProfile(validatedSession);
        }
      }
    },

    // Called only on actual auth failure (network restore failed, 401/403)
    onSessionLost: async () => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Session lost (actual auth failure, not visibility)');
      setIsReconnecting(false);

      // Request re-auth through centralized gatekeeper
      reAuthContext.requestReauth('auth_failed');
    },

    onVisibilityChange: (isVisible) => {
      // Brief reconnecting indicator on tab return
      if (isVisible && session) {
        setIsReconnecting(true);
        // Auto-dismiss after brief moment
        setTimeout(() => {
          if (mounted.current) setIsReconnecting(false);
        }, 500);
      }
    }
  });

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
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
      const client = getSupabase();
      await client.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
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
