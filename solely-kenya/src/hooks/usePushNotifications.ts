import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key - you'll need to generate this and set the private key in Supabase secrets
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushNotificationState {
    isSupported: boolean;
    permission: NotificationPermission | 'loading';
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
}

interface UsePushNotificationsReturn extends PushNotificationState {
    requestPermission: () => Promise<boolean>;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    shouldShowPrompt: boolean;
    dismissPrompt: () => void;
}

const DISMISS_KEY = 'push_notification_dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days for periodic reminders

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        permission: 'loading',
        isSubscribed: false,
        isLoading: true,
        error: null,
    });

    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

    // Check if push notifications are supported
    const checkSupport = useCallback(() => {
        return 'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;
    }, []);

    // Check if we should show the prompt based on dismissal time
    const checkShouldShowPrompt = useCallback(() => {
        if (state.permission === 'granted' || state.isSubscribed) {
            return false;
        }

        if (state.permission === 'denied') {
            return false; // Browser blocked, can't ask again
        }

        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (!dismissedAt) {
            return true; // Never dismissed, show prompt
        }

        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();

        // Show again after dismiss duration (24 hours for first few times)
        // or reminder interval (7 days for periodic reminders)
        const timeSinceDismiss = now - dismissedTime;
        return timeSinceDismiss > DISMISS_DURATION;
    }, [state.permission, state.isSubscribed]);

    // Initialize - check current state
    useEffect(() => {
        const init = async () => {
            const isSupported = checkSupport();

            if (!isSupported) {
                setState(prev => ({
                    ...prev,
                    isSupported: false,
                    permission: 'default',
                    isLoading: false,
                }));
                return;
            }

            const permission = Notification.permission;
            let isSubscribed = false;

            if (permission === 'granted') {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    isSubscribed = !!subscription;
                } catch (e) {
                    console.error('Error checking subscription:', e);
                }
            }

            setState({
                isSupported: true,
                permission,
                isSubscribed,
                isLoading: false,
                error: null,
            });
        };

        init();
    }, [checkSupport]);

    // Update shouldShowPrompt when state changes
    useEffect(() => {
        if (!state.isLoading) {
            setShouldShowPrompt(checkShouldShowPrompt());
        }
    }, [state.isLoading, state.permission, state.isSubscribed, checkShouldShowPrompt]);

    // Register push service worker
    const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
        try {
            const registration = await navigator.serviceWorker.register('/sw-push.js', {
                scope: '/'
            });
            console.log('Push SW registered:', registration);
            return registration;
        } catch (error) {
            console.error('Push SW registration failed:', error);
            return null;
        }
    };

    // Request notification permission
    const requestPermission = async (): Promise<boolean> => {
        if (!state.isSupported) {
            setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setState(prev => ({ ...prev, permission }));
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting permission:', error);
            setState(prev => ({ ...prev, error: 'Failed to request permission' }));
            return false;
        }
    };

    // Subscribe to push notifications
    const subscribe = async (): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // First request permission if not granted
            if (Notification.permission !== 'granted') {
                const granted = await requestPermission();
                if (!granted) {
                    setState(prev => ({ ...prev, isLoading: false }));
                    return false;
                }
            }

            // Check for VAPID key
            if (!VAPID_PUBLIC_KEY) {
                console.error('VAPID_PUBLIC_KEY not configured');
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Push notifications not configured. Please contact support.'
                }));
                return false;
            }

            // Register service worker
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                registration = await registerServiceWorker();
            }

            if (!registration) {
                throw new Error('Could not register service worker');
            }

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            });

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Save subscription to database
            // Note: push_subscriptions table may not be in generated types until migration is run
            const subscriptionJSON = subscription.toJSON();
            const { error: dbError } = await (supabase as any)
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscriptionJSON.keys?.p256dh || '',
                    auth: subscriptionJSON.keys?.auth || '',
                    user_agent: navigator.userAgent,
                }, {
                    onConflict: 'user_id,endpoint'
                });

            if (dbError) {
                console.error('Error saving subscription:', dbError);
                // Don't throw - subscription still works, just won't persist across devices
            }

            // Clear any dismiss timestamp
            localStorage.removeItem(DISMISS_KEY);

            setState(prev => ({
                ...prev,
                isSubscribed: true,
                isLoading: false,
                permission: 'granted',
            }));

            setShouldShowPrompt(false);
            return true;
        } catch (error) {
            console.error('Error subscribing:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to subscribe',
            }));
            return false;
        }
    };

    // Unsubscribe from push notifications
    const unsubscribe = async (): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                // Remove from database
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await (supabase as any)
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('endpoint', subscription.endpoint);
                }
            }

            setState(prev => ({
                ...prev,
                isSubscribed: false,
                isLoading: false,
            }));

            return true;
        } catch (error) {
            console.error('Error unsubscribing:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to unsubscribe',
            }));
            return false;
        }
    };

    // Dismiss the prompt (user clicked "Later")
    const dismissPrompt = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
        setShouldShowPrompt(false);
    }, []);

    return {
        ...state,
        requestPermission,
        subscribe,
        unsubscribe,
        shouldShowPrompt,
        dismissPrompt,
    };
}
