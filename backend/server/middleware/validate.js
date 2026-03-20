import validator from 'validator';

// ══════════════════════════════════════════════════════════════════
// Input Validation & Sanitization Middleware
// Prevents SQL injection, XSS, and malformed data from reaching
// business logic. Uses the 'validator' library.
// ══════════════════════════════════════════════════════════════════

/**
 * Validates that a field is a proper email format.
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return validator.isEmail(email.trim());
}

/**
 * Validates that a field is a proper UUID v4.
 */
export function isValidUUID(id) {
    if (!id || typeof id !== 'string') return false;
    return validator.isUUID(id, 4);
}

/**
 * Validates that a role is one of the allowed values.
 */
export function isValidRole(role) {
    const ALLOWED_ROLES = ['user', 'vendor', 'admin'];
    return ALLOWED_ROLES.includes(role);
}

/**
 * Sanitizes a string to prevent XSS.
 * Escapes HTML characters like <, >, &, ', " and /
 */
export function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return validator.escape(str.trim());
}

/**
 * Validates password strength.
 */
export function isStrongPassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 8;
}

// ══════════════════════════════════════════════════════════════════
// Route-specific validation middleware
// ══════════════════════════════════════════════════════════════════

/**
 * Validates /api/delete-user request body
 */
export function validateDeleteUser(req, res, next) {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    if (!isValidUUID(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format. Must be a valid UUID.' });
    }

    // Sanitize: store cleaned value
    req.body.userId = validator.trim(userId);
    next();
}

/**
 * Validates /api/update-user-role request body
 */
export function validateUpdateRole(req, res, next) {
    const { userId, role } = req.body;

    if (!userId || !role) {
        return res.status(400).json({ error: 'User ID and role are required.' });
    }
    if (!isValidUUID(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format.' });
    }
    if (!isValidRole(role)) {
        return res.status(400).json({ error: 'Invalid role. Allowed: user, vendor, admin.' });
    }

    req.body.userId = validator.trim(userId);
    req.body.role = validator.trim(role);
    next();
}

/**
 * Validates /api/suspend-user request body
 */
export function validateSuspendUser(req, res, next) {
    const { userId, suspend } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    if (!isValidUUID(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format.' });
    }
    if (typeof suspend !== 'boolean') {
        return res.status(400).json({ error: 'Suspend must be a boolean value.' });
    }

    req.body.userId = validator.trim(userId);
    next();
}

/**
 * Validates /api/send-verification-email request body
 */
export function validateVerificationEmail(req, res, next) {
    const { email, token } = req.body;

    if (!email || !token) {
        return res.status(400).json({ error: 'Email and token are required.' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    req.body.email = validator.normalizeEmail(email) || email.trim().toLowerCase();
    req.body.token = validator.trim(token);
    next();
}

/**
 * Validates /api/search-alert request body
 */
export function validateSearchAlert(req, res, next) {
    const { user_id, searched_location, onesignal_player_id } = req.body;

    if (!user_id || !searched_location || !onesignal_player_id) {
        return res.status(400).json({
            error: 'Missing required fields: user_id, searched_location, onesignal_player_id'
        });
    }
    if (!isValidUUID(user_id)) {
        return res.status(400).json({ error: 'Invalid user_id format.' });
    }
    if (typeof searched_location !== 'string' || searched_location.trim().length < 1) {
        return res.status(400).json({ error: 'searched_location must be a non-empty string.' });
    }

    req.body.user_id = validator.trim(user_id);
    req.body.searched_location = sanitizeString(searched_location);
    req.body.onesignal_player_id = validator.trim(onesignal_player_id);
    next();
}

/**
 * Validates /api/create-listing notification request body
 */
export function validateCreateListing(req, res, next) {
    const { city } = req.body;

    if (!city || typeof city !== 'string' || city.trim().length < 1) {
        return res.status(400).json({ error: 'City is required.' });
    }

    // Sanitize all string fields
    if (req.body.title) req.body.title = sanitizeString(req.body.title);
    if (req.body.city) req.body.city = sanitizeString(req.body.city);
    if (req.body.area) req.body.area = sanitizeString(req.body.area);
    if (req.body.address) req.body.address = sanitizeString(req.body.address);
    next();
}

/**
 * Strips sensitive fields from any object before returning in responses.
 */
export function stripSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const SENSITIVE_KEYS = ['password', 'password_hash', 'service_role_key', 'secret', 'token', 'access_token', 'refresh_token'];

    if (Array.isArray(obj)) {
        return obj.map(item => stripSensitiveFields(item));
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) continue;
        clean[key] = typeof value === 'object' ? stripSensitiveFields(value) : value;
    }
    return clean;
}
