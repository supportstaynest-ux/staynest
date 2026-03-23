import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

// Middleware imports
import { verifyToken, authorizeRoles } from './middleware/auth.js';
import {
    validateDeleteUser,
    validateUpdateRole,
    validateSuspendUser,
    validateVerificationEmail,
    validateSearchAlert,
    validateCreateListing,
} from './middleware/validate.js';

dotenv.config();

const app = express();

// ══════════════════════════════════════════════════════════════════
// 🛡️  Global Security Middleware
// ══════════════════════════════════════════════════════════════════

// Helmet – Sets secure HTTP headers (CSP, HSTS, X-Frame, etc.)
app.use(helmet({ contentSecurityPolicy: false })); // CSP off for API server

// CORS – Restrict to known frontend origins
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload attacks

// Global Rate Limiter – 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
});
app.use(globalLimiter);

// Stricter rate limit for auth-sensitive routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth requests. Please try again later.' },
});

// ── Resend client ──
const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) console.warn('⚠️  RESEND_API_KEY not set in .env');
const resend = new Resend(RESEND_API_KEY || 're_mock_placeholder');

// ── Supabase client (service role for full DB access) ──
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// ══════════════════════════════════════════════════════════════════
// GET /api/health – Public health check
// ══════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════
// POST /api/search-alert
// 🔒 Protected: Any authenticated user
// Save a user's search when no PGs are found
// ══════════════════════════════════════════════════════════════════
app.post('/api/search-alert', verifyToken, validateSearchAlert, async (req, res) => {
    try {
        const { user_id, searched_location, onesignal_player_id } = req.body;

        // Normalize location to lowercase for case-insensitive matching
        const normalizedLocation = searched_location.trim().toLowerCase();

        // Upsert: update player_id if same user + location already exists
        const { data, error } = await supabase
            .from('search_alerts')
            .upsert({
                user_id,
                location: normalizedLocation,
                onesignal_player_id,
                notified: false,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,location'
            })
            .select();

        if (error) {
            console.error('Error saving search alert:', error.message);
            return res.status(500).json({ error: 'Failed to save search alert.' });
        }

        console.log(`✅ Search alert saved: "${normalizedLocation}" for user ${user_id.slice(0, 8)}...`);
        return res.json({ success: true, data });

    } catch (err) {
        console.error('Search alert error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/create-listing
// 🔒 Protected: Vendor or Admin only
// After vendor creates a listing, check for matching search alerts
// and send OneSignal push notifications
// ══════════════════════════════════════════════════════════════════
app.post('/api/create-listing', verifyToken, authorizeRoles('vendor', 'admin'), validateCreateListing, async (req, res) => {
    try {
        const { title, city, area, address, listing_id } = req.body;

        // Build search terms from listing location fields
        const searchTerms = new Set();
        if (city) searchTerms.add(city.trim().toLowerCase());
        if (area) searchTerms.add(area.trim().toLowerCase());
        if (address) {
            searchTerms.add(address.trim().toLowerCase());
            // Also split address into parts for partial matching
            address.split(/[,\-\/]/).forEach(part => {
                const p = part.trim().toLowerCase();
                if (p.length > 2) searchTerms.add(p);
            });
        }

        console.log(`🔍 Checking search alerts for terms:`, [...searchTerms]);

        // Find ALL un-notified alerts that match any of the location terms
        const { data: matchingAlerts, error: fetchError } = await supabase
            .from('search_alerts')
            .select('*')
            .eq('notified', false)
            .in('location', [...searchTerms]);

        if (fetchError) {
            console.error('Error fetching matching alerts:', fetchError.message);
            return res.status(500).json({ error: 'Failed to check search alerts.' });
        }

        if (!matchingAlerts || matchingAlerts.length === 0) {
            console.log('ℹ️  No matching search alerts found.');
            return res.json({ success: true, notified: 0 });
        }

        // Deduplicate player IDs (one user might have alerts for multiple matching terms)
        const playerIdMap = new Map();
        matchingAlerts.forEach(alert => {
            if (alert.onesignal_player_id && !playerIdMap.has(alert.onesignal_player_id)) {
                playerIdMap.set(alert.onesignal_player_id, alert);
            }
        });

        const uniquePlayerIds = [...playerIdMap.keys()];
        console.log(`📬 Found ${uniquePlayerIds.length} unique users to notify`);

        // Send OneSignal notification
        if (uniquePlayerIds.length > 0 && ONESIGNAL_REST_API_KEY && ONESIGNAL_REST_API_KEY !== 'your_onesignal_rest_api_key_here') {
            try {
                const notificationPayload = {
                    app_id: ONESIGNAL_APP_ID,
                    include_subscription_ids: uniquePlayerIds,
                    headings: { en: '🏠 New PG Available Near You!' },
                    contents: {
                        en: `A new PG "${title || 'New Listing'}" is now available in ${city}${area ? ', ' + area : ''}. Check it out!`
                    },
                    url: listing_id
                        ? `${req.headers.origin || 'https://staynest.com'}/#/pg/${listing_id}`
                        : `${req.headers.origin || 'https://staynest.com'}/#/explore?q=${encodeURIComponent(city)}`,
                    chrome_web_icon: 'https://cdn-icons-png.flaticon.com/512/2544/2544087.png',
                    ttl: 86400 // 24 hours
                };

                const response = await fetch('https://onesignal.com/api/v1/notifications', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
                    },
                    body: JSON.stringify(notificationPayload)
                });

                const result = await response.json();
                if (result.errors) {
                    console.error('OneSignal errors:', result.errors);
                }
            } catch (notifErr) {
                console.error('OneSignal API error:', notifErr.message);
            }
        } else {
            console.log('⚠️  OneSignal REST API key not configured, skipping push notification.');
        }

        // Mark matching alerts as notified
        const alertIds = matchingAlerts.map(a => a.id);
        const { error: updateError } = await supabase
            .from('search_alerts')
            .update({ notified: true })
            .in('id', alertIds);

        if (updateError) {
            console.error('Error marking alerts as notified:', updateError.message);
        }

        console.log(`✅ Notified ${uniquePlayerIds.length} users, marked ${alertIds.length} alerts as complete`);
        return res.json({ success: true, notified: uniquePlayerIds.length });

    } catch (err) {
        console.error('Create listing notification error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/cleanup-alerts
// 🔒 Protected: Admin only
// Cleanup endpoint: Delete alerts older than 30 days
// ══════════════════════════════════════════════════════════════════
app.post('/api/cleanup-alerts', verifyToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('search_alerts')
            .delete()
            .lt('created_at', thirtyDaysAgo)
            .select('id');

        if (error) {
            console.error('Cleanup error:', error.message);
            return res.status(500).json({ error: 'Cleanup failed.' });
        }

        const count = data ? data.length : 0;
        console.log(`🧹 Cleaned up ${count} expired search alerts`);
        return res.json({ success: true, deleted: count });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/send-verification-email
// 🔒 Rate-limited (no auth needed – user hasn't verified yet)
// Send verification email via Resend
// ══════════════════════════════════════════════════════════════════
app.post('/api/send-verification-email', authLimiter, validateVerificationEmail, async (req, res) => {
    try {
        const { email, origin } = req.body;

        // 1. Generate a secure backend token
        const newToken = crypto.randomUUID();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

        // 2. Save the token to the database profile corresponding to this email
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                verification_token: newToken,
                verification_token_expires_at: expiry,
            })
            .eq('email', email);

        if (updateError) {
            console.error('Error saving verification token:', updateError.message);
            return res.status(500).json({ error: 'Failed to generate secure verification.' });
        }

        const verifyLink = `${origin || 'https://staynest.vercel.app'}/#/verify-email?token=${newToken}`;

        console.log(`📧 Sending verification email to: ${email}`);

        const { data, error } = await resend.emails.send({
            from: 'StayNest <onboarding@resend.dev>',
            to: email,
            subject: 'Verify your StayNest account',
            html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2BB3C0; font-size: 28px; font-weight: 800; margin: 0;">StayNest</h1>
                        <p style="color: #64748b; font-size: 16px; margin-top: 5px;">Your perfect PG stay awaits</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; text-align: center;">
                        <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Verify your email address</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            Thanks for signing up for StayNest! Please click the button below to verify your email address and complete your registration.
                        </p>
                        <a href="${verifyLink}" style="display: inline-block; background-color: #2BB3C0; color: white; font-weight: 700; font-size: 16px; padding: 14px 30px; border-radius: 8px; text-decoration: none; transition: background-color 0.2s;">
                            Verify Email Address
                        </a>
                        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                            Or copy and paste this link in your browser:<br>
                            <a href="${verifyLink}" style="color: #2BB3C0; text-decoration: underline;">${verifyLink}</a>
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} StayNest. All rights reserved.</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend API error:', error.message);
            return res.status(500).json({ error: 'Failed to send verification email.' });
        }

        console.log('✅ Verification email sent successfully.');
        return res.json({ success: true });

    } catch (err) {
        console.error('❌ Verification email error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/verify-email
// 🔒 Public (user clicks link in email)
// Verifies the user's email token
// ══════════════════════════════════════════════════════════════════
app.get('/api/verify-email', async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Token is required' });
        }

        console.log(`🔍 Verifying email token...`);

        // Check if token matches and is not expired
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('verification_token', token)
            .gt('verification_token_expires_at', new Date().toISOString())
            .single();

        if (fetchError || !profile) {
            console.warn('⚠️ Invalid or expired verification link for token:', token);
            return res.status(400).json({ success: false, error: 'Invalid or expired verification link' });
        }

        // Token is valid, update user profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                is_verified: true,
                verification_token: null,          // Single-use token
                verification_token_expires_at: null
            })
            .eq('id', profile.id);

        if (updateError) {
            console.error('❌ Error updating profile during verification:', updateError.message);
            return res.status(500).json({ success: false, error: 'Failed to complete verification' });
        }

        console.log(`✅ User ${profile.id.slice(0, 8)} email verified successfully.`);
        return res.json({ success: true });

    } catch (err) {
        console.error('❌ Verify email API error:', err.message);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// GET /test-email
// 🔒 Protected: Admin only (test endpoint)
// Simple test endpoint to verify Resend independently
// ══════════════════════════════════════════════════════════════════
app.get('/test-email', verifyToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const testEmail = req.query.email || 'delivered@resend.dev';
        console.log(`🧪 Sending test email to: ${testEmail}`);
        
        const { data, error } = await resend.emails.send({
            from: 'StayNest <onboarding@resend.dev>',
            to: testEmail,
            subject: 'StayNest Test Email',
            html: '<p>If you are reading this, <strong>Resend is working correctly!</strong> 🚀</p>'
        });

        if (error) {
            console.error('❌ Test email failed:', error.message);
            return res.status(500).json({ error: 'Test email failed.' });
        }

        console.log('✅ Test email successful');
        return res.json({ success: true });
    } catch (err) {
        console.error('❌ Test email error:', err.message);
        return res.status(500).json({ error: 'Test email failed.' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/delete-user
// 🔒 Protected: Admin only
// Permanently delete a user from both Auth and Profiles table
// ══════════════════════════════════════════════════════════════════
app.post('/api/delete-user', verifyToken, authorizeRoles('admin'), validateDeleteUser, async (req, res) => {
    try {
        const { userId } = req.body;

        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }

        console.log(`🗑️  Admin ${req.user.id.slice(0, 8)} deleting user: ${userId.slice(0, 8)}...`);

        // ── Step 1: Delete from Supabase Auth FIRST ──
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('❌ Auth deletion error:', authError.message);
            if (authError.status !== 404 && !authError.message?.includes('not found')) {
                return res.status(500).json({ error: 'Failed to delete auth user.' });
            }
            console.log('⚠️  Auth user not found, continuing with data cleanup...');
        } else {
            console.log('✅ Auth user deleted');
        }

        // ── Step 2: Clean up all related data ──
        const cleanupTables = [
            { table: 'notifications', column: 'user_id' },
            { table: 'dismissed_messages', column: 'user_id' },
            { table: 'saved_listings', column: 'user_id' },
            { table: 'recently_viewed', column: 'user_id' },
            { table: 'search_alerts', column: 'user_id' },
            { table: 'enquiries', column: 'user_id' },
            { table: 'reviews', column: 'user_id' },
        ];

        for (const { table, column } of cleanupTables) {
            try {
                await supabase.from(table).delete().eq(column, userId);
            } catch (e) {
                console.warn(`⚠️  Cleanup of ${table} failed (non-fatal):`, e.message);
            }
        }

        // Vendor-specific data cleanup
        try {
            await supabase.from('listings').update({ status: 'deleted' }).eq('vendor_id', userId);
            await supabase.from('payment_requests').delete().eq('vendor_id', userId);
            await supabase.from('enquiries').delete().eq('vendor_id', userId);
        } catch (e) {
            console.warn('⚠️  Vendor data cleanup failed (non-fatal):', e.message);
        }

        console.log('✅ Related data cleaned up');

        // ── Step 3: Delete the profile row LAST ──
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('❌ Profile deletion error:', profileError.message);
        } else {
            console.log('✅ Profile deleted');
        }

        console.log(`✅ User ${userId.slice(0, 8)}... deleted successfully by admin ${req.user.id.slice(0, 8)}`);
        return res.json({ success: true, message: 'User deleted successfully' });

    } catch (err) {
        console.error('❌ Delete user error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/update-user-role
// 🔒 Protected: Admin only
// Update user role bypassing client-side constraints
// ══════════════════════════════════════════════════════════════════
app.post('/api/update-user-role', verifyToken, authorizeRoles('admin'), validateUpdateRole, async (req, res) => {
    try {
        const { userId, role } = req.body;

        console.log(`🎭 Admin ${req.user.id.slice(0, 8)} updating role for ${userId.slice(0, 8)} to: ${role}`);

        const { error } = await supabase
            .from('profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            console.error('❌ Role update error:', error.message);
            return res.status(500).json({ error: 'Failed to update role.' });
        }

        return res.json({ success: true, message: `User role updated to ${role}` });

    } catch (err) {
        console.error('❌ Role update API error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/suspend-user
// 🔒 Protected: Admin only
// Suspend a user by setting a flag in the database
// ══════════════════════════════════════════════════════════════════
app.post('/api/suspend-user', verifyToken, authorizeRoles('admin'), validateSuspendUser, async (req, res) => {
    try {
        const { userId, suspend } = req.body;

        // Prevent admin from suspending themselves
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot suspend your own account.' });
        }

        console.log(`🔒 Admin ${req.user.id.slice(0, 8)} ${suspend ? 'suspending' : 'reactivating'} user: ${userId.slice(0, 8)}...`);

        const { error } = await supabase
            .from('profiles')
            .update({ is_suspended: suspend })
            .eq('id', userId);

        if (error) {
            console.error('❌ Suspension error:', error.message);
            return res.status(500).json({ error: 'Failed to update suspension status.' });
        }

        return res.json({ success: true, message: `User ${suspend ? 'suspended' : 'reactivated'} successfully` });

    } catch (err) {
        console.error('❌ Suspend API error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/verify-stay
// 🔒 Protected: Authenticated user
// Verifies a user's Stay Code to unlock SOS features
// ══════════════════════════════════════════════════════════════════
app.post('/api/verify-stay', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { stay_code } = req.body;

        if (!stay_code || stay_code.trim().length < 4) {
            return res.status(400).json({ error: 'A valid Stay Code is required (minimum 4 characters).' });
        }

        const normalizedCode = stay_code.trim().toUpperCase();

        // Find a listing that has this stay code
        const { data: listing, error: listingErr } = await supabase
            .from('listings')
            .select('id, name, vendor_id')
            .eq('stay_code', normalizedCode)
            .single();

        if (listingErr || !listing) {
            return res.status(404).json({ error: 'Invalid Stay Code. Please check with your property owner.' });
        }

        // Mark user as verified resident
        const { error: updateErr } = await supabase
            .from('profiles')
            .update({
                is_resident_verified: true,
                stay_code: normalizedCode,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateErr) throw updateErr;

        console.log(`✅ User ${userId.slice(0, 8)} verified stay at listing: ${listing.name}`);
        return res.json({ success: true, listing_name: listing.name });

    } catch (err) {
        console.error('❌ verify-stay error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/request-owner-approval
// 🔒 Protected: Authenticated user
// Sends approval request email to the PG vendor
// ══════════════════════════════════════════════════════════════════
app.post('/api/request-owner-approval', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { listing_id } = req.body;

        if (!listing_id) return res.status(400).json({ error: 'listing_id is required.' });

        // Fetch user and listing info
        const [{ data: profile }, { data: listing }] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('id', userId).single(),
            supabase.from('listings').select('name, vendor_id, profiles!vendor_id(full_name, email)').eq('id', listing_id).single()
        ]);

        if (!profile || !listing) return res.status(404).json({ error: 'User or Listing not found.' });

        const vendorEmail = listing.profiles?.email;
        const vendorName = listing.profiles?.full_name || 'Property Owner';
        if (!vendorEmail) return res.status(404).json({ error: 'Owner email not found.' });

        await resend.emails.send({
            from: 'StayNest Safety <onboarding@resend.dev>',
            to: vendorEmail,
            subject: `[StayNest] Resident Approval Request from ${profile.full_name}`,
            html: `
                <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #2BB3C0; margin: 0 0 8px;">StayNest — Resident Approval Request</h2>
                    <p style="color: #475569;">Hello <strong>${vendorName}</strong>,</p>
                    <p style="color: #475569;"><strong>${profile.full_name}</strong> (${profile.email}) has requested approval to be verified as a resident at <strong>${listing.name}</strong>.</p>
                    <p style="color: #475569;">This verification will allow them to access the <span style="color: #EF4444; font-weight: bold;">Emergency SOS Safety Feature</span> on the StayNest platform.</p>
                    <p style="color: #475569;">If this person is a tenant at your property, please log into your StayNest vendor dashboard and approve this request, or reply to confirm.</p>
                    <br/>
                    <p style="color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} StayNest. All rights reserved.</p>
                </div>`
        });

        console.log(`📧 Owner approval request sent to ${vendorEmail} for listing: ${listing.name}`);
        return res.json({ success: true });

    } catch (err) {
        console.error('❌ request-owner-approval error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/trigger-sos
// 🔒 Protected: Authenticated user
// Dispatches emergency SOS alerts
// ══════════════════════════════════════════════════════════════════
app.post('/api/trigger-sos', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'personal', location, location_url } = req.body; // type: 'emergency' | 'personal'
        const triggeredAt = new Date().toISOString();

        // Fetch user profile + emergency contacts
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('full_name, email, emergency_contacts, is_resident_verified')
            .eq('id', userId)
            .single();

        if (profileErr || !profile) return res.status(404).json({ error: 'User profile not found.' });

        // For emergency SOS, MUST be verified resident
        if (type === 'emergency' && !profile.is_resident_verified) {
            return res.status(403).json({ error: 'Emergency SOS is only available for verified residents.' });
        }

        const emergencyContacts = Array.isArray(profile.emergency_contacts) ? profile.emergency_contacts : [];
        const locationText = location || 'Location not shared';
        const locationLink = location_url ? `<a href="${location_url}" style="color: #2BB3C0;">View on Google Maps</a>` : '';
        const isEmergency = type === 'emergency';

        const emailHtml = `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid ${isEmergency ? '#EF4444' : '#F59E0B'}; border-radius: 12px;">
                <div style="background: ${isEmergency ? '#EF4444' : '#F59E0B'}; border-radius: 8px; padding: 16px 24px; margin-bottom: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ ${isEmergency ? 'EMERGENCY SOS ALERT' : 'Personal Safety Alert'}</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Sent via StayNest Safety System</p>
                </div>
                <p style="color: #1e293b; font-size: 16px;"><strong>${profile.full_name}</strong> has triggered a ${isEmergency ? 'EMERGENCY' : 'Personal'} SOS alert.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                    <tr><td style="padding: 10px 16px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Name</td><td style="padding: 10px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${profile.full_name}</td></tr>
                    <tr><td style="padding: 10px 16px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Email</td><td style="padding: 10px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${profile.email}</td></tr>
                    <tr><td style="padding: 10px 16px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Time</td><td style="padding: 10px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${new Date(triggeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
                    <tr><td style="padding: 10px 16px; color: #64748b; font-weight: 600;">Location</td><td style="padding: 10px 16px; color: #1e293b;">${locationText} ${locationLink}</td></tr>
                </table>
                ${isEmergency ? `<p style="color: #EF4444; font-weight: 700; font-size: 14px;">⚠️ Please attempt to contact this person IMMEDIATELY or notify local authorities if unreachable.</p>` : ''}
                <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">© ${new Date().getFullYear()} StayNest Safety System. This is an automated safety alert.</p>
            </div>`;

        const recipients = [];

        // 1. Send to personal emergency contacts
        if (emergencyContacts.length > 0) {
            const contactEmails = emergencyContacts.filter(c => c.email).map(c => c.email);
            if (contactEmails.length > 0) {
                await resend.emails.send({
                    from: 'StayNest Safety <onboarding@resend.dev>',
                    to: contactEmails,
                    subject: `🚨 [${isEmergency ? 'EMERGENCY' : 'Safety'} ALERT] ${profile.full_name} needs help!`,
                    html: emailHtml
                });
                recipients.push(...contactEmails);
            }
        }

        // 2. For Emergency SOS — also alert admin
        if (isEmergency) {
            const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin');
            const adminEmails = (admins || []).map(a => a.email).filter(Boolean);
            if (adminEmails.length > 0) {
                await resend.emails.send({
                    from: 'StayNest Safety <onboarding@resend.dev>',
                    to: adminEmails,
                    subject: `🔴 [ADMIN EMERGENCY ALERT] User SOS — ${profile.full_name}`,
                    html: emailHtml
                });
                recipients.push(...adminEmails);
            }
        }

        // 3. Log SOS event to DB (optional: create sos_logs table later)
        console.log(`🚨 SOS [${type.toUpperCase()}] triggered by ${profile.full_name} at ${triggeredAt}. Alerts sent to: ${recipients.join(', ') || 'no contacts saved'}`);

        return res.json({ success: true, alerts_sent: recipients.length });

    } catch (err) {
        console.error('❌ trigger-sos error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════════════════════════════
// 404 Handler
// ══════════════════════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// ══════════════════════════════════════════════════════════════════
// Global Error Handler – Never leak stack traces in production
// ══════════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

// ── Start server ──
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 StayNest Secure Server running on port ${PORT}`);
    console.log(`   🛡️  Helmet: ✅ Enabled`);
    console.log(`   🛡️  Rate Limiting: ✅ 100 req/15min global, 20 req/15min auth`);
    console.log(`   🛡️  CORS Origins: ${allowedOrigins.join(', ')}`);
    console.log(`   🛡️  Auth Middleware: ✅ All sensitive routes protected`);
    console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`   Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '⚠️  Missing'}`);
    console.log(`   OneSignal: ${ONESIGNAL_REST_API_KEY && ONESIGNAL_REST_API_KEY !== 'your_onesignal_rest_api_key_here' ? '✅ Configured' : '⚠️  Not set'}\n`);
});
