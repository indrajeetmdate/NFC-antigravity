import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ReAuthContextType {
    isReconnecting: boolean;
    needsLogin: boolean;
    preservedRoute: string | null;
    hiddenDuration: number | null;
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
// If tab was hidden for less than this, suppress login modal
const AUTH_GRACE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const ReAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [preservedRoute, setPreservedRoute] = useState<string | null>(null);
    const [hiddenDuration, setHiddenDuration] = useState<number | null>(null);
    const attemptedThisSession = useRef(false);
    const backgroundReAuthTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tabHiddenAtRef = useRef<number | null>(null);
    const location = useLocation();

    // **CRITICAL: Track initial app load vs resume from hidden**
    // isInitialAppLoad is set to true on mount and permanently set to false after first visibility cycle
    // This MUST NOT be reset during Supabase client recreation
    const isInitialAppLoadRef = useRef(true);
    const hasEverBeenHiddenRef = useRef(false);

    // Track visibility changes for grace window calculation
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Tab going hidden - record timestamp
                tabHiddenAtRef.current = Date.now();
                hasEverBeenHiddenRef.current = true;
                console.log('[ReAuth] Tab hidden at:', new Date(tabHiddenAtRef.current).toISOString());
            } else if (document.visibilityState === 'visible') {
                // Tab becoming visible
                if (tabHiddenAtRef.current) {
                    // Calculate duration since hidden
                    const duration = Date.now() - tabHiddenAtRef.current;
                    setHiddenDuration(duration);
                    console.log(`[ReAuth] Tab visible after ${Math.round(duration / 1000)}s hidden`);

                    // **CRITICAL: Mark as no longer initial load after first visibility cycle**
                    if (isInitialAppLoadRef.current && hasEverBeenHiddenRef.current) {
                        console.log('[ReAuth] Marking as no longer initial app load');
                        isInitialAppLoadRef.current = false;
                    }

                    // Clear timestamp after a delay
                    setTimeout(() => {
                        tabHiddenAtRef.current = null;
                    }, 5000);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Reset attempt flag when user navigates (explicit navigation, not re-auth)
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
     * Check if we're within the authentication grace window.
     * During grace window, suppress login modals even if validation fails.
     */
    const isWithinGraceWindow = useCallback(() => {
        if (hiddenDuration === null) return false;
        const withinWindow = hiddenDuration < AUTH_GRACE_WINDOW_MS;
        console.log(`[ReAuth] Grace window check: ${Math.round(hiddenDuration / 1000)}s < ${AUTH_GRACE_WINDOW_MS / 1000}s = ${withinWindow}`);
        return withinWindow;
    }, [hiddenDuration]);

    /**
     * Check if this is a resume from hidden tab (not initial page load).
     * Returns true if tab has ever been hidden and we have duration tracking.
     */
    const isResumeFromHidden = useCallback(() => {
        const isResume = hasEverBeenHiddenRef.current && hiddenDuration !== null;
        console.log(`[ReAuth] isResumeFromHidden: hasEverBeenHidden=${hasEverBeenHiddenRef.current}, hiddenDuration=${hiddenDuration}, result=${isResume}`);
        return isResume;
    }, [hiddenDuration]);

    /**
     * CENTRALIZED RE-AUTH GATEKEEPER (ONLY ENTRY POINT)
     * All re-auth requests MUST go through this function.
     * Enforces grace window in ALL code paths.
     * 
     * CRITICAL: Properly distinguishes:
     * - isInitialAppLoad: true only on actual page refresh (never during client recreation)
     * - isResumeFromHidden: true after visibility-based return
     */
    const requestReauth = useCallback((reason: 'session_lost' | 'auth_failed') => {
        console.log(`[ReAuth] requestReauth called, reason: ${reason}`);
        console.log(`[ReAuth] isInitialAppLoad: ${isInitialAppLoadRef.current}, hasEverBeenHidden: ${hasEverBeenHiddenRef.current}`);

        // Prevent multiple attempts in the same session
        if (attemptedThisSession.current) {
            console.log('[ReAuth] Already attempted re-auth this session, skipping...');
            return;
        }

        // Preserve current route (exclude login/signup pages)
        const currentPath = location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
            setPreservedRoute(currentPath);
        }

        // **PRIORITY 1: Check if this is a resume from hidden (not initial load)**
        const resumeFromHidden = isResumeFromHidden();

        if (resumeFromHidden) {
            // This is a visibility-based resume, NOT an initial page load
            // Grace window ALWAYS takes priority here
            const withinGrace = isWithinGraceWindow();

            console.log(`[ReAuth] Resume from hidden detected, within grace: ${withinGrace}`);

            if (withinGrace) {
                console.log(`[ReAuth] Within grace window - suppressing re-auth for reason: ${reason}`);

                if (reason === 'session_lost') {
                    // Session lost during client recreation - this is expected, don't escalate
                    console.log('[ReAuth] Session unverified after recreation, treating as temporary');
                    // Don't even show overlay - completely silent
                    return;
                } else if (reason === 'auth_failed') {
                    // Actual auth failure (API 401) - show brief overlay
                    console.log('[ReAuth] Auth action failed, but within grace - brief overlay only');
                    setIsReconnecting(true);
                    setTimeout(() => setIsReconnecting(false), 500);
                    return;
                }
            }

            // Outside grace window on resume - proceed with full re-auth
            console.log('[ReAuth] Outside grace window on resume, proceeding with re-auth');
        } else if (isInitialAppLoadRef.current) {
            // This is an initial page load - allow normal re-auth flow
            console.log('[ReAuth] Initial app load detected, proceeding with re-auth');
            // Mark as no longer initial load after this
            isInitialAppLoadRef.current = false;
        } else {
            // Edge case: not resume and not initial load - treat as resume without grace
            console.log('[ReAuth] Edge case: neither resume nor initial load, proceeding with re-auth');
        }

        // Proceed with full re-auth flow
        attemptedThisSession.current = true;
        setIsReconnecting(true);

        // Show login modal after timeout
        backgroundReAuthTimeoutRef.current = setTimeout(() => {
            console.log('[ReAuth] Showing login modal after grace window expiry');
            setIsReconnecting(false);
            setNeedsLogin(true);
        }, 2000);
    }, [location.pathname, isWithinGraceWindow, isResumeFromHidden]);

    /**
     * Triggered when getSession() succeeds but we want to refresh in background.
     * Respects grace window - only escalates to modal if outside grace period.
     */
    const triggerBackgroundReAuth = useCallback(() => {
        console.log('[ReAuth] Starting background re-auth (non-blocking)...');
        // Don't set isReconnecting - UI already restored
        // ProfileContext will call markBackgroundReAuthFailed if refresh fails
    }, []);

    /**
     * Called when background re-auth fails.
     * Respects grace window - only shows modal if outside grace period.
     */
    const markBackgroundReAuthFailed = useCallback(() => {
        const resumeFromHidden = isResumeFromHidden();
        const withinGrace = isWithinGraceWindow();

        if (resumeFromHidden && withinGrace) {
            console.log('[ReAuth] Background re-auth failed, but within grace window on resume - no modal');
        } else {
            console.log('[ReAuth] Background re-auth failed - user may see modal on next auth action');
        }

        // Clear timeout if it exists
        if (backgroundReAuthTimeoutRef.current) {
            clearTimeout(backgroundReAuthTimeoutRef.current);
            backgroundReAuthTimeoutRef.current = null;
        }
        // Don't show modal yet - wait for actual auth failure
        setIsReconnecting(false);
    }, [isWithinGraceWindow, isResumeFromHidden]);

    /**
     * Called when silent re-auth succeeds.
     * Dismisses overlay and restores user to preserved route.
     */
    const markReAuthSuccess = useCallback(() => {
        console.log('[ReAuth] Re-auth successful');
        // Clear timeout if it exists
        if (backgroundReAuthTimeoutRef.current) {
            clearTimeout(backgroundReAuthTimeoutRef.current);
            backgroundReAuthTimeoutRef.current = null;
        }
        setIsReconnecting(false);
        setNeedsLogin(false);
        // Don't clear preservedRoute here - let the navigation happen naturally
    }, []);

    /**
     * User manually dismisses the login modal.
     * Clears state and allows navigation.
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
                hiddenDuration,
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
