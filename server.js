const express = require('express');
const session = require('express-session');
const path = require('path');
const { initializeDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initializeDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'npn-it-portal-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// API Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/tickets', require('./routes/tickets')(db));
app.use('/api/kb', require('./routes/knowledgeBase')(db));

// Page routes - serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║     Nippon Express IT Request Portal         ║
  ║     Running on http://localhost:${PORT}          ║
  ║                                              ║
  ║     Default Admin Login:                     ║
  ║     Email: admin@nipponexpress.com           ║
  ║     Password: admin123                       ║
  ╚══════════════════════════════════════════════╝
  `);
});
