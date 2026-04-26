const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireAuthAPI, requireAdmin } = require('../middleware/auth');

module.exports = function(db) {
  // List all users
  router.get('/', requireAuthAPI, requireAdmin, (req, res) => {
    const users = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY role DESC, name ASC'
    ).all();
    res.json({ users });
  });

  // Create user
  router.post('/', requireAuthAPI, requireAdmin, (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const result = db.prepare(
      'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)'
    ).run(name, email, bcrypt.hashSync(password, 10), role === 'admin' ? 'admin' : 'user');

    const user = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);
    res.json({ success: true, user });
  });

  // Update user (name, role, active status)
  router.put('/:id', requireAuthAPI, requireAdmin, (req, res) => {
    const targetId = parseInt(req.params.id);
    const requesterId = req.session.user.id;
    const { name, role, is_active } = req.body;

    if (targetId === requesterId && (is_active === 0 || is_active === false)) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('UPDATE users SET name = ?, role = ?, is_active = ? WHERE id = ?').run(
      name || user.name,
      role === 'admin' ? 'admin' : 'user',
      (is_active === 0 || is_active === false) ? 0 : 1,
      targetId
    );

    const updated = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(targetId);
    res.json({ success: true, user: updated });
  });

  return router;
};
