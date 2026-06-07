const express = require('express');
const { Pool } = require('pg'); // Swapped sqlite3 out for the permanent Postgres client
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer'); 

const app = express();
app.use(express.json());

// Connect securely to your persistent Supabase Database Cloud via the Transaction Pooler
const pool = new Pool({
  connectionString: "postgresql://postgres.aljlksrpeckvdhqofoqm:Ayo%2A214s%40mine@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  ssl: { rejectUnauthorized: false }
});

// ========================================================
// REAL GMAIL SMTP CONFIGURATION
// ========================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rtxvolkswagen@gmail.com', 
    pass: 'afwaqjlrzfogmdvy'     
  }
});

function sendEmail(to, subject, html) {
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
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`;
    
    await pool.query(query, [username, email, hashedPassword]);
    return res.status(201).json({ message: 'User registered successfully!' });
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
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const query = `SELECT * FROM users WHERE username = $1 OR email = $1`;
    const result = await pool.query(query, [identifier]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: 'Invalid username/email or password.' });

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
      return res.status(200).json({ message: 'Login successful (Fallback code generated).', email: user.email, username: user.username });
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
    const result = await pool.query(`SELECT username, email FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    return res.status(200).json({ username: user.username, email: user.email });
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
      return res.status(200).json({ message: 'Code processed (Fallback code generated).' });
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
      return res.status(200).json({ message: 'New code generated (Fallback code generated).' });
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

module.exports = app;