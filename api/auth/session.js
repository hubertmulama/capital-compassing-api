const { executeQuery } = require('../db-config.js');

async function verifySession(sessionToken) {
    try {
        // Clean up expired sessions first
        await executeQuery(
            'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
        );

        // Verify session
        const sessionResult = await executeQuery(
            `SELECT s.*, u.role, u.client_id, c.name as client_name 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             LEFT JOIN clients c ON u.client_id = c.id 
             WHERE s.session_token = $1 AND u.state = 'active'`,
            [sessionToken]
        );

        if (sessionResult.rows.length === 0) {
            return { valid: false, error: 'Invalid or expired session' };
        }

        const session = sessionResult.rows[0];
        return {
            valid: true,
            user: {
                id: session.user_id,
                email: session.email,
                role: session.role,
                client_id: session.client_id,
                name: session.client_name || 'Admin User'
            }
        };
    } catch (error) {
        console.error('Session verification error:', error);
        return { valid: false, error: 'Session verification failed' };
    }
}

module.exports = { verifySession };
