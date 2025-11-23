// api/auth-config.js - Authentication configuration
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Password hashing
const SALT_ROUNDS = 12;

async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Generate secure tokens
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Session expiration (30 days)
const SESSION_EXPIRY_DAYS = 30;
function getSessionExpiry() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + SESSION_EXPIRY_DAYS);
    return expiry;
}

// Password strength validation
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!hasNumbers) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password is strong' };
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    getSessionExpiry,
    validatePassword,
    SESSION_EXPIRY_DAYS
};
