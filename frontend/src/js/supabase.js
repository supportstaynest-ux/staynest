import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqrcqaiaarqvenlcukci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmNxYWlhYXJxdmVubGN1a2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTE2OTYsImV4cCI6MjA4ODE4NzY5Nn0.MaxlJ1dx9huliyTwL-iONxp2L2tU0Xa1dTybgQch3OU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: Get current session's access token for authenticated API calls
export async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

// ── Generic Memory Cache ──
class MemoryCache {
    constructor(ttlMs = 60000) { this.cache = new Map(); this.ttl = ttlMs; }
    get(key) {
        const item = this.cache.get(key);
        if (item && (Date.now() - item.ts < this.ttl)) return item.data;
        return null;
    }
    set(key, data) { this.cache.set(key, { data, ts: Date.now() }); }
    clear() { this.cache.clear(); }
    delete(key) { this.cache.delete(key); }
}
export const profileCache = new MemoryCache(5 * 60000); // 5 min TTL

// ── Performance: In-memory listings cache with TTL ──
const _listingsCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

function getCacheKey(filters) {
    return JSON.stringify(filters);
}

export function clearListingsCache() {
    _listingsCache.clear();
}

// ── Site Settings Cache ──
let _siteSettingsCache = null;
let _siteSettingsTs = 0;
const SITE_SETTINGS_TTL = 300000; // 5 minutes

const DEFAULT_SITE_SETTINGS = {
    site_name: 'StayNest',
    support_email: 'support@staynest.in',
    support_phone: '+91 (800) 123-4567',
    address: '123 Tech Park, Hitech City, Lucknow, UP 226010',
    website_url: 'https://quiet-cucurucho-bdfce4.netlify.app',
    banner_text: 'Find Your Perfect PG Stay'
};

export async function getSiteSettings() {
    if (_siteSettingsCache && (Date.now() - _siteSettingsTs < SITE_SETTINGS_TTL)) {
        return _siteSettingsCache;
    }
    try {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
        if (error) throw error;
        _siteSettingsCache = data;
        _siteSettingsTs = Date.now();
        return data;
    } catch (e) {
        console.warn('getSiteSettings fallback to defaults:', e.message);
        return DEFAULT_SITE_SETTINGS;
    }
}

