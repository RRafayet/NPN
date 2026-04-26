const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const { passwordResetEmail } = require('../utils/email');

module.exports = function(db) {
  // Register
  router.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hashedPassword, 'user');

    req.session.user = {
      id: result.lastInsertRowid,
      name,
      email,
      role: 'user'
    };

    res.json({ success: true, user: req.session.user });
  });

  // Login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact IT.' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({ success: true, user: req.session.user });
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  // Get current user
  router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
      return res.json({ user: req.session.user });
    }
    res.json({ user: null });
  });

  // Change password (logged-in user)
  router.put('/change-password', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'All fields are required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user || !bcrypt.compareSync(current_password, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), user.id);
    res.json({ success: true });
  });

  // Forgot password — sends reset link to email
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true });

    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

    await passwordResetEmail(user.name, user.email, token);

    res.json({ success: true });
  });

  // Reset password — validates token and sets new password
  router.post('/reset-password', (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    const record = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token);
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });

    if (new Date(record.expires_at) < new Date()) {
      db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, record.user_id);
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);

    res.json({ success: true });
  });

  return router;
};
