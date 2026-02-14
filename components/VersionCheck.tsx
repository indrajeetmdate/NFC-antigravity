import { useEffect } from 'react';

const APP_VERSION = '1.1.0'; // Increment this to force a reset

const VersionCheck = () => {
    useEffect(() => {
        const storedVersion = localStorage.getItem('app_version');

        if (storedVersion !== APP_VERSION) {
            console.log(`Version mismatch: stored ${storedVersion} vs current ${APP_VERSION}. Clearing cache.`);

            // Clear all local storage to remove stale state
            localStorage.clear();

            // Set the new version
            localStorage.setItem('app_version', APP_VERSION);

            // Force reload to ensure memory is clean
            window.location.reload();
        }
    }, []);

    return null; // This component renders nothing
};

export default VersionCheck;