export async function updateSiteSettings(updates) {
    const { data, error } = await supabase.from('site_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select()
        .single();
    if (error) throw error;
    // Invalidate cache
    _siteSettingsCache = data;
    _siteSettingsTs = Date.now();
    return data;
}

export function clearSiteSettingsCache() {
    _siteSettingsCache = null;
    _siteSettingsTs = 0;
}

// Optimise Supabase storage image URLs to load smaller thumbnails
export function getThumbnail(url, width = 400) {
    if (!url || typeof url !== 'string') return url;
    // Only transform Supabase storage URLs
    if (url.includes('supabase.co/storage/')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}width=${width}&quality=75`;
    }
    return url;
}

export async function signUp(email, password, fullName = '', termsAccepted = false) {
    // 1. Validate email using proper regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format");

    // 2. Check for duplicate email in profiles
    const { data: existing } = await supabase.from('profiles').select('id, is_verified').eq('email', email).single();
    if (existing) {
        if (!existing.is_verified) {
            try {
                await sendVerificationEmail(email, existing.id);
            } catch (err) {
                console.error('Failed to resend verification:', err);
                throw new Error("Failed to send verification email. Please try again.");
            }
            throw new Error("UNVERIFIED_EXISTS");
        }
        throw new Error("Email already registered");
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
    });
    if (error) throw error;

    // Record terms acceptance and login_method on profile
    if (data?.user) {
        await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            email,
            terms_accepted: termsAccepted,
            terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
            login_method: 'email',
            is_verified: false // Ensure new email users are unverified
        }, { onConflict: 'id' });

        // Trigger verification email via Backend API
        try {
            await sendVerificationEmail(email, data.user.id); // Using user ID as a simple token for this implementation
        } catch (emailErr) {
            console.error('Failed to send verification email during signup:', emailErr);
            // We still proceed since the user is created, but they'll need to resend verification
        }

        // CRITICAL: DO NOT allow auto-login after signup. 
        // Force sign out to clear any session created by Supabase.
        await supabase.auth.signOut();
    }
    return data;
}

export async function signIn(email, password) {
    // Check if the user's profile says login_method === 'google' to prevent password guesswork
    const { data: profileCheck } = await supabase.from('profiles').select('login_method').eq('email', email).single();
    if (profileCheck && profileCheck.login_method === 'google') {
        throw new Error("This account was created using Google. Please continue with Google login.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user) {
        // Check if verified
        const { data: profile } = await supabase.from('profiles').select('is_verified').eq('id', data.user.id).single();
        if (profile && !profile.is_verified) {
            await supabase.auth.signOut();
            throw new Error("NOT_VERIFIED");
        }
        
        // Track suspicious activity by logging the login event
        try {
            await supabase.from('login_logs').insert([{
                user_id: data.user.id,
                user_agent: navigator.userAgent
            }]);
        } catch (e) {
            console.warn('Failed to log login event:', e);
        }
    }
    return data;
}

async function callAuthHandler(payload) {
    const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: payload
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
}

export async function resendVerification(email) {
    // Force Vite cache invalidation
    // 1. Get user by email to get their ID (token)
    const { data: profile, error: pErr } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (pErr || !profile) throw new Error("User not found");
    
    return await sendVerificationEmail(email, profile.id);
}

export async function sendVerificationEmail(email, token) {
    console.log(`📧 Calling backend to send verification email to: ${email}`);
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/send-verification-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            token,
            origin: window.location.origin
        })
    });

    const result = await response.json();
    if (!response.ok) {
        console.error('❌ Failed to send verification email:', result.error);
        throw new Error(result.error || 'Failed to send verification email');
    }

    console.log('✅ Verification email request successful:', result);
    return result;
}

export async function verifyEmail(token) {
    // For this implementation, the token is the user ID
    const { data, error } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', token)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function sendResetPassword(email) {
    return await callAuthHandler({ action: 'send-reset', email });
}

export async function resetPasswordWithToken(token, password) {
    return await callAuthHandler({ action: 'reset-password', token, password });
}

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    clearListingsCache(); // Free up memory
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Hard clear the hash router
    window.location.hash = '/home';
    
    // Optionally trigger a hard reload to ensure absolutely zero stale memory/state remains
    // setTimeout(() => window.location.reload(), 100);
}

export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
}

export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}





export async function getProfile(userId) {
    const cached = profileCache.get(userId);
    if (cached) return cached;
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, email, avatar_url, is_verified, subscription_plan, created_at, vendor_approved, phone').eq('id', userId).single();
    if (error) throw error;
    if (data) profileCache.set(userId, data);
    return data;
}

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error("Action blocked by database permission (RLS). Please run the Admin SQL fix first.");
    }
    profileCache.set(userId, data[0]);
    return data[0];
}

export async function uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
}

export async function getListings(filters = {}) {
    const cacheKey = getCacheKey(filters);
    const cached = _listingsCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
        return cached.data;
    }

    let query = supabase.from('listings').select('*, profiles!vendor_id(full_name, avatar_url), reviews(rating)').eq('status', 'approved');
    if (filters.city) query = query.eq('city', filters.city);
    if (filters.minPrice) query = query.gte('monthly_rent', filters.minPrice);
    if (filters.maxPrice) query = query.lte('monthly_rent', filters.maxPrice);
    if (filters.gender) query = query.eq('gender_allowed', filters.gender);
    if (filters.featured) query = query.eq('is_featured', true);
    
    // Multi-word intelligent search
    if (filters.search) {
        // Split the query string into parts (e.g. "Varanasi Bhelupur" -> ["Varanasi", "Bhelupur"])
        const searchTerms = filters.search.trim().split(/\s+/).filter(word => word.length > 0);
        
        // Build a smart OR query ensuring ANY matching word shows the PG.
        // It searches PG Name, City, Landmark, and Full Address combinations.
        if (searchTerms.length > 0) {
            const orString = searchTerms.map(term => {
                const termSafe = term.replace(/'/g, "''"); // escape quotes for PostgREST
                return `name.ilike.%${termSafe}%,city.ilike.%${termSafe}%,address.ilike.%${termSafe}%,landmark.ilike.%${termSafe}%`;
            }).join(',');
            query = query.or(orString);
        }
    }

    if (filters.sort === 'price_asc') query = query.order('monthly_rent', { ascending: true });
    else if (filters.sort === 'price_desc') query = query.order('monthly_rent', { ascending: false });
    else query = query.order('is_featured', { ascending: false, nullsFirst: false }).order('search_priority', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    
    if (filters.limit && !filters.lat) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];

    if (filters.lat !== undefined && filters.lng !== undefined && filters.lat !== null && filters.lng !== null) {
        results.forEach(pg => {
            if (pg.latitude && pg.longitude) {
                const R = 6371e3;
                const p1 = filters.lat * Math.PI / 180;
                const p2 = pg.latitude * Math.PI / 180;
                const dp = (pg.latitude - filters.lat) * Math.PI / 180;
                const dl = (pg.longitude - filters.lng) * Math.PI / 180;
                const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                pg._distance = R * c;
            } else {
                pg._distance = 999999999;
            }
        });
        results.sort((a, b) => a._distance - b._distance);
        if (filters.limit) results = results.slice(0, filters.limit);
    }

    _listingsCache.set(cacheKey, { data: results, ts: Date.now() });
    return results;
}

// Cache for location suggestions
let _locationsSuggestions = null;
let _locationsTs = 0;

export async function searchLocations(query) {
    // Refresh locations cache every 5 minutes
    if (!_locationsSuggestions || (Date.now() - _locationsTs > 300000)) {
        const { data } = await supabase.from('listings').select('name, city, address, landmark').eq('status', 'approved');
        if (data) {
            const locs = new Set();
            data.forEach(pg => {
                if (pg.city) locs.add(pg.city.trim());
                if (pg.landmark) locs.add(pg.landmark.trim());
                if (pg.name) locs.add(pg.name.trim());
                // Extract meaningful chunks from the address
                if (pg.address) {
                    locs.add(pg.address.trim());
                    // Create multi-word chunks for partial address hits
                    pg.address.split(/[,\-\/|]/).forEach(part => {
                        const p = part.trim();
                        if (p.length > 2) locs.add(p);
                    });
                }
            });
            // Filter out empty or null values
            _locationsSuggestions = [...locs].filter(Boolean);
            _locationsTs = Date.now();
        }
    }

    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    // Split query for multi-word smart matching
    const queryWords = q.split(/\s+/).filter(w => w.length > 0);

    // Score and sort matches based on how well they match the typed words
    const matches = _locationsSuggestions.map(loc => {
        const locLower = loc.toLowerCase();
        let score = 0;
        let isMatch = false;

        // Give heavy bonus if it starts EXACTLY with the full query
        if (locLower.startsWith(q)) {
            score -= 100;
            isMatch = true;
        } 
        // Give bonus if it fully contains the exact query string
        else if (locLower.includes(q)) {
            score -= 50;
            isMatch = true;
        }
        
        // Multi-word partial matching logic
        const matchedWords = queryWords.filter(word => locLower.includes(word));
        if (matchedWords.length > 0) {
            isMatch = true;
            // The more words we match, the better the score!
            score -= (matchedWords.length * 10);
            
            // Strong bonus if the location starts with the first typed word
            if (locLower.startsWith(queryWords[0])) {
                score -= 20;
            }
        }

        return { text: loc, score: score, isMatch: isMatch };
    }).filter(m => m.isMatch).sort((a, b) => a.score - b.score || a.text.length - b.text.length);

    // Deduplicate case-insensitive and return top suggestions fast
    const seen = new Set();
    return matches.filter(m => {
        const key = m.text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 8).map(m => m.text);
}

export async function getListing(id) {
    const { data, error } = await supabase.from('listings').select('*, profiles!vendor_id(full_name, phone, avatar_url), reviews(*, profiles!user_id(full_name, avatar_url))').eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function createListing(listing) {
    const { data, error } = await supabase.from('listings').insert(listing).select().single();
    if (error) throw error;
    return data;
}

export async function updateListing(id, updates) {
    const { data, error } = await supabase.from('listings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error("Action blocked by database permission (RLS). Please run the Admin SQL fix first.");
    }
    return data[0];
}

export async function incrementListingViews(id) {
    try {
        const { data: listing } = await supabase.from('listings').select('total_views').eq('id', id).single();
        if (listing) {
            await supabase.from('listings').update({ total_views: (listing.total_views || 0) + 1 }).eq('id', id);
        }
    } catch (err) {
        console.warn('Failed to increment views:', err);
    }
}

export async function deleteListing(id, vendorId) {
    // If vendorId provided, verify ownership first
    if (vendorId) {
        const { data: listing } = await supabase.from('listings').select('id, vendor_id').eq('id', id).single();
        if (!listing) throw new Error('Listing not found');
        if (listing.vendor_id !== vendorId) throw new Error('You can only delete your own listings');
    }

    // Try hard delete
    const { data: deleted, error } = await supabase.from('listings').delete().eq('id', id).select();

    if (error) {
        // If RLS blocks delete, try soft-delete by updating status
        console.warn('Hard delete blocked by RLS, trying soft-delete:', error.message);
        const { data: updateData, error: updateError } = await supabase.from('listings').update({ status: 'deleted' }).eq('id', id).select();
        if (updateError) throw new Error('Failed to delete listing: ' + updateError.message);
        if (!updateData || updateData.length === 0) throw new Error("Action blocked by database permission (RLS). Please run the Admin SQL fix first.");
    } else if (!deleted || deleted.length === 0) {
        // Delete returned no error but affected 0 rows (RLS silently blocked it)
        console.warn('Delete returned 0 rows, trying soft-delete');
        const { data: updateData, error: updateError } = await supabase.from('listings').update({ status: 'deleted' }).eq('id', id).select();
        if (updateError) throw new Error('Failed to delete listing: ' + updateError.message);
        if (!updateData || updateData.length === 0) throw new Error("Action blocked by database permission (RLS). Please run the Admin SQL fix first.");
    }

    // Clear caches so UI refreshes with latest data
    clearListingsCache();
}

export async function uploadListingImages(listingId, files) {
    const compressImage = async (file) => {
        return new Promise((resolve, reject) => {
            if (!file.type.match(/image.*/)) {
                resolve(file); // Only process images
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX = 1200;

                    if (width > height) {
                        if (width > MAX) { height *= MAX / width; width = MAX; }
                    } else {
                        if (height > MAX) { width *= MAX / height; height = MAX; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const uploadPromises = files.map(async (f, i) => {
        const file = await compressImage(f);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${listingId}/${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from('listing-images').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
        return data.publicUrl;
    });
    return Promise.all(uploadPromises);
}

export async function getSavedListings(userId) {
    const { data, error } = await supabase.from('saved_listings').select('*, listings(*, profiles!vendor_id(full_name), reviews(rating))').eq('user_id', userId);
    if (error) throw error;
    return data || [];
}

export async function saveListing(userId, listingId) {
    const { error } = await supabase.from('saved_listings').insert({ user_id: userId, listing_id: listingId });
    if (error) throw error;
}

export async function unsaveListing(userId, listingId) {
    const { error } = await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw error;
}

export async function getRecentlyViewed(userId) {
    const { data, error } = await supabase.from('recently_viewed').select('*, listings(*, profiles!vendor_id(full_name), reviews(rating))').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
}

export async function addRecentlyViewed(userId, listingId) {
    await supabase.from('recently_viewed').delete().eq('user_id', userId).eq('listing_id', listingId);
    const { error } = await supabase.from('recently_viewed').insert({ user_id: userId, listing_id: listingId });
    if (error) throw error;
}

export async function getEnquiries(userId, asVendor = false) {
    let query = supabase.from('enquiries').select('*, listings(name, images), profiles!user_id(full_name, phone)');
    query = asVendor ? query.eq('vendor_id', userId) : query.eq('user_id', userId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createEnquiry(enquiry) {
    const { data, error } = await supabase.from('enquiries').insert(enquiry).select().single();
    if (error) throw error;
    return data;
}

export async function replyEnquiry(id, reply) {
    const { error } = await supabase.from('enquiries').update({ reply, status: 'replied' }).eq('id', id);
    if (error) throw error;
}

// ── Subscription & Payment System ──

export async function getPlans() {
    const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createPlan(planData) {
    const { data, error } = await supabase.from('plans').insert([planData]).select().single();
    if (error) throw error;
    return data;
}

export async function updatePlan(id, planUpdates) {
    const { data, error } = await supabase.from('plans').update(planUpdates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

export async function deletePlan(id) {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) throw error;
}

export async function uploadPaymentScreenshot(file, vendorId) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${vendorId}/${Date.now()}_payment.${ext}`;
    const { error } = await supabase.storage.from('payments').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('payments').getPublicUrl(path);
    return data.publicUrl;
}

export async function createPaymentRequest(requestData) {
    const { data, error } = await supabase.from('payment_requests').insert([requestData]).select().single();
    if (error) throw error;
    return data;
}

export async function getPaymentRequestsAdmin() {
    const { data, error } = await supabase.from('payment_requests').select('*, profiles!vendor_id(full_name, phone)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function updatePaymentRequestStatus(requestId, status) {
    const { error } = await supabase.from('payment_requests').update({ payment_status: status }).eq('id', requestId);
    if (error) throw error;
}

export async function createAdminLog(adminEmail, action, vendorId = null) {
    const { data, error } = await supabase.from('admin_logs').insert([{ admin_email: adminEmail, action, vendor_id: vendorId }]);
    if (error) console.error('Failed to create admin log:', error);
    return data;
}


export async function createReview(review) {
    const { data, error } = await supabase.from('reviews').insert(review).select().single();
    if (error) throw error;
    return data;
}

export async function replyReview(id, reply) {
    const { error } = await supabase.from('reviews').update({ vendor_reply: reply }).eq('id', id);
    if (error) throw error;
}

export async function getNotifications(userId) {
    const { data, error } = await supabase.from('notifications').select('*').or(`user_id.eq.${userId},is_broadcast.eq.true`).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
}

export async function sendNotification(notification) {
    const { error } = await supabase.from('notifications').insert(notification);
    if (error) throw error;
}

// Send a targeted (personal) notification to a specific user — fire-and-forget (never throws to caller)
export async function sendTargetedNotification(userId, title, message, type = 'info') {
    if (!userId) return;
    try {
        await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            is_broadcast: false,
            receiver_type: 'user',
            type,
        });
    } catch (e) {
        // Notification failure should never break the main action
        console.warn('sendTargetedNotification failed:', e.message);
    }
}

