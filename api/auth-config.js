// auth-config.js - Complete authentication utilities
import crypto from 'crypto';

// Simple password hashing (temporary - replace with bcrypt later)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password against hash
function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
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
    const requirements = [];
    
    if (password.length < minLength) {
        requirements.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        requirements.push('one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        requirements.push('one lowercase letter');
    }
    if (!/\d/.test(password)) {
        requirements.push('one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        requirements.push('one special character');
    }

    if (requirements.length > 0) {
        return { 
            valid: false, 
            message: 'Password must contain: ' + requirements.join(', ') 
        };
    }
    
    return { valid: true, message: 'Password is strong' };
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Generate verification token
function generateVerificationToken() {
    return generateToken(64);
}

// Generate password reset token
function generateResetToken() {
    return generateToken(64);
}

// Check if token is expired
function isTokenExpired(expiryDate) {
    return new Date() > new Date(expiryDate);
}

// Sanitize user input (basic XSS protection)
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Generate session ID
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

// Calculate password strength score (0-100)
function calculatePasswordStrength(password) {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    
    // Bonus for mixed case and numbers
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 5;
    if (/\d/.test(password) && /[A-Za-z]/.test(password)) score += 5;
    
    return Math.min(score, 100);
}

// Get password strength category
function getPasswordStrengthCategory(password) {
    const score = calculatePasswordStrength(password);
    
    if (score >= 80) return 'strong';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'weak';
}

// Export all functions
export {
    hashPassword,
    verifyPassword,
    generateToken,
    getSessionExpiry,
    validatePassword,
    validateEmail,
    generateVerificationToken,
    generateResetToken,
    isTokenExpired,
    sanitizeInput,
    generateSessionId,
    calculatePasswordStrength,
    getPasswordStrengthCategory,
    SESSION_EXPIRY_DAYS
};
