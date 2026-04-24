const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuthAPI, requireAdmin } = require('../middleware/auth');
const { newTicketEmailToIT, ticketConfirmationEmailToUser, ticketInProgressEmailToUser, ticketClosedEmailToUser, chatNotificationEmail } = require('../utils/email');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|bmp|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    if (ext || mime) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

module.exports = function(db) {
  function generateTicketNumber() {
    const date = new Date();
    const prefix = 'NPN';
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}-${random}`;
  }

  // Create ticket
  router.post('/', requireAuthAPI, upload.single('image'), (req, res) => {
    const { device_name, description, assigned_to, cc, priority, priority_reason } = req.body;
    const user = req.session.user;

    if (!device_name || !description) {
      return res.status(400).json({ error: 'Device name and description are required' });
    }

    let ticketNumber;
    let attempts = 0;
    while (attempts < 10) {
      ticketNumber = generateTicketNumber();
      const existing = db.prepare('SELECT id FROM tickets WHERE ticket_number = ?').get(ticketNumber);
      if (!existing) break;
      attempts++;
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const assignedTo = assigned_to ? parseInt(assigned_to) : null;
    const ticketPriority = priority === 'high' ? 'high' : 'normal';
    const ticketPriorityReason = ticketPriority === 'high' && priority_reason ? priority_reason.trim().substring(0, 300) : null;

    const result = db.prepare(`
      INSERT INTO tickets (ticket_number, requester_id, requester_name, device_name, description, image_path, assigned_to, cc, status, priority, priority_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(ticketNumber, user.id, user.name, device_name, description, imagePath, assignedTo, cc || null, ticketPriority, ticketPriorityReason);

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);

    // Confirm ticket to the requester
    const requesterUser = db.prepare('SELECT email FROM users WHERE id = ?').get(user.id);
    if (requesterUser) {
      ticketConfirmationEmailToUser(ticket, requesterUser.email);
    }

    // Notify IT admins via email
    const admins = db.prepare('SELECT email FROM users WHERE role = ?').all('admin');
    for (const admin of admins) {
      newTicketEmailToIT(ticket, admin.email);
    }

    // Notify specific assigned person if set
    if (assignedTo) {
      const assignedUser = db.prepare('SELECT email FROM users WHERE id = ?').get(assignedTo);
      if (assignedUser) {
        newTicketEmailToIT(ticket, assignedUser.email);
      }
    }

    // Create notification for IT admins
    const adminUsers = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)');
    const priorityReasonLabels = {
      'operations_down': 'Operations Down',
      'warehouse_equipment': 'Warehouse Equipment',
      'fleet_delivery': 'Fleet & Delivery',
      'customer_impacting': 'Customer Impacting',
      'safety_compliance': 'Safety or Compliance',
      'personal_productivity': 'Personal Productivity'
    };
    for (const admin of adminUsers) {
      let priorityTag = '';
      if (ticket.priority === 'high') {
        const reasonLabel = ticket.priority_reason
          ? (priorityReasonLabels[ticket.priority_reason] || ticket.priority_reason)
          : '';
        priorityTag = ' [PRIORITY' + (reasonLabel ? ': ' + reasonLabel : '') + ']';
      }
      insertNotif.run(admin.id, ticket.id, 'new_ticket', `New ticket${priorityTag} #${ticketNumber} from ${user.name}`);
    }

    res.json({ success: true, ticket });
  });

  // Get all tickets (admin gets all, user gets their own)
  router.get('/', requireAuthAPI, (req, res) => {
    const user = req.session.user;
    let tickets;

    if (user.role === 'admin') {
      tickets = db.prepare(`
        SELECT * FROM tickets
        ORDER BY CASE WHEN priority = 'high' THEN 0 ELSE 1 END ASC, created_at ASC
      `).all();
    } else {
      tickets = db.prepare('SELECT * FROM tickets WHERE requester_id = ? ORDER BY created_at DESC').all(user.id);
    }

    res.json({ tickets });
  });

  // Get single ticket
  router.get('/:id', requireAuthAPI, (req, res) => {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const user = req.session.user;
    if (user.role !== 'admin' && ticket.requester_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
    const assignedUser = ticket.assigned_to
      ? db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(ticket.assigned_to)
      : null;

    res.json({ ticket, messages, assigned_user: assignedUser });
  });

  // Update ticket status (admin only)
  router.put('/:id/status', requireAuthAPI, requireAdmin, (req, res) => {
    const { status } = req.body;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const closedAt = status === 'closed' ? new Date().toISOString() : null;
    db.prepare('UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP, closed_at = ? WHERE id = ?')
      .run(status, closedAt, ticket.id);

    const updatedTicketForEmail = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);
    const requester = db.prepare('SELECT email FROM users WHERE id = ?').get(ticket.requester_id);

    if (status === 'in_progress') {
      if (requester) {
        ticketInProgressEmailToUser(updatedTicketForEmail, requester.email);
      }
      db.prepare('INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)')
        .run(ticket.requester_id, ticket.id, 'status_update', `Your ticket #${ticket.ticket_number} is now in progress`);
    }

    if (status === 'closed') {
      if (requester) {
        ticketClosedEmailToUser(ticket, requester.email);
      }

      // Create notification for requester
      db.prepare('INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)')
        .run(ticket.requester_id, ticket.id, 'ticket_closed', `Your ticket #${ticket.ticket_number} has been resolved and closed`);
    }

    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);
    res.json({ success: true, ticket: updatedTicket });
  });

  // Assign ticket (admin only)
  router.put('/:id/assign', requireAuthAPI, requireAdmin, (req, res) => {
    const { assigned_to } = req.body;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    db.prepare('UPDATE tickets SET assigned_to = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(assigned_to, 'in_progress', ticket.id);

    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);
    res.json({ success: true, ticket: updatedTicket });
  });

  // Send chat message on ticket
  router.post('/:id/messages', requireAuthAPI, (req, res) => {
    const { message } = req.body;
    const user = req.session.user;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    db.prepare('INSERT INTO messages (ticket_id, sender_id, sender_name, message) VALUES (?, ?, ?, ?)')
      .run(ticket.id, user.id, user.name, message.trim());

    db.prepare('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(ticket.id);

    // Notify the other party via email
    if (user.role === 'admin') {
      // IT admin messaged, notify the requester
      const requester = db.prepare('SELECT email FROM users WHERE id = ?').get(ticket.requester_id);
      if (requester) {
        chatNotificationEmail(ticket, user.name, message.trim(), requester.email);
      }
      db.prepare('INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)')
        .run(ticket.requester_id, ticket.id, 'new_message', `New message from ${user.name} on ticket #${ticket.ticket_number}`);
    } else {
      // User messaged, notify assigned IT or all admins
      const admins = db.prepare('SELECT id, email FROM users WHERE role = ?').all('admin');
      for (const admin of admins) {
        chatNotificationEmail(ticket, user.name, message.trim(), admin.email);
        db.prepare('INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)')
          .run(admin.id, ticket.id, 'new_message', `New message from ${user.name} on ticket #${ticket.ticket_number}`);
      }
    }

    const messages = db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
    res.json({ success: true, messages });
  });

  // Get IT staff list (for assignment dropdown)
  router.get('/staff/list', requireAuthAPI, (req, res) => {
    const staff = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('admin');
    res.json({ staff });
  });

  // Get notifications for current user
  router.get('/user/notifications', requireAuthAPI, (req, res) => {
    const user = req.session.user;
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(user.id);
    const unread = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(user.id);
    res.json({ notifications, unread_count: unread.count });
  });

  // Mark notifications as read
  router.put('/user/notifications/read', requireAuthAPI, (req, res) => {
    const user = req.session.user;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
    res.json({ success: true });
  });

  return router;
};
