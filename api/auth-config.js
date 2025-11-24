// Temporary auth-config without bcryptjs
const crypto = require('crypto');

// Simple password hashing (temporary - replace with bcrypt later)
function simpleHash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function verifySimpleHash(password, hash) {
    return simpleHash(password) === hash;
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
    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    return { valid: true, message: 'Password is acceptable' };
}

module.exports = {
    hashPassword: simpleHash,
    verifyPassword: verifySimpleHash,
    generateToken,
    getSessionExpiry,
    validatePassword,
    SESSION_EXPIRY_DAYS
};
