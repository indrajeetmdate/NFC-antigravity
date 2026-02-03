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

  // Fetch profile helper - always uses current Supabase client
  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user?.id) {
      if (mounted.current) setProfile(null);
      return;
    }

    if (mounted.current) setError(null);

    try {
      const client = getSupabase();
      const { data, error: apiError } = await client
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

  // Handle Tab Visibility Changes
  useSupabaseLifecycle({
    onClientRecreated: async (newClient, recoveredSession) => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Client recreated with valid session, refreshing profile...');
      setIsReconnecting(false);
      setSession(recoveredSession);

      if (recoveredSession?.user?.id) {
        await fetchProfile(recoveredSession);
      }
    },
    onSessionLost: async () => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Session check failed after client recreation');
      setIsReconnecting(false);

      // **OPTIMIZED: First try local getSession() for instant restoration**
      const client = getSupabase();
      const { data: { session: localSession }, error: localError } = await client.auth.getSession();

      if (localSession) {
        // SUCCESS: Session exists in local storage - restore immediately (no network call)
        console.log('[ProfileContext] Restored session from local storage (instant)');
        setSession(localSession);
        if (localSession.user?.id) {
          await fetchProfile(localSession);
        }

        // **Background re-auth: Refresh token in background to ensure validity**
        // This is non-blocking - UI is already restored
        console.log('[ProfileContext] Starting background token refresh...');
        reAuthContext.triggerBackgroundReAuth();

        // Execute refresh in background (don't await - let it run async)
        client.auth.refreshSession().then(({ data, error }) => {
          if (!mounted.current) return;

          if (data.session) {
            console.log('[ProfileContext] Background token refresh succeeded');
            setSession(data.session);
            reAuthContext.markReAuthSuccess();
          } else {
            console.warn('[ProfileContext] Background token refresh failed:', error);
            reAuthContext.markBackgroundReAuthFailed();
            // Don't clear session or show modal - let user continue with stale session
            // Modal will appear on next authenticated request failure
          }
        }).catch((err) => {
          console.error('[ProfileContext] Background refresh error:', err);
          reAuthContext.markBackgroundReAuthFailed();
        });

      } else {
        // FAILURE: No local session - must trigger full re-auth flow
        console.log('[ProfileContext] No local session available, triggering re-auth UI', localError);
        setSession(null);
        setProfile(null);
        reAuthContext.triggerReAuth();

        // Attempt refreshSession() as fallback (this will likely fail but worth trying)
        const { data: { session: refreshedSession } } = await client.auth.refreshSession();

        if (refreshedSession && mounted.current) {
          console.log('[ProfileContext] Fallback refresh succeeded');
          setSession(refreshedSession);
          if (refreshedSession.user?.id) {
            await fetchProfile(refreshedSession);
          }
          reAuthContext.markReAuthSuccess();
        }
      }
    },
    onVisibilityChange: (isVisible) => {
      if (isVisible && session) {
        setIsReconnecting(true);
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
