const { executeQuery } = require('./db-config.js');
const { hashPassword, verifyPassword, generateToken, getSessionExpiry, validatePassword } = require('./auth-config.js');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'register':
        return await handleRegister(req, res);
      case 'login':
        return await handleLogin(req, res);
      case 'verify-session':
        return await handleVerifySession(req, res);
      default:
        return res.status(404).json({ error: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Registration handler
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

  // Start transaction
  const client = await require('./db-config.js').getConnection();

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
      message: 'Registration successful.',
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
}

// Login handler
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}

// Session verification handler
async function handleVerifySession(req, res) {
  const { sessionToken } = req.body;

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
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired session' 
      });
    }

    const session = sessionResult.rows[0];
    res.json({
      success: true,
      user: {
        id: session.user_id,
        email: session.email,
        role: session.role,
        client_id: session.client_id,
        name: session.client_name || 'Admin User'
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Session verification failed' 
    });
  }
}