// Track recent activity for vendor dashboard — fire-and-forget
export async function insertRecentActivity(vendorId, activityType, description, metadata = {}) {
    if (!vendorId) return;
    try {
        // Store as a notification row tagged for vendor activity feed
        await supabase.from('notifications').insert({
            user_id: vendorId,
            title: activityType,
            message: description,
            is_broadcast: false,
            receiver_type: 'vendor_activity',
            type: activityType,
        });
    } catch (e) {
        console.warn('insertRecentActivity failed:', e.message);
    }
}

export async function sendBroadcastMessage({ title, message, receiverType, senderId }) {
    const { error } = await supabase.from('notifications').insert({
        title,
        message,
        is_broadcast: true,
        receiver_type: receiverType || 'all',
        sender_id: senderId || null,
    });
    if (error) throw error;
}

export async function getUserBroadcasts(userId) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_broadcast', true)
        .in('receiver_type', ['all_users', 'all'])
        .order('created_at', { ascending: false })
        .limit(15);
    if (error) throw error;

    let result = data || [];
    if (userId && result.length > 0) {
        const { data: profile } = await supabase.from('profiles').select('created_at').eq('id', userId).single();
        const userCreatedAt = profile ? new Date(profile.created_at).getTime() : 0;

        if (userCreatedAt > 0) {
            result = result.filter(m => new Date(m.created_at).getTime() >= userCreatedAt);
        }

        const { data: dismissed } = await supabase
            .from('dismissed_messages')
            .select('message_id')
            .eq('user_id', userId)
            .in('message_id', result.map(m => m.id));

        if (dismissed && dismissed.length > 0) {
            const dismissedSet = new Set(dismissed.map(d => d.message_id));
            result = result.filter(m => !dismissedSet.has(m.id));
        }
    }
    return result.slice(0, 5);
}

