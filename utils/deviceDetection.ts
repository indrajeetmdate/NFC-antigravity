/**
 * Device detection utilities
 */

/**
 * Detects if the current device is a mobile device
 * @returns true if mobile device, false otherwise
 */
export const isMobileDevice = (): boolean => {
    // Check user agent
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUserAgent = mobileRegex.test(navigator.userAgent);

    // Check screen width
    const isSmallScreen = window.innerWidth < 768;

    // Check for touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return isMobileUserAgent || (isSmallScreen && isTouchDevice);
};

/**
 * Gets the preferred preview mode from localStorage or defaults based on device
 * @returns 'mobile' or 'desktop'
 */
export const getPreferredPreviewMode = (): 'mobile' | 'desktop' => {
    const stored = localStorage.getItem('preferredPreviewMode');
    if (stored === 'mobile' || stored === 'desktop') {
        return stored;
    }
    // Default based on device
    return isMobileDevice() ? 'mobile' : 'desktop';
};

/**
 * Saves the preferred preview mode to localStorage
 * @param mode - 'mobile' or 'desktop'
 */
export const setPreferredPreviewMode = (mode: 'mobile' | 'desktop'): void => {
    localStorage.setItem('preferredPreviewMode', mode);
};
