// ── OneSignal Web Push Integration ──
// Handles initialization, permission requests, and subscription ID retrieval

const ONESIGNAL_APP_ID = '4455e701-a247-4280-b99d-9e6f66df29a1';

let _initialized = false;
let _initPromise = null;

/**
 * Initialize OneSignal SDK (v16)
 * Called once on app boot from main.js
 */
export function initOneSignal() {
    if (_initialized || _initPromise) return _initPromise;

    _initPromise = new Promise((resolve) => {
        // OneSignalDeferred pattern from SDK v16
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal) {
            try {
                await OneSignal.init({
                    appId: ONESIGNAL_APP_ID,
                    allowLocalhostAsSecureOrigin: true, // Allow localhost testing
                    notifyButton: {
                        enable: false // We handle our own UI
                    }
                });
                _initialized = true;
                console.log('✅ OneSignal initialized successfully');
                resolve(true);
            } catch (err) {
                console.warn('OneSignal init error:', err);
                resolve(false);
            }
        });
    });

    return _initPromise;
}

/**
 * Request notification permission from the user
 * Returns true if permission was granted
 */
export async function requestNotificationPermission() {
    try {
        if (!window.OneSignal) {
            console.warn('OneSignal SDK not loaded yet');
            return false;
        }

        const permission = await window.OneSignal.Notifications.permission;
        if (permission) return true; // Already granted

        // Show the native browser permission prompt
        await window.OneSignal.Notifications.requestPermission();
        const newPermission = await window.OneSignal.Notifications.permission;
        return newPermission;
    } catch (err) {
        console.warn('Notification permission request failed:', err);
        return false;
    }
}

/**
 * Get the OneSignal Subscription/Player ID for this browser
 * Returns null if not subscribed
 */
export async function getPlayerId() {
    try {
        if (!window.OneSignal) {
            console.warn('OneSignal SDK not loaded');
            return null;
        }

        // Wait a bit for subscription to be ready
        await new Promise(r => setTimeout(r, 500));

        // v16 API: OneSignal.User.PushSubscription
        const subscription = window.OneSignal.User?.PushSubscription;
        if (subscription) {
            const id = subscription.id;
            if (id) {
                console.log('📱 OneSignal Subscription ID:', id);
                return id;
            }
        }

        console.warn('OneSignal: No subscription ID available yet');
        return null;
    } catch (err) {
        console.warn('Error getting OneSignal player ID:', err);
        return null;
    }
}

/**
 * Check if notifications are currently supported and permission is granted
 */
export function isNotificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
}
