
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, onSupabaseRecreated } from '../lib/supabase';
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
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Fetch profile helper - always uses current Supabase client
  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user?.id) {
      if (mounted.current) setProfile(null);
      return;
    }

    if (mounted.current) setError(null);

    try {
      // Always get the current active Supabase client
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

  // Subscribe to auth state changes on a given client
  const subscribeToAuthChanges = useCallback((client: SupabaseClient) => {
    // Unsubscribe from any existing subscription
    if (authSubscriptionRef.current) {
      authSubscriptionRef.current.unsubscribe();
      authSubscriptionRef.current = null;
    }

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, newSession) => {
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

    authSubscriptionRef.current = subscription;
    return subscription;
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

        // 1. Get initial session
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

    // 2. Subscribe to auth changes on current client
    const client = getSupabase();
    subscribeToAuthChanges(client);

    // 3. Register for client recreation events (global handler)
    const unsubscribeRecreation = onSupabaseRecreated((newClient) => {
      if (!mounted.current) return;
      console.log('[ProfileContext] Supabase client recreated, re-subscribing to auth changes...');
      subscribeToAuthChanges(newClient);
    });

    return () => {
      mounted.current = false;
      clearTimeout(safetyTimeout);
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
      }
      unsubscribeRecreation();
    };
  }, [fetchProfile, subscribeToAuthChanges]);

  // Handle Tab Visibility Changes with full client recreation
  useSupabaseLifecycle({
    onClientRecreated: async (newClient, recoveredSession) => {
      if (!mounted.current) return;

      console.log('[ProfileContext] Client recreated with valid session, refreshing profile...');
      setIsReconnecting(false);
      setSession(recoveredSession);

      // Re-fetch profile with fresh client to ensure we have latest data
      if (recoveredSession?.user?.id) {
        await fetchProfile(recoveredSession);
      }
    },
    onSessionLost: () => {
      if (!mounted.current) return;

      console.log('[ProfileContext] No session after client recreation');
      setIsReconnecting(false);
      // Don't clear session here - let auth state change handler deal with it
    },
    onVisibilityChange: (isVisible) => {
      if (isVisible && session) {
        // Tab became visible after suspension - mark as reconnecting
        setIsReconnecting(true);
      }
    },
    debounceMs: 300,
    timeoutMs: 5000
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