export async function getVendorBroadcasts(userId) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_broadcast', true)
        .in('receiver_type', ['all_vendors', 'all'])
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) throw error;

    let result = data || [];
    if (userId && result.length > 0) {
        const { data: profile } = await supabase.from('profiles').select('created_at').eq('id', userId).single();
        const userCreatedAt = profile ? new Date(profile.created_at).getTime() : 0;

        if (userCreatedAt > 0) {
            result = result.filter(m => new Date(m.created_at).getTime() >= userCreatedAt);
        }

        const { data: dismissed } = await supabase
            .from('dismissed_messages')
            .select('message_id')
            .eq('user_id', userId)
            .in('message_id', result.map(m => m.id));

        if (dismissed && dismissed.length > 0) {
            const dismissedSet = new Set(dismissed.map(d => d.message_id));
            result = result.filter(m => !dismissedSet.has(m.id));
        }
    }
    return result.slice(0, 10);
}

export async function dismissMessage(userId, messageId) {
    if (!userId || !messageId) return;
    const { error } = await supabase.from('dismissed_messages').insert({
        user_id: userId,
        message_id: messageId
    });
    // Ignore duplicate key errors if already dismissed
    if (error && error.code !== '23505') throw error;
}

export async function getBroadcastHistory() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_broadcast', true)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) throw error;
    return data || [];
}

export async function getAllUsers() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function getUsersPaginated(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await supabase.from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
    if (error) throw error;
    return { data: data || [], total: count || 0 };
}

