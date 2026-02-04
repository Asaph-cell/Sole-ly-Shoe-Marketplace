/**
 * PWA Badge Utility
 * 
 * Uses the Badging API to show notification counts on the PWA app icon.
 * Falls back gracefully on unsupported browsers.
 * 
 * Syncs with IndexedDB 'SolelyBadgeDB' used by the service worker.
 */

// IndexedDB helpers for badge count persistence (shared with sw-push.js)
function openBadgeDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SolelyBadgeDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('badge')) {
                db.createObjectStore('badge');
            }
        };
    });
}

function setBadgeCountInDB(db: IDBDatabase, count: number): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction('badge', 'readwrite');
            const store = tx.objectStore('badge');
            const request = store.put(count, 'count');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Set the app badge count (shows number on app icon)
 * @param count - Number to display (0 clears the badge)
 */
export async function setAppBadge(count: number): Promise<boolean> {
    try {
        if ('setAppBadge' in navigator) {
            // Sync with IndexedDB for service worker
            try {
                const db = await openBadgeDB();
                await setBadgeCountInDB(db, count);
            } catch (e) {
                console.log('[Badge] Could not sync with IndexedDB:', e);
            }

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
 * Clear the app badge and reset the IndexedDB counter
 */
export async function clearAppBadge(): Promise<boolean> {
    try {
        // Reset IndexedDB counter
        const db = await openBadgeDB();
        await setBadgeCountInDB(db, 0);
    } catch (e) {
        console.log('[Badge] Could not reset IndexedDB counter:', e);
    }
    return setAppBadge(0);
}

/**
 * Check if the Badging API is supported
 */
export function isBadgingSupported(): boolean {
    return 'setAppBadge' in navigator;
}
