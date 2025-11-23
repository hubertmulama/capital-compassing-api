const { executeQuery } = require('../db-config.js');
const { verifyPassword, generateToken, getSessionExpiry } = require('../auth-config.js');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        console.log('Login attempt for:', email);

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user
        const userResult = await executeQuery(
            `SELECT u.*, c.name as client_name, c.state as client_state 
             FROM users u 
             LEFT JOIN clients c ON u.client_id = c.id 
             WHERE u.email = $1`,
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const user = userResult.rows[0];

        // Check if account is locked
        if (user.is_locked) {
            return res.status(423).json({
                success: false,
                error: 'Account is locked. Please contact support.'
            });
        }

        // Check if user is active
        if (user.state !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Account is inactive. Please contact support.'
            });
        }

        // Check if client is active (for client users)
        if (user.role === 'client' && user.client_state !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Client account is inactive. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password_hash);

        if (!isPasswordValid) {
            // Increment failed login attempts
            await executeQuery(
                'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
                [user.id]
            );

            // Lock account after 5 failed attempts
            if (user.failed_login_attempts + 1 >= 5) {
                await executeQuery(
                    'UPDATE users SET is_locked = true WHERE id = $1',
                    [user.id]
                );
            }

            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Reset failed login attempts on successful login
        await executeQuery(
            'UPDATE users SET failed_login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Create session
        const sessionToken = generateToken(64);
        const expiresAt = getSessionExpiry();

        await executeQuery(
            `INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent) 
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, sessionToken, expiresAt, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.headers['user-agent']]
        );

        console.log('User logged in successfully:', email, 'Role:', user.role);

        // Return user data (excluding sensitive information)
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.client_name || 'Admin User',
                client_id: user.client_id
            },
            session: {
                token: sessionToken,
                expires_at: expiresAt
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
};
