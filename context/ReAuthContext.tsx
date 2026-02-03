import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ============================================================================
// MODULE-LEVEL VISIBILITY TRACKING
// These variables persist INDEPENDENTLY of React lifecycle and Supabase recreation
// They are initialized once when the module loads and never reset
// ============================================================================

// Timestamp when tab was hidden (persists across context reinitializations)
let moduleTabHiddenAt: number | null = null;

// Whether tab has ever been hidden (persists across context reinitializations)
let moduleHasEverBeenHidden = false;

// Whether initial app load has completed (persists across context reinitializations)
let moduleIsInitialAppLoad = true;

// Last calculated hidden duration (persists across context reinitializations)
let moduleLastHiddenDuration: number | null = null;

// Register visibility listener at module level (runs once when module loads)
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            moduleTabHiddenAt = Date.now();
            moduleHasEverBeenHidden = true;
            console.log('[ReAuth:Module] Tab hidden at:', new Date(moduleTabHiddenAt).toISOString());
        } else if (document.visibilityState === 'visible' && moduleTabHiddenAt !== null) {
            const duration = Date.now() - moduleTabHiddenAt;
            moduleLastHiddenDuration = duration;
            console.log(`[ReAuth:Module] Tab visible after ${Math.round(duration / 1000)}s hidden`);

            // Mark as no longer initial load after first visibility cycle
            if (moduleIsInitialAppLoad) {
                console.log('[ReAuth:Module] Marking as no longer initial app load');
                moduleIsInitialAppLoad = false;
            }
        }
    });
}

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface ReAuthContextType {
    isReconnecting: boolean;
    needsLogin: boolean;
    preservedRoute: string | null;
    getHiddenDuration: () => number | null;
    isWithinGraceWindow: () => boolean;
    isResumeFromHidden: () => boolean;
    requestReauth: (reason: 'session_lost' | 'auth_failed') => void;
    triggerBackgroundReAuth: () => void;
    markBackgroundReAuthFailed: () => void;
    dismissReAuth: () => void;
    markReAuthSuccess: () => void;
}

const ReAuthContext = createContext<ReAuthContextType | undefined>(undefined);

// Grace window: 5 minutes (300000ms)
const AUTH_GRACE_WINDOW_MS = 5 * 60 * 1000;

