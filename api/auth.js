import { executeQuery } from './db-config.js';
import { hashPassword, generateToken, validatePassword, verifyPassword } from './auth-config.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    if (req.method === 'POST') {
      switch (action) {
        case 'register':
          return await handleRegister(req, res);
        case 'login':
          return await handleLogin(req, res);
        default:
          return res.status(404).json({ error: 'Auth endpoint not found' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Registration handler - SIMPLIFIED VERSION (users table only)
async function handleRegister(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    // SIMPLIFIED: Create user record only (no clients table)
    const passwordHash = await hashPassword(password);
    const verificationToken = generateToken();

    const userResult = await executeQuery(
      `INSERT INTO users 
       (email, password_hash, name, phone, role, verification_token) 
       VALUES ($1, $2, $3, $4, 'client', $5) 
       RETURNING id, email, name, role, state, created_at`,
      [email.toLowerCase(), passwordHash, name, phone, verificationToken]
    );

    console.log('User registered successfully:', email);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        name: userResult.rows[0].name,
        role: userResult.rows[0].role,
        state: userResult.rows[0].state,
        created_at: userResult.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed: ' + error.message
    });
  }
}

// Login handler
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
    // Find user by email
    const userResult = await executeQuery(
      `SELECT id, email, password_hash, name, role, state, 
              is_locked, failed_login_attempts, last_login
       FROM users 
       WHERE email = $1`,
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

    // Check if account is inactive
    if (user.state === 'inactive') {
      return res.status(423).json({
        success: false,
        error: 'Account is inactive. Please contact support.'
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
        
        return res.status(423).json({
          success: false,
          error: 'Account has been locked due to too many failed login attempts. Please contact support.'
        });
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

    // Generate session token
    const sessionToken = generateToken();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30); // 30 days

    // Store session in sessions table
    await executeQuery(
      `INSERT INTO sessions (user_id, session_token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, sessionToken, sessionExpiry]
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      session: {
        token: sessionToken,
        expires_at: sessionExpiry
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed: ' + error.message
    });
  }
}

// Logout handler (optional - for future use)
async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_token } = req.body;

  if (!session_token) {
    return res.status(400).json({
      success: false,
      error: 'Session token is required'
    });
  }

  try {
    // Delete session from sessions table
    await executeQuery(
      'DELETE FROM sessions WHERE session_token = $1',
      [session_token]
    );

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed: ' + error.message
    });
  }
}

// Password reset request handler (optional - for future use)
async function handlePasswordResetRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  try {
    // Check if user exists
    const userResult = await executeQuery(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal whether email exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.rows[0];
    const resetToken = generateToken();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Store reset token in database
    await executeQuery(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // In a real application, you would send an email here
    console.log('Password reset token for', email, ':', resetToken);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset request failed: ' + error.message
    });
  }
}

// Password reset handler (optional - for future use)
async function handlePasswordReset(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({
      success: false,
      error: 'Token and new password are required'
    });
  }

  // Validate password strength
  const passwordValidation = validatePassword(new_password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      error: passwordValidation.message
    });
  }

  try {
    // Find user by reset token
    const userResult = await executeQuery(
      `SELECT id, reset_token_expiry 
       FROM users 
       WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const user = userResult.rows[0];
    const newPasswordHash = await hashPassword(new_password);

    // Update password and clear reset token
    await executeQuery(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, 
           failed_login_attempts = 0, is_locked = false 
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed: ' + error.message
    });
  }
}
