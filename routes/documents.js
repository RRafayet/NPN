const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuthAPI, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'docs'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|png|jpg|jpeg|gif|webp|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error('File type not allowed'));
  }
});

module.exports = function(db) {
  // List all documents
  router.get('/', requireAuthAPI, (req, res) => {
    const { category } = req.query;
    let docs;
    if (category) {
      docs = db.prepare('SELECT * FROM kb_documents WHERE category = ? ORDER BY created_at DESC').all(category);
    } else {
      docs = db.prepare('SELECT * FROM kb_documents ORDER BY created_at DESC').all();
    }
    res.json({ documents: docs });
  });

  // Get document categories
  router.get('/categories', requireAuthAPI, (req, res) => {
    const cats = db.prepare('SELECT DISTINCT category FROM kb_documents ORDER BY category').all();
    res.json({ categories: cats.map(c => c.category) });
  });

  // Upload document (admin only)
  router.post('/', requireAuthAPI, requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = db.prepare(
      'INSERT INTO kb_documents (title, category, filename, original_name, file_size, mime_type, uploader_id, uploader_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      title,
      category || 'General',
      req.file.filename,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      req.session.user.id,
      req.session.user.name
    );

    const doc = db.prepare('SELECT * FROM kb_documents WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, document: doc });
  });

  // Delete document (admin only)
  router.delete('/:id', requireAuthAPI, requireAdmin, (req, res) => {
    const doc = db.prepare('SELECT * FROM kb_documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'docs', doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM kb_documents WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  return router;
};