export async function getAllListingsAdmin() {
    // Only select the fields required for the admin listings table
    const { data, error } = await supabase.from('listings').select('id, name, city, monthly_rent, status, created_at, is_featured, is_verified, total_views, vendor_id, profiles!vendor_id(full_name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function getVendorListings(vendorId) {
    // Optimized select for Vendor Dashboard
    const { data, error } = await supabase.from('listings').select('id, name, city, address, monthly_rent, deposit, gender_allowed, status, created_at, images, total_views, is_featured, is_verified, search_priority, reviews(rating)').eq('vendor_id', vendorId).neq('status', 'deleted').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function getVendorStats(vendorId) {
    const [listingsRes, enquiriesRes] = await Promise.all([
        supabase.from('listings').select('id, total_views, status').eq('vendor_id', vendorId),
        supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId)
    ]);
    const all = listingsRes.data || [];
    return {
        totalListings: all.length,
        activeListings: all.filter(l => l.status === 'approved').length,
        totalViews: all.reduce((s, l) => s + (l.total_views || 0), 0),
        totalEnquiries: enquiriesRes.count || 0
    };
}

export async function getVendorAnalyticsData(vendorId) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const isoDate = ninetyDaysAgo.toISOString();

    // 1. Get listings first to get their IDs
    const { data: listings, error: lErr } = await supabase.from('listings')
        .select('id, name, status, monthly_rent, available_rooms, gender_allowed, total_views, city, latitude, longitude')
        .eq('vendor_id', vendorId);
    
    if (lErr || !listings || listings.length === 0) {
        return { listings: listings || [], visits: [], chats: [], views: [] };
    }

    const listingIds = listings.map(l => l.id);

    // 2. Fetch visits, chats, and REAL view events in parallel
    const [visitsRes, chatsRes, viewsRes] = await Promise.all([
        supabase.from('visit_requests').select('id, status, created_at, listing_id').eq('vendor_id', vendorId).gte('created_at', isoDate),
        supabase.from('listing_chats').select('id, created_at, listing_id').eq('vendor_id', vendorId).gte('created_at', isoDate),
        supabase.from('analytics_events').select('pg_id, created_at').in('pg_id', listingIds).eq('event_type', 'pg_view').gte('created_at', isoDate)
    ]);

    return {
        listings: listings,
        visits: visitsRes.data || [],
        chats: chatsRes.data || [],
        views: viewsRes.data || []
    };
}

export function subscribeToVendorAnalytics(vendorId, callback) {
    return supabase.channel('vendor-analytics-' + vendorId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: 'vendor_id=eq.' + vendorId }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_requests', filter: 'vendor_id=eq.' + vendorId }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_chats', filter: 'vendor_id=eq.' + vendorId }, callback)
        .subscribe();
}

export function unsubscribeFromVendorAnalytics(channel) {
    if (channel) supabase.removeChannel(channel);
}

export async function getAdminStats() {
    const [usersRes, vendorsRes, listingsRes, enquiriesRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('enquiries').select('*', { count: 'exact', head: true })
    ]);
    return {
        users: usersRes.count || 0,
        vendors: vendorsRes.count || 0,
        listings: listingsRes.count || 0,
        leads: enquiriesRes.count || 0
    };
}



export async function getVendorReviews(vendorId) {
    // Get all listings owned by this vendor
    const { data: listings } = await supabase.from('listings').select('id, name').eq('vendor_id', vendorId);
    if (!listings || listings.length === 0) return [];

    const listingIds = listings.map(l => l.id);
    const listingMap = Object.fromEntries(listings.map(l => [l.id, l.name]));

    const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles!user_id(full_name, avatar_url)')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });
    if (error) throw error;

    return data ? data.map(r => ({ ...r, listing_name: listingMap[r.listing_id] })) : [];
}

export async function insertNearbyPlaces(places) {
    if (!places || places.length === 0) return;
    const { error } = await supabase.from('nearby_places').insert(places);
    if (error) console.error("Error inserting nearby places:", error);
}

export async function getNearbyPlaces(listingId) {
    const { data, error } = await supabase
        .from('nearby_places')
        .select('*')
        .eq('listing_id', listingId)
        .order('distance', { ascending: true });

    if (error) {
        console.error("Error fetching nearby places:", error);
        return [];
    }
    return data || [];
}

// ── Chat System ─────────────────────────────────────────────────

export async function getChatMessages(conversationId) {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!sender_id(full_name, avatar_url, role)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function sendChatMessage({ senderId, receiverId, message, isFromAdmin, conversationId }) {
    const { data, error } = await supabase.from('chat_messages').insert({
        sender_id: senderId,
        receiver_id: receiverId || null,
        message,
        is_from_admin: isFromAdmin || false,
        conversation_id: conversationId
    }).select().single();
    if (error) throw error;
    return data;
}

export async function markChatRead(conversationId, userId) {
    const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);
    if (error) console.warn('markChatRead error:', error.message);
}

export async function getAdminConversations() {
    // Get all unique conversations with latest message
    const { data, error } = await supabase
        .from('chat_messages')
        .select('conversation_id, message, created_at, is_read, is_from_admin, sender:profiles!sender_id(full_name, avatar_url, role)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    // Group by conversation_id and take the latest message per conversation
    const convMap = new Map();
    data.forEach(msg => {
        if (!convMap.has(msg.conversation_id)) {
            convMap.set(msg.conversation_id, {
                conversation_id: msg.conversation_id,
                last_message: msg.message,
                last_time: msg.created_at,
                last_sender: msg.sender,
                is_from_admin: msg.is_from_admin,
                unread: 0,
                total: 0
            });
        }
        const conv = convMap.get(msg.conversation_id);
        conv.total++;
        if (!msg.is_read && !msg.is_from_admin) conv.unread++;
    });

    // Fetch vendor profiles for each conversation
    const convList = Array.from(convMap.values());
    const vendorIds = convList.map(c => c.conversation_id);
    if (vendorIds.length > 0) {
        const { data: vendors } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email, role')
            .in('id', vendorIds);
        if (vendors) {
            const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
            convList.forEach(c => {
                c.vendor = vendorMap[c.conversation_id] || null;
            });
        }
    }

    return convList.sort((a, b) => new Date(b.last_time) - new Date(a.last_time));
}

export function subscribeToChatMessages(conversationId, callback) {
    const channel = supabase
        .channel(`chat-${conversationId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`
        }, payload => {
            callback(payload.new);
        })
        .subscribe();
    return channel;
}

