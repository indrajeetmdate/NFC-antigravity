import { useEffect, useRef, useCallback } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, recreateSupabase, onSupabaseRecreated } from './supabase';

interface SupabaseLifecycleOptions {
    /** Called when client is recreated with valid session after tab becomes visible */
    onClientRecreated?: (client: SupabaseClient, session: Session) => void | Promise<void>;
    /** Called when session is not available after recreation (user logged out) */
    onSessionLost?: () => void;
    /** Called on any visibility change - useful for triggering saves */
    onVisibilityChange?: (isVisible: boolean) => void | Promise<void>;
    /** Debounce delay in ms (default: 300) */
    debounceMs?: number;
    /** Timeout for session check in ms (default: 5000) */
    timeoutMs?: number;
}

interface SupabaseLifecycleReturn {
    /** Whether a recovery is currently in progress */
    isRecovering: boolean;
    /** Force a full client recreation */
    forceRecreate: () => Promise<SupabaseClient>;
}

/**
 * Hook to manage full Supabase client recovery on browser tab switches.
 * 
 * When a tab is backgrounded, browsers suspend WebSocket connections.
 * This hook RECREATES the Supabase client on tab reactivation to ensure
 * all database writes, reads, and realtime subscriptions work immediately.
 * 
 * Key differences from simple session refresh:
 * - Removes all stale realtime channels
 * - Creates a FRESH client instance
 * - Lets client rehydrate from localStorage (no refreshSession call)
 * - Notifies components to re-subscribe to realtime/auth
 */
export function useSupabaseLifecycle(options: SupabaseLifecycleOptions = {}): SupabaseLifecycleReturn {
    const {
        onClientRecreated,
        onSessionLost,
        onVisibilityChange,
        debounceMs = 300,
        timeoutMs = 5000
    } = options;

    const isRecoveringRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const lastVisibilityTimestampRef = useRef<number>(Date.now());

    // Force recreate the Supabase client
    const forceRecreate = useCallback(async (): Promise<SupabaseClient> => {
        if (isRecoveringRef.current) {
            console.log('[SupabaseLifecycle] Recovery already in progress, skipping...');
            return getSupabase();
        }

        isRecoveringRef.current = true;

        try {
            // Create timeout promise for the entire operation
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Client recreation timeout')), timeoutMs);
            });

            // Recreate the client (removes channels, creates fresh instance)
            const recreatePromise = (async () => {
                const newClient = await recreateSupabase();

                // Get session from NEW client (rehydrates from localStorage)
                const { data: { session }, error } = await newClient.auth.getSession();

                if (!mountedRef.current) return newClient;

                if (error) {
                    console.warn('[SupabaseLifecycle] Session check error after recreation:', error.message);
                    onSessionLost?.();
                    return newClient;
                }

                if (session) {
                    console.log('[SupabaseLifecycle] Client recreated with valid session');
                    await onClientRecreated?.(newClient, session);
                } else {
                    console.log('[SupabaseLifecycle] Client recreated but no session (user logged out)');
                    onSessionLost?.();
                }

                return newClient;
            })();

            return await Promise.race([recreatePromise, timeoutPromise]);

        } catch (err: any) {
            if (err.message === 'Client recreation timeout') {
                console.warn('[SupabaseLifecycle] Client recreation timed out');
            } else {
                console.error('[SupabaseLifecycle] Client recreation error:', err);
            }
            return getSupabase();
        } finally {
            isRecoveringRef.current = false;
        }
    }, [onClientRecreated, onSessionLost, timeoutMs]);

    // Handle visibility change
    useEffect(() => {
        mountedRef.current = true;

        const handleVisibilityChange = async () => {
            const isVisible = document.visibilityState === 'visible';
            const now = Date.now();

            // Always notify about visibility changes
            onVisibilityChange?.(isVisible);

            if (!isVisible) {
                // Tab going inactive - record timestamp and clear debounce
                lastVisibilityTimestampRef.current = now;
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
                return;
            }

            // Tab becoming visible - check how long we were away
            const timeSuspended = now - lastVisibilityTimestampRef.current;

            // Only recreate if tab was suspended for more than 5 seconds
            // Short switches don't need full recreation
            if (timeSuspended < 5000) {
                console.log(`[SupabaseLifecycle] Tab visible after ${timeSuspended}ms (quick switch, skipping recreation)`);
                return;
            }

            console.log(`[SupabaseLifecycle] Tab visible after ${timeSuspended}ms suspension, initiating recovery...`);

            // Debounce the recreation
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(async () => {
                if (!mountedRef.current) return;
                await forceRecreate();
            }, debounceMs);
        };

        // Also handle focus events
        const handleFocus = () => {
            if (document.visibilityState === 'visible') {
                handleVisibilityChange();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            mountedRef.current = false;
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [forceRecreate, onVisibilityChange, debounceMs]);

    return {
        isRecovering: isRecoveringRef.current,
        forceRecreate
    };
}

/**
 * Utility function to get session from current Supabase client.
 * Use before critical operations.
 */
export async function getValidSession(): Promise<Session | null> {
    try {
        const client = getSupabase();
        const { data: { session }, error } = await client.auth.getSession();
        if (error || !session) {
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

// Re-export for convenience
export { getSupabase, recreateSupabase, onSupabaseRecreated } from './supabase';
