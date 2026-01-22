/**
 * PWA Badge Utility
 * 
 * Uses the Badging API to show notification counts on the PWA app icon.
 * Falls back gracefully on unsupported browsers.
 */

/**
 * Set the app badge count (shows number on app icon)
 * @param count - Number to display (0 clears the badge)
 */
export async function setAppBadge(count: number): Promise<boolean> {
    try {
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                await (navigator as any).setAppBadge(count);
                console.log('[Badge] Set badge count:', count);
            } else {
                await (navigator as any).clearAppBadge();
                console.log('[Badge] Cleared badge');
            }
            return true;
        } else {
            console.log('[Badge] Badging API not supported');
            return false;
        }
    } catch (error) {
        console.error('[Badge] Error setting badge:', error);
        return false;
    }
}

/**
 * Clear the app badge
 */
export async function clearAppBadge(): Promise<boolean> {
    return setAppBadge(0);
}

/**
 * Check if the Badging API is supported
 */
export function isBadgingSupported(): boolean {
    return 'setAppBadge' in navigator;
}
