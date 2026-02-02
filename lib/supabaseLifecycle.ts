import { useEffect, useRef, useCallback } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, recreateSupabase, onSupabaseRecreated } from './supabase';

interface SupabaseLifecycleOptions {
    /** Called when client is recreated with valid session after returning from background */
    onClientRecreated?: (client: SupabaseClient, session: Session) => void | Promise<void>;
    /** Called when session is not available after recreation (user logged out) */
    onSessionLost?: () => void;
    /** Called on any visibility change - useful for triggering saves */
    onVisibilityChange?: (isVisible: boolean) => void | Promise<void>;
}

interface SupabaseLifecycleReturn {
    /** Whether a recovery is currently in progress */
    isRecovering: boolean;
}

/**
 * Global state to track visibility and prevent recreation while visible.
 * This ensures NO component can trigger recreation while the tab is active.
 */
let wasHidden = false;
let isRecreating = false;
let hasRecreatedThisResume = false;

/**
 * Hook to manage Supabase client recovery ONLY on actual browser lifecycle events.
 * 
 * CRITICAL RULES:
 * 1. Client is NEVER recreated while document.visibilityState === "visible"
 * 2. Client is ONLY recreated on transition from hidden → visible
 * 3. Single-flight guard ensures only one recreation per resume event
 * 4. No time-based or inactivity heuristics
 */
export function useSupabaseLifecycle(options: SupabaseLifecycleOptions = {}): SupabaseLifecycleReturn {
    const {
        onClientRecreated,
        onSessionLost,
        onVisibilityChange
    } = options;

    const isRecoveringRef = useRef(false);
    const mountedRef = useRef(true);

    // Handle visibility change - ONLY recreate on hidden → visible transition
    useEffect(() => {
        mountedRef.current = true;

        const handleVisibilityChange = async () => {
            const isVisible = document.visibilityState === 'visible';

            // Always notify about visibility changes (for pending saves etc)
            onVisibilityChange?.(isVisible);

            if (!isVisible) {
                // Tab going hidden - mark for potential recreation on return
                wasHidden = true;
                hasRecreatedThisResume = false;
                console.log('[SupabaseLifecycle] Tab hidden - marking for recreation on return');
                return;
            }

            // Tab becoming visible
            // CRITICAL: Only recreate if we were actually hidden AND haven't already recreated
            if (!wasHidden || hasRecreatedThisResume) {
                console.log('[SupabaseLifecycle] Tab visible (no recreation needed - was not hidden or already recreated)');
                return;
            }

            // CRITICAL: Single-flight guard - prevent concurrent recreation
            if (isRecreating) {
                console.log('[SupabaseLifecycle] Recreation already in progress, skipping...');
                return;
            }

            console.log('[SupabaseLifecycle] Tab returned from hidden state - recreating client');

            // Mark that we're handling this resume event
            isRecreating = true;
            isRecoveringRef.current = true;
            hasRecreatedThisResume = true;
            wasHidden = false;

            try {
                const newClient = await recreateSupabase();

                if (!mountedRef.current) return;

                // Get session from fresh client
                const { data: { session }, error } = await newClient.auth.getSession();

                if (!mountedRef.current) return;

                if (error) {
                    console.warn('[SupabaseLifecycle] Session check error after recreation:', error.message);
                    onSessionLost?.();
                } else if (session) {
                    console.log('[SupabaseLifecycle] Client recreated with valid session');
                    await onClientRecreated?.(newClient, session);
                } else {
                    console.log('[SupabaseLifecycle] Client recreated but no session (user logged out)');
                    onSessionLost?.();
                }
            } catch (err) {
                console.error('[SupabaseLifecycle] Client recreation error:', err);
            } finally {
                isRecreating = false;
                isRecoveringRef.current = false;
            }
        };

        // Handle online event - treat as return from suspension
        const handleOnline = async () => {
            if (document.visibilityState !== 'visible') return;

            // Only recreate if we haven't already for this session
            if (isRecreating || hasRecreatedThisResume) return;

            console.log('[SupabaseLifecycle] Network restored - recreating client');

            isRecreating = true;
            isRecoveringRef.current = true;
            hasRecreatedThisResume = true;

            try {
                const newClient = await recreateSupabase();
                if (!mountedRef.current) return;

                const { data: { session }, error } = await newClient.auth.getSession();
                if (!mountedRef.current) return;

                if (error) {
                    onSessionLost?.();
                } else if (session) {
                    await onClientRecreated?.(newClient, session);
                } else {
                    onSessionLost?.();
                }
            } catch (err) {
                console.error('[SupabaseLifecycle] Online recovery error:', err);
            } finally {
                isRecreating = false;
                isRecoveringRef.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [onClientRecreated, onSessionLost, onVisibilityChange]);

    return {
        isRecovering: isRecoveringRef.current
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
