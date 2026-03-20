import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Service-role client for admin operations (profile lookups etc.)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ══════════════════════════════════════════════════════════════════
// verifyToken – Validates the Supabase access token from the
// Authorization header and attaches the user + profile to req.user
// ══════════════════════════════════════════════════════════════════
export async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token || token.length < 10) {
            return res.status(401).json({
                error: 'Access denied. Invalid token format.'
            });
        }

        // Verify the token against Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid or expired token. Please login again.'
            });
        }

        // Fetch the user's profile to get their role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, is_verified, is_suspended')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({
                error: 'User profile not found.'
            });
        }

        // Block suspended users
        if (profile.is_suspended) {
            return res.status(403).json({
                error: 'Your account has been suspended. Contact support.'
            });
        }

        // Attach sanitized user data to the request
        req.user = {
            id: profile.id,
            email: profile.email,
            name: profile.full_name,
            role: profile.role,
            isVerified: profile.is_verified
        };

        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        return res.status(500).json({ error: 'Authentication service unavailable.' });
    }
}

// ══════════════════════════════════════════════════════════════════
// authorizeRoles – Restricts access to users with specific roles
// Usage: authorizeRoles('admin') or authorizeRoles('admin', 'vendor')
// ══════════════════════════════════════════════════════════════════
export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                error: 'Access denied. Role information missing.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`
            });
        }

        next();
    };
}

// ══════════════════════════════════════════════════════════════════
// checkOwnership – Ensures the authenticated user owns the resource
// Usage: checkOwnership('listings', 'listingId', 'vendor_id')
//   - resourceTable: Supabase table name
//   - paramName: req.body key that holds the resource ID
//   - ownerColumn: column that stores the owner's user ID
// ══════════════════════════════════════════════════════════════════
export function checkOwnership(resourceTable, paramName, ownerColumn = 'vendor_id') {
    return async (req, res, next) => {
        try {
            const resourceId = req.body[paramName] || req.params[paramName];

            if (!resourceId) {
                return res.status(400).json({ error: `Missing ${paramName}.` });
            }

            // Admins bypass ownership checks
            if (req.user.role === 'admin') {
                return next();
            }

            const { data, error } = await supabase
                .from(resourceTable)
                .select(ownerColumn)
                .eq('id', resourceId)
                .single();

            if (error || !data) {
                return res.status(404).json({ error: 'Resource not found.' });
            }

            if (data[ownerColumn] !== req.user.id) {
                return res.status(403).json({
                    error: 'Access denied. You can only modify your own resources.'
                });
            }

            next();
        } catch (err) {
            console.error('Ownership check error:', err.message);
            return res.status(500).json({ error: 'Ownership verification failed.' });
        }
    };
}
