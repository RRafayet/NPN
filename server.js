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
app.use('/api/users', require('./routes/users')(db));
app.use('/api/docs', require('./routes/documents')(db));

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
  ║     Admin Login:                             ║
  ║     Email: radif.rafayet@nipponexpress.com   ║
  ║     Password: Nippon@2024                    ║
  ╚══════════════════════════════════════════════╝
  `);
});