export const ReAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [preservedRoute, setPreservedRoute] = useState<string | null>(null);
    const attemptedThisSession = useRef(false);
    const backgroundReAuthTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const location = useLocation();

    // Reset attempt flag when user navigates
    useEffect(() => {
        if (!isReconnecting && !needsLogin) {
            attemptedThisSession.current = false;
        }
    }, [location.pathname, isReconnecting, needsLogin]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (backgroundReAuthTimeoutRef.current) {
                clearTimeout(backgroundReAuthTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Get the hidden duration from module-level storage.
     * Returns null only if tab has never been hidden.
     */
    const getHiddenDuration = useCallback((): number | null => {
        return moduleLastHiddenDuration;
    }, []);

    /**
     * Check if we're within the authentication grace window.
     * CRITICAL: If hiddenDuration is null, we CANNOT determine - treat as safe.
     */
    const isWithinGraceWindow = useCallback(() => {
        const duration = moduleLastHiddenDuration;

        if (duration === null) {
            // No duration data - treat as SAFE (never trigger re-auth)
            console.log('[ReAuth] Grace window check: no duration data, treating as SAFE');
            return true;
        }

        const withinWindow = duration < AUTH_GRACE_WINDOW_MS;
        console.log(`[ReAuth] Grace window check: ${Math.round(duration / 1000)}s < ${AUTH_GRACE_WINDOW_MS / 1000}s = ${withinWindow}`);
        return withinWindow;
    }, []);

    /**
     * Check if this is a resume from hidden tab.
     * Uses module-level tracking that persists across context reinitializations.
     */
    const isResumeFromHidden = useCallback(() => {
        const isResume = moduleHasEverBeenHidden;
        console.log(`[ReAuth] isResumeFromHidden: hasEverBeenHidden=${moduleHasEverBeenHidden}, result=${isResume}`);
        return isResume;
    }, []);

    /**
     * CENTRALIZED RE-AUTH GATEKEEPER (ONLY ENTRY POINT)
     * 
     * CRITICAL RULES:
     * 1. hiddenDuration === null NEVER triggers re-auth UI (treated as safe)
     * 2. Resume from hidden ALWAYS checks grace window first
     * 3. Session loss during recreation is suppressed within grace window
     * 4. Module-level tracking survives context reinitializations
     */
    const requestReauth = useCallback((reason: 'session_lost' | 'auth_failed') => {
        console.log(`[ReAuth] requestReauth called, reason: ${reason}`);
        console.log(`[ReAuth] Module state: isInitialAppLoad=${moduleIsInitialAppLoad}, hasEverBeenHidden=${moduleHasEverBeenHidden}, lastHiddenDuration=${moduleLastHiddenDuration}`);

        // Prevent multiple attempts
        if (attemptedThisSession.current) {
            console.log('[ReAuth] Already attempted re-auth this session, skipping...');
            return;
        }

        // Preserve current route
        const currentPath = location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
            setPreservedRoute(currentPath);
        }

        // **PRIORITY 1: Check if this is a resume from hidden**
        const resumeFromHidden = isResumeFromHidden();

        if (resumeFromHidden) {
            // This is a visibility-based resume
            const withinGrace = isWithinGraceWindow();

            console.log(`[ReAuth] Resume from hidden: withinGrace=${withinGrace}`);

            if (withinGrace) {
                // WITHIN GRACE WINDOW: Suppress re-auth UI completely
                console.log(`[ReAuth] Within grace window - suppressing re-auth for: ${reason}`);

                if (reason === 'session_lost') {
                    // Session lost during client recreation - completely silent
                    console.log('[ReAuth] Session unverified after recreation, treating as temporary');
                    return;
                } else if (reason === 'auth_failed') {
                    // Actual auth failure - brief overlay only
                    console.log('[ReAuth] Auth action failed, but within grace - brief overlay only');
                    setIsReconnecting(true);
                    setTimeout(() => setIsReconnecting(false), 500);
                    return;
                }
            }

            // OUTSIDE GRACE WINDOW: Proceed with re-auth
            console.log('[ReAuth] Outside grace window on resume, proceeding with re-auth');
        } else if (moduleIsInitialAppLoad) {
            // Initial page load - allow normal re-auth flow
            console.log('[ReAuth] Initial app load detected, proceeding with re-auth');
            moduleIsInitialAppLoad = false;
        }

        // Proceed with full re-auth flow
        attemptedThisSession.current = true;
        setIsReconnecting(true);

        backgroundReAuthTimeoutRef.current = setTimeout(() => {
            console.log('[ReAuth] Showing login modal');
            setIsReconnecting(false);
            setNeedsLogin(true);
        }, 2000);
    }, [location.pathname, isWithinGraceWindow, isResumeFromHidden]);

    /**
     * Background re-auth trigger (non-blocking)
     */
    const triggerBackgroundReAuth = useCallback(() => {
        console.log('[ReAuth] Starting background re-auth (non-blocking)...');
    }, []);

    /**
     * Called when background re-auth fails
     */
    const markBackgroundReAuthFailed = useCallback(() => {
        const resumeFromHidden = isResumeFromHidden();
        const withinGrace = isWithinGraceWindow();

        if (resumeFromHidden && withinGrace) {
            console.log('[ReAuth] Background re-auth failed, but within grace window - no modal');
        } else {
            console.log('[ReAuth] Background re-auth failed - modal may appear on next auth action');
        }

        if (backgroundReAuthTimeoutRef.current) {
            clearTimeout(backgroundReAuthTimeoutRef.current);
            backgroundReAuthTimeoutRef.current = null;
        }
        setIsReconnecting(false);
    }, [isWithinGraceWindow, isResumeFromHidden]);

    /**
     * Called when re-auth succeeds
     */
    const markReAuthSuccess = useCallback(() => {
        console.log('[ReAuth] Re-auth successful');
        if (backgroundReAuthTimeoutRef.current) {
            clearTimeout(backgroundReAuthTimeoutRef.current);
            backgroundReAuthTimeoutRef.current = null;
        }
        setIsReconnecting(false);
        setNeedsLogin(false);
    }, []);

    /**
     * User dismisses login modal
     */
    const dismissReAuth = useCallback(() => {
        console.log('[ReAuth] Re-auth dismissed by user');
        if (backgroundReAuthTimeoutRef.current) {
            clearTimeout(backgroundReAuthTimeoutRef.current);
            backgroundReAuthTimeoutRef.current = null;
        }
        setIsReconnecting(false);
        setNeedsLogin(false);
        setPreservedRoute(null);
        attemptedThisSession.current = false;
    }, []);

    return (
        <ReAuthContext.Provider
            value={{
                isReconnecting,
                needsLogin,
                preservedRoute,
                getHiddenDuration,
                isWithinGraceWindow,
                isResumeFromHidden,
                requestReauth,
                triggerBackgroundReAuth,
                markBackgroundReAuthFailed,
                dismissReAuth,
                markReAuthSuccess,
            }}
        >
            {children}
        </ReAuthContext.Provider>
    );
};

export const useReAuth = () => {
    const context = useContext(ReAuthContext);
    if (!context) {
        throw new Error('useReAuth must be used within a ReAuthProvider');
    }
    return context;
};
