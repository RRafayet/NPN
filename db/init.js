const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'portal.db');

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

  // Seed default IT admin users if they don't exist
  const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
    `).run('IT Admin', 'admin@nipponexpress.com', hashedPassword, 'admin');

    db.prepare(`
      INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
    `).run('IT Support', 'support@nipponexpress.com', hashedPassword, 'admin');

    // Seed some knowledge base articles
    const adminId = db.prepare('SELECT id FROM users WHERE role = ?').get('admin').id;
    const articles = [
      {
        title: 'How to Reset Your Password',
        category: 'Account & Access',
        content: `<h3>Steps to Reset Your Password</h3>
<ol>
<li>Press <strong>Ctrl + Alt + Delete</strong> on your keyboard</li>
<li>Select <strong>"Change a password"</strong></li>
<li>Enter your current password</li>
<li>Enter your new password (must be at least 8 characters with uppercase, lowercase, and numbers)</li>
<li>Confirm your new password</li>
<li>Press Enter</li>
</ol>
<p><strong>If you are locked out:</strong> Contact IT support to reset your account.</p>`
      },
      {
        title: 'Connecting to the Office Wi-Fi',
        category: 'Network',
        content: `<h3>Wi-Fi Connection Guide</h3>
<ol>
<li>Click the <strong>Wi-Fi icon</strong> in the system tray (bottom-right corner)</li>
<li>Select <strong>"NipponExpress-Corp"</strong> from the available networks</li>
<li>Enter your domain credentials (same as your computer login)</li>
<li>Check <strong>"Connect automatically"</strong></li>
<li>Click <strong>Connect</strong></li>
</ol>
<p><strong>Troubleshooting:</strong> If you cannot see the network, try toggling Wi-Fi off and on. If the issue persists, restart your device.</p>`
      },
      {
        title: 'Setting Up Email on Mobile',
        category: 'Email',
        content: `<h3>Email Setup for Mobile Devices</h3>
<h4>For iPhone:</h4>
<ol>
<li>Go to <strong>Settings > Mail > Accounts > Add Account</strong></li>
<li>Select <strong>Microsoft Exchange</strong></li>
<li>Enter your Nippon Express email address</li>
<li>Enter your password</li>
<li>Accept the configuration profile</li>
</ol>
<h4>For Android:</h4>
<ol>
<li>Open the <strong>Outlook app</strong> (download from Play Store if needed)</li>
<li>Tap <strong>Add Account</strong></li>
<li>Enter your Nippon Express email address</li>
<li>Enter your password</li>
<li>Follow the setup wizard</li>
</ol>`
      },
      {
        title: 'Printer Troubleshooting',
        category: 'Hardware',
        content: `<h3>Common Printer Issues & Solutions</h3>
<h4>Printer Not Printing:</h4>
<ol>
<li>Check if the printer is powered on and connected</li>
<li>Ensure paper tray is loaded</li>
<li>Check for paper jams</li>
<li>Restart the print spooler: Open Command Prompt as Admin and type: <code>net stop spooler && net start spooler</code></li>
</ol>
<h4>Adding a Network Printer:</h4>
<ol>
<li>Go to <strong>Settings > Devices > Printers & Scanners</strong></li>
<li>Click <strong>"Add a printer or scanner"</strong></li>
<li>Wait for it to detect printers on the network</li>
<li>Select your printer and click <strong>Add device</strong></li>
</ol>`
      },
      {
        title: 'VPN Connection Guide',
        category: 'Network',
        content: `<h3>Connecting to Nippon Express VPN</h3>
<ol>
<li>Open the <strong>VPN client</strong> application from Start menu</li>
<li>Enter the server address provided by IT</li>
<li>Enter your domain username and password</li>
<li>Click <strong>Connect</strong></li>
<li>Wait for the connection to establish (green icon in system tray)</li>
</ol>
<p><strong>Note:</strong> VPN is required for accessing company resources when working remotely.</p>
<p><strong>If connection fails:</strong> Ensure you are connected to the internet first, then try again. If issues persist, contact IT support.</p>`
      }
    ];

    const insertArticle = db.prepare(`
      INSERT INTO knowledge_base (title, category, content, author_id) VALUES (?, ?, ?, ?)
    `);
    for (const article of articles) {
      insertArticle.run(article.title, article.category, article.content, adminId);
    }
  }

  return db;
}

module.exports = { initializeDatabase, DB_PATH };
