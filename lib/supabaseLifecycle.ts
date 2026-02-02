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
 * Global state to track visibility and enforce single recreation per resume.
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
 * 4. Recreation is blocked during visible state to protect in-flight requests
 */
export function useSupabaseLifecycle(options: SupabaseLifecycleOptions = {}): SupabaseLifecycleReturn {
    const {
        onClientRecreated,
        onSessionLost,
        onVisibilityChange
    } = options;

    const isRecoveringRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        // Block recreation while THIS component is mounted and visible
        // This protects in-flight requests from being aborted
        const updateRecreationBlock = () => {
            const isVisible = document.visibilityState === 'visible';
            setRecreationBlocked(isVisible);
        };

        // Initial state
        updateRecreationBlock();

        const handleVisibilityChange = async () => {
            const isVisible = document.visibilityState === 'visible';

            // Update recreation block state
            setRecreationBlocked(isVisible);

            // Notify about visibility changes (for pending saves etc)
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
                console.log('[SupabaseLifecycle] Tab visible (no recreation needed)');
                return;
            }

            // CRITICAL: Single-flight guard
            if (isRecreating) {
                console.log('[SupabaseLifecycle] Recreation already in progress, skipping...');
                return;
            }

            console.log('[SupabaseLifecycle] Tab returned from hidden state - initiating recreation');

            // Mark that we're handling this resume event
            isRecreating = true;
            isRecoveringRef.current = true;
            hasRecreatedThisResume = true;
            wasHidden = false;

            // IMPORTANT: Unblock recreation temporarily for this operation
            setRecreationBlocked(false);

            try {
                const newClient = await recreateSupabase();

                if (!mountedRef.current) return;

                // Get session from fresh client
                const { data: { session }, error } = await newClient.auth.getSession();

                if (!mountedRef.current) return;

                if (error) {
                    console.warn('[SupabaseLifecycle] Session check error:', error.message);
                    onSessionLost?.();
                } else if (session) {
                    console.log('[SupabaseLifecycle] Client recreated with valid session');
                    await onClientRecreated?.(newClient, session);
                } else {
                    console.log('[SupabaseLifecycle] Client recreated but no session');
                    onSessionLost?.();
                }
            } catch (err) {
                console.error('[SupabaseLifecycle] Client recreation error:', err);
            } finally {
                isRecreating = false;
                isRecoveringRef.current = false;
                // Re-block recreation now that we're done
                setRecreationBlocked(true);
            }
        };

        // Handle online event - treat as potential need for recovery
        const handleOnline = async () => {
            if (document.visibilityState !== 'visible') return;
            if (isRecreating || hasRecreatedThisResume) return;

            console.log('[SupabaseLifecycle] Network restored - initiating recovery');

            isRecreating = true;
            isRecoveringRef.current = true;
            hasRecreatedThisResume = true;

            setRecreationBlocked(false);

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
    }, [onClientRecreated, onSessionLost, onVisibilityChange]);

    return {
        isRecovering: isRecoveringRef.current
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
