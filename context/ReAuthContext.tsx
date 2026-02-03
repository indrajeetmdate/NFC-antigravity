import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ReAuthContextType {
    isReconnecting: boolean;
    needsLogin: boolean;
    preservedRoute: string | null;
    triggerReAuth: () => void;
    triggerBackgroundReAuth: () => void;
    markBackgroundReAuthFailed: () => void;
    dismissReAuth: () => void;
    markReAuthSuccess: () => void;
}

const ReAuthContext = createContext<ReAuthContextType | undefined>(undefined);

export const ReAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [preservedRoute, setPreservedRoute] = useState<string | null>(null);
    const attemptedThisSession = useRef(false);
    const backgroundReAuthTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const location = useLocation();

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
     * Triggered for immediate re-auth (when getSession() returns null).
     * Shows overlay briefly, then modal if background re-auth doesn't complete.
     */
    const triggerReAuth = useCallback(() => {
        // Prevent multiple attempts in the same session
        if (attemptedThisSession.current) {
            console.log('[ReAuth] Already attempted re-auth this session, skipping...');
            return;
        }

        console.log('[ReAuth] Triggering immediate re-auth flow...');
        attemptedThisSession.current = true;

        // Preserve current route (exclude login/signup pages)
        const currentPath = location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
            setPreservedRoute(currentPath);
        }

        // Show reconnecting overlay
        setIsReconnecting(true);

        // The silent re-auth attempt will be handled by ProfileContext
        // After a short timeout, show login modal (background re-auth should complete before this)
        backgroundReAuthTimeoutRef.current = setTimeout(() => {
            console.log('[ReAuth] Background re-auth timed out, showing login modal...');
            setIsReconnecting(false);
            setNeedsLogin(true);
        }, 2000); // 2 second timeout for background re-auth
    }, [location.pathname]);

    /**
     * Triggered when getSession() succeeds but we want to refresh in background.
     * Does NOT show overlay - UI is already restored.
     */
    const triggerBackgroundReAuth = useCallback(() => {
        console.log('[ReAuth] Starting background re-auth (non-blocking)...');
        // Don't set isReconnecting - UI already restored
        // ProfileContext will call markBackgroundReAuthFailed if refresh fails
    }, []);

    /**
     * Called when background re-auth fails.
     * Does NOT show modal immediately - only if user tries to make authenticated request.
     */
    const markBackgroundReAuthFailed = useCallback(() => {
        console.log('[ReAuth] Background re-auth failed - session may be stale');
        // Clear timeout if it exists
        if (backgroundReAuthTimeoutRef.current) {
            clearTimeout(backgroundReAuthTimeoutRef.current);
            backgroundReAuthTimeoutRef.current = null;
        }
        // Don't show modal yet - wait for actual auth failure
        setIsReconnecting(false);
    }, []);

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
                triggerReAuth,
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
