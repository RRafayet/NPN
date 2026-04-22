const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'portal.db');

function initializeDatabase() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      requester_id INTEGER NOT NULL,
      requester_name TEXT NOT NULL,
      device_name TEXT NOT NULL,
      description TEXT NOT NULL,
      image_path TEXT,
      assigned_to INTEGER,
      cc TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ticket_id INTEGER,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );
  `);

  // Seed default IT admin users if they don't exist (idempotent per email)
  const seedUsers = [
    { name: 'IT Admin',      email: 'admin@nipponexpress.com',           password: 'admin123',    role: 'admin' },
    { name: 'IT Support',    email: 'support@nipponexpress.com',         password: 'admin123',    role: 'admin' },
    { name: 'Radif Rafayet', email: 'radif.rafayet@nipponexpress.com',   password: 'Nippon@2024', role: 'admin' },
    { name: 'Sudip Regmi',   email: 'sudip.regmi@nipponexpress.com',     password: 'Nippon@2024', role: 'admin' },
    { name: 'Staff',         email: 'staff@nipponexpress.com',           password: 'Nippon@2024', role: 'user' },
    { name: 'Warehouse',     email: 'warehouse@nipponexpress.com',       password: 'Nippon@2024', role: 'user' },
  ];
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
  for (const u of seedUsers) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (!exists) {
      insertUser.run(u.name, u.email, bcrypt.hashSync(u.password, 10), u.role);
    }
  }

  return db;
}

module.exports = { initializeDatabase, DB_PATH };
