const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

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

  return router;
};
