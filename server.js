const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer'); 

const app = express();
const PORT = 3000;

const db = new sqlite3.Database('./database.sqlite');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========================================================
// REAL GMAIL SMTP CONFIGURATION
// ========================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rtxvolkswagen@gmail.com', // <-- Put your Gmail address here
    pass: 'afwaqjlrzfogmdvy'     // <-- Paste your app password code here
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

function saveVerificationCode(email, code, callback) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  db.run(
    `INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)`,
    [email, code, expiresAt.toISOString()],
    callback
  );
}

// ==========================================
// 1. REGISTER ROUTE (Create a New Account)
// ==========================================
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    
    db.run(query, [username, email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username or Email already exists.' });
        }
        return res.status(500).json({ error: 'Database error occurred.' });
      }
      return res.status(201).json({ message: 'User registered successfully!' });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error processing password.' });
  }
});

// ==========================================
// 2. LOGIN ROUTE (Check credentials & send 2FA)
// ==========================================
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const query = `SELECT * FROM users WHERE username = ? OR email = ?`;

  db.get(query, [identifier, identifier], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(400).json({ error: 'Invalid username/email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid username/email or password.' });

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    saveVerificationCode(user.email, verificationCode, async (codeErr) => {
      if (codeErr) return res.status(500).json({ error: 'Failed to generate verification code.' });

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
        console.log(`[Email Sent] Live 2FA code delivered to: ${user.email}`);
        return res.status(200).json({ message: 'Code sent to email.', email: user.email, username: user.username });
      } catch (emailError) {
        console.error('SMTP Email Error:', emailError.message);
        console.log(`TERMINAL FALLBACK CODE: ${verificationCode}`);
        return res.status(200).json({ message: 'Login successful (Terminal fallback used).', email: user.email, username: user.username });
      }
    });
  });
});

// ==========================================
// 3. VERIFY ROUTE (Validate the 2FA 4-digit code)
// ==========================================
app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) return res.status(400).json({ error: 'Missing information.' });

  db.get(`SELECT * FROM verification_codes WHERE email = ? AND code = ? ORDER BY id DESC LIMIT 1`, 
  [email, code], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!row) return res.status(400).json({ error: 'Invalid code.' });

    if (new Date() > new Date(row.expires_at)) return res.status(400).json({ error: 'Code expired.' });

    db.run(`DELETE FROM verification_codes WHERE email = ?`, [email]);
    return res.status(200).json({ message: 'Code verified successfully!' });
  });
});

// ========================================================
// PROFILE ROUTE (Fetch stored username/email from database)
// ========================================================
app.get('/api/profile', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  db.get(`SELECT username, email FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    return res.status(200).json({ username: user.username, email: user.email });
  });
});

// ========================================================
// 4. FORGOT PASSWORD ROUTE (Generate recovery code)
// ========================================================
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required.' });

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'No account found with that email.' });

    const recoveryCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    db.run(`INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)`, 
    [email, recoveryCode, expiresAt.toISOString()], async (codeErr) => {
      if (codeErr) return res.status(500).json({ error: 'Token storage failed.' });

      const resetLink = `http://localhost:${PORT}/reset-password.html?email=${encodeURIComponent(email)}&code=${encodeURIComponent(recoveryCode)}`;
      const mailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #dc3545; text-align: center;">Password Reset Request</h2>
          <p>Click the button below to open the password reset page and enter your new password.</p>
          <a href="${resetLink}" style="display:inline-block;margin:20px auto;padding:12px 18px;background:#dc3545;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
          <p style="margin-top:20px;">If the link does not work, enter this recovery code manually:</p>
          <div style="background-color: #f4f6f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
            ${recoveryCode}
          </div>
        </div>
      `;

      try {
        await sendEmail(email, 'Password Reset Recovery Code', mailHtml);
        console.log(`[Recovery Email Sent] Code delivered to: ${email}`);
        return res.status(200).json({ message: 'Recovery code emailed.' });
      } catch (emailError) {
        console.error('SMTP Error:', emailError.message);
        console.log(`FALLBACK PASSWORD CODE: ${recoveryCode}`);
        return res.status(200).json({ message: 'Code processed (Fallback console print).' });
      }
    });
  });
});

// ==========================================
// 6. RESEND VERIFICATION CODE ROUTE
// ==========================================
app.post('/api/resend-code', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'Email not found.' });

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    saveVerificationCode(email, verificationCode, async (codeErr) => {
      if (codeErr) return res.status(500).json({ error: 'Failed to generate verification code.' });

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
        console.log(`[Resend Email Sent] Code delivered to: ${email}`);
        return res.status(200).json({ message: 'Verification code resent.' });
      } catch (emailError) {
        console.error('SMTP Error:', emailError.message);
        console.log(`TERMINAL FALLBACK CODE: ${verificationCode}`);
        return res.status(200).json({ message: 'New code generated (Fallback console print).' });
      }
    });
  });
});

// ========================================================
// 5. RESET PASSWORD ROUTE (Verify code & save password)
// ========================================================
app.post('/api/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields are required.' });

  db.get(`SELECT * FROM verification_codes WHERE email = ? AND code = ? ORDER BY id DESC LIMIT 1`, 
  [email, code], async (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!row) return res.status(400).json({ error: 'Invalid recovery code.' });

    if (new Date() > new Date(row.expires_at)) return res.status(400).json({ error: 'Recovery code expired.' });

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.run(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: 'Database update failed.' });

        db.run(`DELETE FROM verification_codes WHERE email = ?`, [email]);
        return res.status(200).json({ message: 'Password updated successfully!' });
      });
    } catch (e) {
      return res.status(500).json({ error: 'Encryption failure.' });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});