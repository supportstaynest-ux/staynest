import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGINS);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.options("*", (req, res) => res.sendStatus(200));

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
        const { email, token, origin } = req.body;

        const verifyLink = `${origin || 'https://staynest.vercel.app'}/#/verify-email?token=${token}`;

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
