const router = require('express').Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone_number, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users(name,email,phone_number,password_hash)
     VALUES($1,$2,$3,$4) RETURNING id,name,email,phone_number`,
    [name, email, phone_number, hash]
  );
  const user = rows[0];

  // assign default 'customer' role
  const { rows: roleRows } = await db.query(
    `SELECT id FROM roles WHERE name='customer'`
  );
  if (roleRows[0]) {
    await db.query(
      `INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)`,
      [user.id, roleRows[0].id]
    );
  }

  // fetch roles
  const { rows: userRoles } = await db.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id=r.id
     WHERE ur.user_id=$1`,
    [user.id]
  );

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      roles: userRoles.map(r => r.name)
    },
    token
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // fetch roles
  const { rows: userRoles } = await db.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id=r.id
     WHERE ur.user_id=$1`,
    [user.id]
  );

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      roles: userRoles.map(r => r.name)
    },
    token
  });
});

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// POST /api/auth/reset-password (request reset link)
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) return res.status(200).json({ message: "If that email exists, a reset link has been sent." });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

  await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
    [resetToken, expiry, user.id]
  );

  const resetUrl = `https://harrykp.github.io/branding-shop-frontend/store/reset-confirm.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    to: email,
    subject: "Password Reset - Branding Shop",
    html: `
  <div style="font-family:Arial,sans-serif;padding:20px;background:#f9f9f9;border:1px solid #ddd;border-radius:10px;">
    <h2 style="color:#007bff;">Branding Shop – Password Reset</h2>
    <p>Hello,</p>
    <p>You requested a password reset. Click the button below to reset your password:</p>
    <p style="text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#28a745;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
    </p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>– The Branding Shop Team</p>
  </div>
`

  });

  res.status(200).json({ message: "If that email exists, a reset link has been sent." });
});

// POST /api/auth/reset-password/confirm
router.post('/reset-password/confirm', async (req, res) => {
  const { email, token, newPassword } = req.body;

  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expiry > $3',
    [email, token, Date.now()]
  );

  const user = rows[0];
  if (!user) return res.status(400).json({ message: "Invalid or expired token." });

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
    [hashed, user.id]
  );

  res.status(200).json({ message: "Password successfully reset. Please log in." });
});


module.exports = router;