export function unsubscribeChat(channel) {
    if (channel) supabase.removeChannel(channel);
}

// ── Reports System ──────────────────────────────────────────────────

export async function getReports() {
    const { data, error } = await supabase
        .from('reports')
        .select(`
            *,
            listings:listing_id(name, city, images),
            profiles:reported_by(full_name),
            reported_user:reported_user_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function updateReport(reportId, updates) {
    const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function createReport(reportData) {
    const { data, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Visit Requests (Leads) ──────────────────────────────────────────

export async function createVisitRequest(requestData) {
    const { data, error } = await supabase
        .from('visit_requests')
        .insert([requestData])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getUserVisitRequests(userId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    try {
        const listingIds = [...new Set(data.map(v => v.listing_id).filter(Boolean))];
        if (listingIds.length === 0) return data;

        const { data: listings } = await supabase
            .from('listings')
            .select('id, name, city, area, address')
            .in('id', listingIds);

        const listingMap = new Map((listings || []).map(l => [l.id, l]));
        return data.map(v => ({ ...v, listing: listingMap.get(v.listing_id) || null }));
    } catch (err) {
        console.error("Failed to map listings to user visits", err);
        return data;
    }
}

export async function getVendorVisitRequests(vendorId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    try {
        const listingIds = [...new Set(data.map(v => v.listing_id).filter(Boolean))];
        if (listingIds.length === 0) return data;

        const { data: listings, error: lsError } = await supabase
            .from('listings')
            .select('id, name, city, area')
            .in('id', listingIds);

        if (lsError) {
            console.error("Error fetching listings for visit requests:", lsError);
            return data; // Return without listings if error
        }

        const listingMap = new Map((listings || []).map(l => [l.id, l]));
        return data.map(v => ({ ...v, listing: listingMap.get(v.listing_id) || null }));
    } catch (err) {
        console.error("Failed to map listings to visits", err);
        return data;
    }
}

export async function updateVisitRequestStatus(id, updates) {
    const { data, error } = await supabase
        .from('visit_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getUserListingVisitRequest(listingId, userId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('listing_id', listingId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function cancelVisitRequest(id) {
    const { data, error } = await supabase
        .from('visit_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Listing Chats (User <-> Vendor) ──────────────────────────────────

export async function getListingChatMessages(listingId, userId, vendorId) {
    const { data, error } = await supabase
        .from('listing_chats')
        .select('*')
        .eq('listing_id', listingId)
        .eq('user_id', userId)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function sendListingChatMessage(msgData) {
    const { data, error } = await supabase
        .from('listing_chats')
        .insert([msgData])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getVendorListingChats(vendorId) {
    // Get unique conversations for a vendor - using explicit FK names to avoid ambiguity
    const { data, error } = await supabase
        .from('listing_chats')
        .select('id, listing_id, user_id, vendor_id, message, created_at, is_from_vendor, is_read')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch listing names separately to avoid FK join ambiguity
    const listingIds = [...new Set(data.map(m => m.listing_id))];
    const userIds = [...new Set(data.map(m => m.user_id))];

    const [{ data: listings }, { data: users }] = await Promise.all([
        supabase.from('listings').select('id, name').in('id', listingIds),
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    ]);

    const listingMap = new Map((listings || []).map(l => [l.id, l]));
    const userMap = new Map((users || []).map(u => [u.id, u]));

    // Group by listing_id and user_id to find latest message per thread
    const threads = new Map();
    data.forEach(msg => {
        const key = msg.listing_id + '_' + msg.user_id;
        if (!threads.has(key)) {
            threads.set(key, {
                ...msg,
                listing: listingMap.get(msg.listing_id) || null,
                user: userMap.get(msg.user_id) || null
            });
        }
    });

    return Array.from(threads.values());
}

export function subscribeToListingChats(listingId, userId, vendorId, callback) {
    const channel = supabase
        .channel(`listing_chats-${listingId}-${userId}-${vendorId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'listing_chats',
            filter: `listing_id=eq.${listingId}`, // We filter further in the JS or we can't easily filter on 3 columns in the subscribe URL. Better to filter here.
        }, payload => {
            const newMsg = payload.new;
            if (newMsg.user_id === userId && newMsg.vendor_id === vendorId) {
                callback(newMsg);
            }
        })
        .subscribe();
    return channel;
}
// ── Admin Monitoring System ──────────────────────────────────────────

// Admin Monitoring Functions
export async function getAnalyticsEvents(filters = {}) {
    let query = supabase.from('analytics_events').select('*, profiles(full_name, email), listings(name)');
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.eventType) query = query.eq('event_type', filters.eventType);
    
    // Add 30 days default date range if not provided
    if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
    } else {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
    }
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(filters.limit || 1000);
    if (error) throw error;
    return data || [];
}

