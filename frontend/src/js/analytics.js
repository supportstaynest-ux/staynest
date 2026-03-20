// ── StayNest Analytics Engine ──────────────────────────────────────
// Dual-tracking: Google Analytics GA4 + Supabase analytics_events table
// All events are sent to both GA4 and stored in Supabase for admin dashboards.

import { supabase } from './supabase.js';
import { state } from './state.js';

const GA4_ID = 'G-BRWDG4B0SC';

// ── Device & Browser Detection ─────────────────────────────────────
function getDeviceType() {
    const w = window.innerWidth;
    if (w <= 768) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
}

function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Other';
}

// ── Core GA4 helper ────────────────────────────────────────────────
function gtagEvent(eventName, params = {}) {
    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, params);
        }
    } catch (e) { /* silent */ }
}

// ── Core Supabase event logger ─────────────────────────────────────
async function logToSupabase(eventType, extra = {}) {
    try {
        const event = {
            user_id: state.user?.id || null,
            pg_id: extra.pg_id || null,
            event_type: eventType,
            search_query: extra.search_query || null,
            device_type: getDeviceType(),
            browser: getBrowser(),
            city: extra.city || null,
            metadata: extra.metadata || {},
        };
        await supabase.from('analytics_events').insert(event);
    } catch (e) {
        // Never break the app for analytics failures
        console.warn('Analytics log failed:', e.message);
    }
}

// ── Unified Track Function ─────────────────────────────────────────
// Sends to both GA4 and Supabase simultaneously
export function trackEvent(eventName, params = {}) {
    // GA4
    gtagEvent(eventName, {
        ...params,
        device_type: getDeviceType(),
        user_id: state.user?.id || undefined,
    });

    // Supabase
    logToSupabase(eventName, params);
}

// ── Pre-built Event Helpers ────────────────────────────────────────

// Page views
export function trackPageView(pageName) {
    trackEvent('page_view', { metadata: { page: pageName } });
    gtagEvent('page_view', { page_title: pageName, page_location: window.location.href });
}

// Auth events
export function trackSignup(method = 'email') {
    trackEvent('user_signup', { metadata: { method } });
}

export function trackLogin(method = 'email') {
    trackEvent('user_login', { metadata: { method } });
}

export function trackLogout() {
    trackEvent('user_logout', {});
}

export function trackProfileUpdate() {
    trackEvent('profile_update', {});
}

// Search events
export function trackSearch(query, filters = {}) {
    trackEvent('search_pg', { search_query: query, metadata: filters });
}

export function trackFilterUsed(filterType, filterValue) {
    const eventMap = {
        location: 'location_filter_used',
        price: 'price_filter_used',
        room_type: 'room_type_filter_used',
    };
    trackEvent(eventMap[filterType] || 'filter_used', {
        metadata: { filter_type: filterType, filter_value: filterValue },
    });
}

// PG interaction events
export function trackPGView(pgId, pgName, city) {
    trackEvent('pg_view', { pg_id: pgId, city, metadata: { pg_name: pgName } });
}

export function trackPGImageClick(pgId) {
    trackEvent('pg_image_click', { pg_id: pgId });
}

export function trackPGSave(pgId) {
    trackEvent('pg_save', { pg_id: pgId });
}

export function trackPGShare(pgId) {
    trackEvent('pg_share', { pg_id: pgId });
}

export function trackContactClick(pgId, contactType = 'general') {
    trackEvent('contact_owner_click', { pg_id: pgId, metadata: { contact_type: contactType } });
}

export function trackWhatsAppClick(pgId) {
    trackEvent('whatsapp_click', { pg_id: pgId });
}

export function trackCallClick(pgId) {
    trackEvent('call_click', { pg_id: pgId });
}

// Engagement events
let _scrollDepthTracked = new Set();

export function trackScrollDepth(depth) {
    // Only track 25, 50, 75, 100 once per page
    const bucket = Math.floor(depth / 25) * 25;
    if (bucket > 0 && !_scrollDepthTracked.has(bucket)) {
        _scrollDepthTracked.add(bucket);
        trackEvent('scroll_depth', { metadata: { depth_percent: bucket } });
    }
}

export function resetScrollTracking() {
    _scrollDepthTracked = new Set();
}

// Session duration tracking
let _sessionStart = Date.now();

export function trackSessionDuration() {
    const durationSec = Math.floor((Date.now() - _sessionStart) / 1000);
    trackEvent('session_duration', { metadata: { duration_seconds: durationSec } });
}

// ── Login Security Logger ──────────────────────────────────────────
export async function logLoginEvent(userId) {
    try {
        await supabase.from('login_logs').insert({
            user_id: userId,
            device_type: getDeviceType(),
            browser: getBrowser(),
            user_agent: navigator.userAgent,
        });
    } catch (e) {
        console.warn('Login log failed:', e.message);
    }
}

// ── Image Hash Utility ─────────────────────────────────────────────
// Simple average hash: resize image to 8x8, grayscale, compare to mean
export function computeImageHash(imageElement) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 8;
            canvas.height = 8;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageElement, 0, 0, 8, 8);
            const imageData = ctx.getImageData(0, 0, 8, 8).data;

            // Convert to grayscale
            const grays = [];
            for (let i = 0; i < imageData.length; i += 4) {
                grays.push(imageData[i] * 0.299 + imageData[i + 1] * 0.587 + imageData[i + 2] * 0.114);
            }

            // Compute mean
            const mean = grays.reduce((a, b) => a + b, 0) / grays.length;

            // Create binary hash
            const hash = grays.map(g => (g >= mean ? '1' : '0')).join('');
            resolve(hash);
        } catch (e) {
            resolve(null);
        }
    });
}

export async function storeImageHash(listingId, vendorId, imageUrl, hash) {
    if (!hash) return;
    try {
        await supabase.from('image_hashes').insert({
            listing_id: listingId,
            vendor_id: vendorId,
            image_url: imageUrl,
            hash_value: hash,
        });
    } catch (e) {
        console.warn('Image hash storage failed:', e.message);
    }
}

export async function checkDuplicateImage(hash) {
    if (!hash) return [];
    try {
        const { data } = await supabase
            .from('image_hashes')
            .select('listing_id, vendor_id, image_url')
            .eq('hash_value', hash);
        return data || [];
    } catch (e) {
        return [];
    }
}

// ── Scroll Depth Auto-Tracker ──────────────────────────────────────
function setupScrollTracker() {
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (docHeight > 0) {
                    const percent = Math.round((scrollTop / docHeight) * 100);
                    trackScrollDepth(percent);
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ── Page Exit Tracker ──────────────────────────────────────────────
function setupExitTracker() {
    window.addEventListener('beforeunload', () => {
        trackSessionDuration();
        trackEvent('page_exit', {});
    });
}

// ── Initialize Analytics ───────────────────────────────────────────
export function initAnalytics() {
    setupScrollTracker();
    setupExitTracker();

    // Reset scroll tracking on route change
    window.addEventListener('hashchange', () => {
        resetScrollTracking();
    });

}
