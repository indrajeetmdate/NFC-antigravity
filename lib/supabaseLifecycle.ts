import { useEffect, useRef } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import {
    getSupabase,
    recreateSupabase,
    onSupabaseRecreated,
    setRecreationBlocked,
    isRecreationBlocked
} from './supabase';

interface SupabaseLifecycleOptions {
    /** Called when session is validated after returning from background */
    onSessionValidated?: (client: SupabaseClient, session: Session) => void | Promise<void>;
    /** Called when session is lost (actual auth failure, not just visibility change) */
    onSessionLost?: () => void;
    /** Called on any visibility change - useful for triggering saves */
    onVisibilityChange?: (isVisible: boolean) => void | Promise<void>;
}

interface SupabaseLifecycleReturn {
    /** Whether a recovery is currently in progress */
    isRecovering: boolean;
    /** Manually trigger client recreation (for 401/403 errors) */
    triggerRecreation: () => Promise<void>;
}

/**
 * Global state for lifecycle management.
 */
let wasHidden = false;
let isRecreating = false;

/**
 * Hook to manage Supabase client lifecycle.
 * 
 * NEW APPROACH (Failure-Driven Recovery):
 * 1. Visibility change NEVER recreates the client
 * 2. On tab return, only perform passive getSession() check
 * 3. Client recreation ONLY triggered by:
 *    - Network offline → online transition
 *    - Explicit 401/403 auth errors (via triggerRecreation)
 *    - Manual recreation request
 * 4. Session remains valid unless proven otherwise
 */
export function useSupabaseLifecycle(options: SupabaseLifecycleOptions = {}): SupabaseLifecycleReturn {
    const {
        onSessionValidated,
        onSessionLost,
        onVisibilityChange
    } = options;

    const isRecoveringRef = useRef(false);
    const mountedRef = useRef(true);

    /**
     * Manual recreation trigger - call this on 401/403 errors.
     */
    const triggerRecreation = async () => {
        if (isRecreating) {
            console.log('[SupabaseLifecycle] Recreation already in progress, skipping...');
            return;
        }

        console.log('[SupabaseLifecycle] Manual recreation triggered (auth failure recovery)');

        isRecreating = true;
        isRecoveringRef.current = true;
        setRecreationBlocked(false);

        try {
            const newClient = await recreateSupabase();
            if (!mountedRef.current) return;

            const { data: { session }, error } = await newClient.auth.getSession();
            if (!mountedRef.current) return;

            if (error || !session) {
                console.log('[SupabaseLifecycle] Recreation complete but no valid session');
                onSessionLost?.();
            } else {
                console.log('[SupabaseLifecycle] Recreation complete with valid session');
                await onSessionValidated?.(newClient, session);
            }
        } catch (err) {
            console.error('[SupabaseLifecycle] Recreation error:', err);
            onSessionLost?.();
        } finally {
            isRecreating = false;
            isRecoveringRef.current = false;
            setRecreationBlocked(true);
        }
    };

    useEffect(() => {
        mountedRef.current = true;

        /**
         * Handle visibility change - PASSIVE check only, NO recreation.
         */
        const handleVisibilityChange = async () => {
            const isVisible = document.visibilityState === 'visible';

            // Notify about visibility changes (for pending saves etc)
            onVisibilityChange?.(isVisible);

            if (!isVisible) {
                // Tab going hidden - just mark it
                wasHidden = true;
                console.log('[SupabaseLifecycle] Tab hidden - session preserved (no recreation)');
                return;
            }

            // Tab becoming visible - passive session check only
            if (!wasHidden) {
                console.log('[SupabaseLifecycle] Tab visible (was not hidden, skipping check)');
                return;
            }

            wasHidden = false;
            console.log('[SupabaseLifecycle] Tab returned - performing PASSIVE session check (no recreation)');

            try {
                // PASSIVE CHECK: Just verify session exists, don't recreate client
                const client = getSupabase();
                const { data: { session }, error } = await client.auth.getSession();

                if (!mountedRef.current) return;

                if (error) {
                    console.warn('[SupabaseLifecycle] Session check error:', error.message);
                    // Don't trigger re-auth here - let the app handle on next protected action
                } else if (session) {
                    console.log('[SupabaseLifecycle] Session verified (user:', session.user?.email, ')');
                    await onSessionValidated?.(client, session);
                } else {
                    console.log('[SupabaseLifecycle] No session found - user may be logged out');
                    // Don't trigger re-auth here - user might be on public page
                    // Let protected actions trigger re-auth if needed
                }
            } catch (err) {
                console.error('[SupabaseLifecycle] Passive check error:', err);
            }
        };

        /**
         * Handle network online event - this IS a valid reason to recreate.
         * Network loss can invalidate WebSocket connections.
         */
        const handleOnline = async () => {
            if (document.visibilityState !== 'visible') return;
            if (isRecreating) return;

            console.log('[SupabaseLifecycle] Network restored - initiating client recreation');

            isRecreating = true;
            isRecoveringRef.current = true;
            setRecreationBlocked(false);

            try {
                const newClient = await recreateSupabase();
                if (!mountedRef.current) return;

                const { data: { session }, error } = await newClient.auth.getSession();
                if (!mountedRef.current) return;

                if (error || !session) {
                    console.log('[SupabaseLifecycle] Network recovery complete but no valid session');
                    onSessionLost?.();
                } else {
                    console.log('[SupabaseLifecycle] Network recovery complete with valid session');
                    await onSessionValidated?.(newClient, session);
                }
            } catch (err) {
                console.error('[SupabaseLifecycle] Network recovery error:', err);
            } finally {
                isRecreating = false;
                isRecoveringRef.current = false;
                setRecreationBlocked(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [onSessionValidated, onSessionLost, onVisibilityChange]);

    return {
        isRecovering: isRecoveringRef.current,
        triggerRecreation
    };
}

/**
 * Utility function to get session from current Supabase client.
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
