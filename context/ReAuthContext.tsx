import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ReAuthContextType {
    isReconnecting: boolean;
    needsLogin: boolean;
    preservedRoute: string | null;
    triggerReAuth: () => void;
    dismissReAuth: () => void;
    markReAuthSuccess: () => void;
}

const ReAuthContext = createContext<ReAuthContextType | undefined>(undefined);

export const ReAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [preservedRoute, setPreservedRoute] = useState<string | null>(null);
    const attemptedThisSession = useRef(false);
    const location = useLocation();

    // Reset attempt flag when user navigates (explicit navigation, not re-auth)
    useEffect(() => {
        if (!isReconnecting && !needsLogin) {
            attemptedThisSession.current = false;
        }
    }, [location.pathname, isReconnecting, needsLogin]);

    /**
     * Triggered when session is lost after client recreation.
     * Starts the re-auth flow: shows overlay, preserves route, attempts silent re-auth.
     */
    const triggerReAuth = useCallback(() => {
        // Prevent multiple attempts in the same session
        if (attemptedThisSession.current) {
            console.log('[ReAuth] Already attempted re-auth this session, skipping...');
            return;
        }

        console.log('[ReAuth] Triggering re-auth flow...');
        attemptedThisSession.current = true;

        // Preserve current route (exclude login/signup pages)
        const currentPath = location.pathname;
        if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
            setPreservedRoute(currentPath);
        }

        // Show reconnecting overlay
        setIsReconnecting(true);

        // The silent re-auth attempt will be handled by ProfileContext
        // After a timeout, if still reconnecting, show login modal
        setTimeout(() => {
            if (isReconnecting) {
                console.log('[ReAuth] Silent re-auth timed out, showing login modal...');
                setIsReconnecting(false);
                setNeedsLogin(true);
            }
        }, 3000); // 3 second timeout for silent re-auth
    }, [location.pathname, isReconnecting]);

    /**
     * Called when silent re-auth succeeds.
     * Dismisses overlay and restores user to preserved route.
     */
    const markReAuthSuccess = useCallback(() => {
        console.log('[ReAuth] Re-auth successful');
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
