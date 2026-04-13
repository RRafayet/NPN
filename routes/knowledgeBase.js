const express = require('express');
const { requireAuthAPI, requireAdmin } = require('../middleware/auth');
const router = express.Router();

module.exports = function(db) {
  // Get all articles
  router.get('/', (req, res) => {
    const { category, search } = req.query;
    let articles;

    if (search) {
      articles = db.prepare(
        'SELECT * FROM knowledge_base WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC'
      ).all(`%${search}%`, `%${search}%`);
    } else if (category) {
      articles = db.prepare(
        'SELECT * FROM knowledge_base WHERE category = ? ORDER BY created_at DESC'
      ).all(category);
    } else {
      articles = db.prepare('SELECT * FROM knowledge_base ORDER BY created_at DESC').all();
    }

    res.json({ articles });
  });

  // Get categories
  router.get('/categories', (req, res) => {
    const categories = db.prepare('SELECT DISTINCT category FROM knowledge_base ORDER BY category').all();
    res.json({ categories: categories.map(c => c.category) });
  });

  // Get single article
  router.get('/:id', (req, res) => {
    const article = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ article });
  });

  // Create article (admin only)
  router.post('/', requireAuthAPI, requireAdmin, (req, res) => {
    const { title, category, content } = req.body;
    const user = req.session.user;

    if (!title || !category || !content) {
      return res.status(400).json({ error: 'Title, category, and content are required' });
    }

    const result = db.prepare(
      'INSERT INTO knowledge_base (title, category, content, author_id) VALUES (?, ?, ?, ?)'
    ).run(title, category, content, user.id);

    const article = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, article });
  });

  // Update article (admin only)
  router.put('/:id', requireAuthAPI, requireAdmin, (req, res) => {
    const { title, category, content } = req.body;

    db.prepare(
      'UPDATE knowledge_base SET title = ?, category = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(title, category, content, req.params.id);

    const article = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(req.params.id);
    res.json({ success: true, article });
  });

  // Delete article (admin only)
  router.delete('/:id', requireAuthAPI, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  return router;
};
