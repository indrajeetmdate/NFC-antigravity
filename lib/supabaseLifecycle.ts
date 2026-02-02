import { useEffect, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface SupabaseLifecycleOptions {
    /** Called when session is successfully recovered after tab becomes visible */
    onSessionRecovered?: (session: Session) => void | Promise<void>;
    /** Called when session recovery fails or session is lost */
    onSessionLost?: () => void;
    /** Called on any visibility change - useful for triggering saves */
    onVisibilityChange?: (isVisible: boolean) => void | Promise<void>;
    /** Debounce delay in ms (default: 300) */
    debounceMs?: number;
    /** Session refresh timeout in ms (default: 5000) */
    timeoutMs?: number;
}

interface SupabaseLifecycleReturn {
    /** Whether a session recovery is currently in progress */
    isRecovering: boolean;
    /** Force a session refresh (useful for manual recovery) */
    forceSessionRefresh: () => Promise<Session | null>;
}

/**
 * Hook to manage Supabase session lifecycle across browser tab switches.
 * 
 * Browsers throttle or suspend JavaScript and WebSocket connections when
 * a tab becomes inactive. This hook ensures the Supabase client reconnects
 * and re-validates the session when the tab becomes active again.
 */
export function useSupabaseLifecycle(options: SupabaseLifecycleOptions = {}): SupabaseLifecycleReturn {
    const {
        onSessionRecovered,
        onSessionLost,
        onVisibilityChange,
        debounceMs = 300,
        timeoutMs = 5000
    } = options;

    const isRecoveringRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    // Force session refresh - can be called manually
    const forceSessionRefresh = useCallback(async (): Promise<Session | null> => {
        if (isRecoveringRef.current) {
            console.log('[SupabaseLifecycle] Session refresh already in progress, skipping...');
            return null;
        }

        isRecoveringRef.current = true;

        try {
            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Session refresh timeout')), timeoutMs);
            });

            // Try to get the current session first
            const sessionPromise = supabase.auth.getSession();
            const { data: { session: currentSession }, error: sessionError } = await Promise.race([
                sessionPromise,
                timeoutPromise
            ]) as Awaited<typeof sessionPromise>;

            if (!mountedRef.current) return null;

            if (sessionError) {
                console.warn('[SupabaseLifecycle] Session check error:', sessionError.message);
                onSessionLost?.();
                return null;
            }

            // If we have a valid session, return it
            if (currentSession) {
                console.log('[SupabaseLifecycle] Session valid, triggering recovery callback');
                await onSessionRecovered?.(currentSession);
                return currentSession;
            }

            // Session is missing, try to refresh
            console.log('[SupabaseLifecycle] Session missing, attempting refresh...');
            const refreshPromise = supabase.auth.refreshSession();
            const { data, error: refreshError } = await Promise.race([
                refreshPromise,
                timeoutPromise
            ]) as Awaited<typeof refreshPromise>;

            if (!mountedRef.current) return null;

            if (refreshError) {
                console.warn('[SupabaseLifecycle] Session refresh failed:', refreshError.message);
                onSessionLost?.();
                return null;
            }

            if (data.session) {
                console.log('[SupabaseLifecycle] Session refreshed successfully');
                await onSessionRecovered?.(data.session);
                return data.session;
            }

            // No session could be recovered
            console.log('[SupabaseLifecycle] No session available');
            onSessionLost?.();
            return null;

        } catch (err: any) {
            if (err.message === 'Session refresh timeout') {
                console.warn('[SupabaseLifecycle] Session refresh timed out - continuing without refresh');
            } else {
                console.error('[SupabaseLifecycle] Session recovery error:', err);
            }
            return null;
        } finally {
            isRecoveringRef.current = false;
        }
    }, [onSessionRecovered, onSessionLost, timeoutMs]);

    // Handle visibility change
    useEffect(() => {
        mountedRef.current = true;

        const handleVisibilityChange = async () => {
            const isVisible = document.visibilityState === 'visible';

            // Always notify about visibility changes
            onVisibilityChange?.(isVisible);

            if (!isVisible) {
                // Tab going inactive - clear any pending debounce
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
                return;
            }

            // Tab becoming visible - debounce the session check
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(async () => {
                if (!mountedRef.current) return;
                await forceSessionRefresh();
            }, debounceMs);
        };

        // Also handle focus events (covers some edge cases the visibility API misses)
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
    }, [forceSessionRefresh, onVisibilityChange, debounceMs]);

    return {
        isRecovering: isRecoveringRef.current,
        forceSessionRefresh
    };
}

/**
 * Utility function to check if Supabase session is healthy.
 * Can be used before critical operations to ensure auth is valid.
 */
export async function validateSupabaseSession(): Promise<Session | null> {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            // Try refresh
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !data.session) {
                return null;
            }
            return data.session;
        }
        return session;
    } catch {
        return null;
    }
}