export async function getUserActivityTimeline(userId) {
    const { data, error } = await supabase
        .from('analytics_events')
        .select('*, listings(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    return data || [];
}

export async function getDemandData() {
    // We aggregate raw events into per-city demand metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, city')
        .gte('created_at', thirtyDaysAgo)
        .in('event_type', ['search_pg', 'pg_view', 'contact_owner_click', 'pg_save']);
        
    if (error) throw error;
    
    const cityStats = new Map();
    data.forEach(e => {
        if (!e.city) return;
        const city = e.city.trim().toLowerCase();
        if (!cityStats.has(city)) {
            cityStats.set(city, { city: e.city, searches: 0, views: 0, contacts: 0, saves: 0, score: 0 });
        }
        const stats = cityStats.get(city);
        if (e.event_type === 'search_pg') stats.searches++;
        if (e.event_type === 'pg_view') stats.views++;
        if (e.event_type === 'contact_owner_click') stats.contacts++;
        if (e.event_type === 'pg_save') stats.saves++;
    });

    // Calculate AI demand score: (searches * 3) + (views * 2) + (contacts * 5) + (saves * 4)
    Array.from(cityStats.values()).forEach(stats => {
        stats.score = Math.min(100, Math.round((stats.searches * 3 + stats.views * 2 + stats.contacts * 5 + stats.saves * 4) / 10)); // Arbitrary scaling for demo to 100
    });

    return Array.from(cityStats.values()).sort((a, b) => b.score - a.score);
}

export async function getConversionFunnel(dateRange = {}) {
    // Counts for: Visit → Search → View → Contact (last N days)
    const days = typeof dateRange.days === 'number' ? dateRange.days : 30;
    const startDate = dateRange.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const endDate = dateRange.endDate || new Date().toISOString();

    const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('event_type', ['page_view', 'search_pg', 'pg_view', 'contact_owner_click']);

    if (error) throw error;

    const counts = { page_view: 0, search_pg: 0, pg_view: 0, contact_owner_click: 0 };
    (data || []).forEach(e => {
        if (counts[e.event_type] !== undefined) counts[e.event_type]++;
    });

    return {
        startDate,
        endDate,
        steps: [
            { key: 'visit', label: 'Visits', count: counts.page_view },
            { key: 'search', label: 'Search', count: counts.search_pg },
            { key: 'view', label: 'PG View', count: counts.pg_view },
            { key: 'contact', label: 'Contact', count: counts.contact_owner_click },
        ],
        raw: counts,
    };
}

export async function getVendorPerformanceData() {
    // Aggregate listings and interactions per vendor
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('role', 'vendor');
    if (pErr) throw pErr;
    
    const { data: listings, error: lErr } = await supabase.from('listings').select('id, vendor_id, total_views');
    if (lErr) throw lErr;

    const { data: contacts, error: cErr } = await supabase.from('visit_requests').select('vendor_id');
    if (cErr) throw cErr;

    const vendorStats = new Map(profiles.map(p => [p.id, { ...p, listings: 0, views: 0, contacts: 0, saves: 0, score: 0 }]));

    listings.forEach(l => {
        if (vendorStats.has(l.vendor_id)) {
            const v = vendorStats.get(l.vendor_id);
            v.listings++;
            v.views += (l.total_views || 0);
        }
    });

    contacts.forEach(c => {
        if (vendorStats.has(c.vendor_id)) {
            vendorStats.get(c.vendor_id).contacts++;
        }
    });

    // Score = views + contacts * 5
    Array.from(vendorStats.values()).forEach(v => {
        v.score = v.views + (v.contacts * 5);
        v.conversionRate = v.views > 0 ? ((v.contacts / v.views) * 100).toFixed(1) + '%' : '0%';
    });

    return Array.from(vendorStats.values()).filter(v => v.listings > 0).sort((a, b) => b.score - a.score);
}

export async function getFraudFlags() {
    const { data, error } = await supabase
        .from('fraud_flags')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function insertFraudFlag(flag) {
    const { listing_id, ...sanitizedFlag } = flag;
    const { error } = await supabase.from('fraud_flags').insert([sanitizedFlag]);
    if (error) throw error;
}

export async function upsertFraudFlags(flags) {
    if (!Array.isArray(flags) || flags.length === 0) return [];
    
    // Workaround: Sanitize payload to remove listing_id as it currently does not exist in the DB schema
    const sanitizedFlags = flags.map(({ listing_id, ...rest }) => rest);
    
    // Also remove listing_id from the onConflict fields
    const { data, error } = await supabase
        .from('fraud_flags')
        .upsert(sanitizedFlags, { onConflict: 'flag_type,user_id,reason' })
        .select();
    if (error) throw error;
    return data || [];
}

export async function updateFraudFlagStatus(id, status = 'resolved') {
    const { data, error } = await supabase
        .from('fraud_flags')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getLoginLogs(userId = null, limit = 200) {
    let query = supabase.from('login_logs').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
}

export async function insertLoginLog(log) {
    const { error } = await supabase.from('login_logs').insert([log]);
    if (error) throw error;
}

export async function insertImageHash(row) {
    const { error } = await supabase.from('image_hashes').insert([row]);
    if (error) throw error;
}

export async function checkImageDuplicate(hash) {
    const { data, error } = await supabase
        .from('image_hashes')
        .select('listing_id, vendor_id, image_url, created_at')
        .eq('hash_value', hash)
        .order('created_at', { ascending: false })
        .limit(10);
    if (error) throw error;
    return data || [];
}

export async function getAutoRankingScores({ days = 30, limit = 200 } = {}) {
    // score = (views × 1) + (contacts × 5) + (saves × 3) + (avgRating × 10)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: listings, error: lErr }, { data: saves, error: sErr }, { data: contacts, error: cErr }] = await Promise.all([
        supabase
            .from('listings')
            .select('id, vendor_id, name, city, total_views, created_at, reviews(rating)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(limit),
        supabase
            .from('saved_listings')
            .select('listing_id, created_at')
            .gte('created_at', since),
        supabase
            .from('visit_requests')
            .select('listing_id, created_at')
            .gte('created_at', since),
    ]);

    if (lErr) throw lErr;
    if (sErr) throw sErr;
    if (cErr) throw cErr;

    const saveCounts = new Map();
    (saves || []).forEach(r => saveCounts.set(r.listing_id, (saveCounts.get(r.listing_id) || 0) + 1));
    const contactCounts = new Map();
    (contacts || []).forEach(r => contactCounts.set(r.listing_id, (contactCounts.get(r.listing_id) || 0) + 1));

    const avg = (arr) => {
        if (!arr || arr.length === 0) return 0;
        const nums = arr.map(x => +x.rating).filter(n => !isNaN(n));
        if (nums.length === 0) return 0;
        return nums.reduce((a, b) => a + b, 0) / nums.length;
    };

    const scored = (listings || []).map(l => {
        const views = l.total_views || 0;
        const savesN = saveCounts.get(l.id) || 0;
        const contactsN = contactCounts.get(l.id) || 0;
        const avgRating = avg(l.reviews);
        const score = (views * 1) + (contactsN * 5) + (savesN * 3) + (avgRating * 10);
        return {
            listing_id: l.id,
            vendor_id: l.vendor_id,
            name: l.name,
            city: l.city,
            views,
            saves: savesN,
            contacts: contactsN,
            avgRating: +avgRating.toFixed(2),
            score: Math.round(score),
        };
    }).sort((a, b) => b.score - a.score);

    return scored;
}

export async function getAdminChatMonitoringStats() {
    const [{ data: vendors, error: vError }, { data: listings, error: lError }, { data: leads, error: leadError }, { data: chats, error: cError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'vendor'),
        supabase.from('listings').select('id, vendor_id'),
        supabase.from('visit_requests').select('vendor_id'),
        supabase.from('listing_chats').select('vendor_id, listing_id, user_id')
    ]);

    if (vError) throw vError;
    if (lError) throw lError;
    if (leadError) throw leadError;
    if (cError) throw cError;

    return vendors.map(vendor => {
        const vListings = listings.filter(l => l.vendor_id === vendor.id);
        const vLeads = leads.filter(l => l.vendor_id === vendor.id);
        const vChats = new Set(chats.filter(c => c.vendor_id === vendor.id).map(c => c.listing_id + '-' + c.user_id)).size;
        return {
            ...vendor,
            total_listings: vListings.length,
            total_leads: vLeads.length,
            total_chats: vChats,
            last_activity: vendor.updated_at || vendor.created_at
        };
    }).sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
}

export async function getAdminVendorDetails(vendorId) {
    const { data: vendor, error: vError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', vendorId)
        .single();
    if (vError) throw vError;

    const { data: listings, error: lError } = await supabase
        .from('listings')
        .select('*, visit_requests(count), reviews(count)')
        .eq('vendor_id', vendorId);
    if (lError) throw lError;

    const { data: messages, error: mError } = await supabase
        .from('listing_chats')
        .select('*, listing:listings(name), user:profiles!user_id(full_name, avatar_url)')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
    if (mError) throw mError;

    const threadsMap = new Map();
    messages.forEach(msg => {
        const threadId = msg.listing_id + '-' + msg.user_id;
        if (!threadsMap.has(threadId)) {
            threadsMap.set(threadId, {
                listing_id: msg.listing_id,
                listing_name: msg.listing?.name || 'Unknown Listing',
                user_id: msg.user_id,
                user_name: msg.user?.full_name || 'User',
                last_message: msg.message,
                last_time: msg.created_at,
                message_count: 0
            });
        }
        threadsMap.get(threadId).message_count++;
    });

    return {
        vendor,
        listings,
        chat_threads: Array.from(threadsMap.values())
    };
}

export async function getAdminListingChats(listingId, userId = null) {
    let query = supabase
        .from('listing_chats')
        .select('*, user:profiles!user_id(full_name, avatar_url), vendor:profiles!vendor_id(full_name, avatar_url)')
        .eq('listing_id', listingId);

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

// ── Search Alerts & Push Notifications ──────────────────────────────

/**
 * Save a search alert when user searches a location with no results.
 * Calls the backend API which stores it in the search_alerts table.
 */
export async function saveSearchAlert({ userId, location, onesignalPlayerId }) {
    if (!userId || !location || !onesignalPlayerId) {
        console.warn('saveSearchAlert: Missing required fields');
        return null;
    }
    try {
        const response = await fetch('/api/search-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                searched_location: location,
                onesignal_player_id: onesignalPlayerId
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save search alert');
        return data;
    } catch (err) {
        console.warn('saveSearchAlert error:', err.message);
        return null;
    }
}

/**
 * After a vendor creates a listing, trigger the backend to check
 * for matching search alerts and send push notifications.
 */
export async function triggerListingNotifications({ title, city, area, address, listingId }) {
    try {
        const response = await fetch('/api/create-listing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                city,
                area: area || '',
                address: address || '',
                listing_id: listingId || ''
            })
        });
        const data = await response.json();
        if (data.notified > 0) {
            // Success
        }
        return data;
    } catch (err) {
        console.warn('triggerListingNotifications error:', err.message);
        return null;
    }
}


// ── Vendor Settings & Payouts ───────────────────────────────────────

export async function getVendorSettings(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('vendor_settings')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching vendor settings:', error);
        return null;
    }
    
    return data || { 
        id: userId, 
        email_enquiries: true, 
        email_reviews: true, 
        email_promotions: false,
        push_enquiries: true, 
        push_reviews: true, 
        push_promotions: false,
        bank_account_name: '',
        bank_account_number: '',
        bank_ifsc: ''
    };
}

export async function updateVendorSettings(userId, settings) {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('vendor_settings')
        .upsert({ id: userId, ...settings })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getVendorPayouts(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('vendor_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching payouts', error);
        return [];
    }
    return data || [];
}
