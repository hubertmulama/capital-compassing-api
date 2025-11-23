const { executeQuery } = require('../db-config.js');
const { hashPassword, generateToken, validatePassword } = require('../auth-config.js');

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
        const { email, password, name, phone } = req.body;

        console.log('Registration attempt for:', email);

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                error: passwordValidation.message
            });
        }

        // Check if user already exists
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Start transaction
        const client = await require('../db-config.js').getConnection();

        try {
            await client.query('BEGIN');

            // 1. Create client record
            const clientResult = await client.query(
                `INSERT INTO clients (name, email, phone, state) 
                 VALUES ($1, $2, $3, 'active') 
                 RETURNING id`,
                [name, email.toLowerCase(), phone]
            );

            const clientId = clientResult.rows[0].id;

            // 2. Create user account
            const passwordHash = await hashPassword(password);
            const verificationToken = generateToken();

            const userResult = await client.query(
                `INSERT INTO users 
                 (email, password_hash, role, client_id, verification_token) 
                 VALUES ($1, $2, 'client', $3, $4) 
                 RETURNING id, email, role, client_id`,
                [email.toLowerCase(), passwordHash, clientId, verificationToken]
            );

            // 3. Update client with user_id
            await client.query(
                'UPDATE clients SET user_id = $1 WHERE id = $2',
                [userResult.rows[0].id, clientId]
            );

            await client.query('COMMIT');

            console.log('User registered successfully:', email);

            res.status(201).json({
                success: true,
                message: 'Registration successful. Please check your email for verification.',
                user: {
                    id: userResult.rows[0].id,
                    email: userResult.rows[0].email,
                    role: userResult.rows[0].role,
                    client_id: userResult.rows[0].client_id
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
};
