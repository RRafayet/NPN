const nodemailer = require('nodemailer');

// Configure your SMTP settings here
// For production, use your company's SMTP server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'it-portal@nipponexpress.com';
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3000';

async function sendEmail(to, subject, html) {
  // Skip if SMTP is not configured
  if (!process.env.SMTP_USER) {
    console.log(`[Email Skipped - SMTP not configured] To: ${to}, Subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Nippon Express IT Portal" <${FROM_EMAIL}>`,
      to,
      subject,
      html
    });
    console.log(`[Email Sent] To: ${to}, Subject: ${subject}`);
  } catch (error) {
    console.error(`[Email Error] To: ${to}, Subject: ${subject}`, error.message);
  }
}

function newTicketEmailToIT(ticket, itEmail) {
  const subject = `[New IT Request] Ticket #${ticket.ticket_number} - ${ticket.device_name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">New IT Request Received</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <h3>Ticket #${ticket.ticket_number}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Requester:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.requester_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Device:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.device_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.description}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;"><span style="background-color: #FFA500; color: white; padding: 3px 10px; border-radius: 12px;">Open</span></td></tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${PORTAL_URL}/ticket/${ticket.id}" style="background-color: #CC0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a>
        </div>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal
      </div>
    </div>
  `;
  return sendEmail(itEmail, subject, html);
}

function ticketConfirmationEmailToUser(ticket, userEmail) {
  const subject = `[Ticket Received] Your IT Request #${ticket.ticket_number}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">Your IT Request Has Been Received</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>Hi ${ticket.requester_name},</p>
        <p>Your IT request has been successfully submitted. Our IT team has been notified and will be in touch shortly.</p>
        <div style="background-color: #f9f9f9; border: 2px solid #CC0000; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #666;">Your Ticket Number</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: #CC0000;">#${ticket.ticket_number}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Device:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.device_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.description}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;"><span style="background-color: #FFA500; color: white; padding: 3px 10px; border-radius: 12px;">Open</span></td></tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${PORTAL_URL}" style="background-color: #CC0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Your Request</a>
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 13px;">Please keep this ticket number for your records. You can log in to the portal at any time to check the status or send a message to the IT team.</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal
      </div>
    </div>
  `;
  return sendEmail(userEmail, subject, html);
}

function ticketInProgressEmailToUser(ticket, userEmail) {
  const subject = `[In Progress] Ticket #${ticket.ticket_number} is being worked on`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">Your Ticket Is Now In Progress</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>Hi ${ticket.requester_name},</p>
        <p>Good news! The IT team has picked up your request and is actively working on it.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Ticket #:</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #CC0000; font-weight: bold;">${ticket.ticket_number}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Device:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.device_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.description}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;"><span style="background-color: #007bff; color: white; padding: 3px 10px; border-radius: 12px;">In Progress</span></td></tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${PORTAL_URL}" style="background-color: #CC0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View &amp; Reply in Portal</a>
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 13px;">You can log in to the portal to send messages to the IT team or check for any updates.</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal
      </div>
    </div>
  `;
  return sendEmail(userEmail, subject, html);
}

function ticketClosedEmailToUser(ticket, userEmail) {
  const subject = `[Resolved] Ticket #${ticket.ticket_number} has been closed`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">Your Ticket Has Been Resolved</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <h3>Ticket #${ticket.ticket_number}</h3>
        <p>Your IT request has been resolved and the ticket has been closed.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Device:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.device_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.description}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;"><span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 12px;">Closed</span></td></tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${PORTAL_URL}/ticket/${ticket.id}" style="background-color: #CC0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a>
        </div>
        <p style="margin-top: 15px; color: #666;">If you feel the issue is not fully resolved, please open a new ticket or contact IT support.</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal
      </div>
    </div>
  `;
  return sendEmail(userEmail, subject, html);
}

function chatNotificationEmail(ticket, senderName, messageText, userEmail) {
  const subject = `[Update] New message on Ticket #${ticket.ticket_number}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">New Message on Your Ticket</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <h3>Ticket #${ticket.ticket_number}</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #CC0000; margin: 15px 0;">
          <p style="margin: 0 0 5px; font-weight: bold;">${senderName} wrote:</p>
          <p style="margin: 0;">${messageText}</p>
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${PORTAL_URL}/ticket/${ticket.id}" style="background-color: #CC0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reply to Message</a>
        </div>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal
      </div>
    </div>
  `;
  return sendEmail(userEmail, subject, html);
}

function parseCcEmails(cc) {
  if (!cc) return [];
  return cc.split(',').map(e => e.trim()).filter(e => e.includes('@'));
}

function ccTicketCreatedEmail(ticket, ccEmail) {
  const subject = `[CC] IT Request #${ticket.ticket_number} submitted by ${ticket.requester_name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">You Have Been CC'd on an IT Request</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>You have been copied on the following IT support request submitted by <strong>${ticket.requester_name}</strong>.</p>
        <div style="background-color: #f9f9f9; border: 2px solid #CC0000; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #666;">Ticket Number</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: #CC0000;">#${ticket.ticket_number}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Raised By:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.requester_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Device / System:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.device_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.description}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;"><span style="background-color: #FFA500; color: white; padding: 3px 10px; border-radius: 12px;">Open</span></td></tr>
        </table>
        <p style="margin-top: 15px; color: #666; font-size: 13px;">You will receive email updates whenever this ticket changes status or receives a new message.</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal &mdash; This is an automated message, please do not reply.
      </div>
    </div>
  `;
  return sendEmail(ccEmail, subject, html);
}

function ccStatusUpdateEmail(ticket, status, ccEmail) {
  const statusLabels = { in_progress: 'In Progress', closed: 'Resolved & Closed' };
  const statusColors = { in_progress: '#007bff', closed: '#28a745' };
  const statusLabel = statusLabels[status] || status;
  const statusColor = statusColors[status] || '#666';
  const subject = `[CC Update] Ticket #${ticket.ticket_number} is now ${statusLabel}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">Status Update on a CC'd Request</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>The following IT request (which you were CC'd on) has been updated.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Ticket #:</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #CC0000; font-weight: bold;">${ticket.ticket_number}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Raised By:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.requester_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Device / System:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.device_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">New Status:</td><td style="padding: 8px;"><span style="background-color: ${statusColor}; color: white; padding: 3px 10px; border-radius: 12px;">${statusLabel}</span></td></tr>
        </table>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal &mdash; This is an automated message, please do not reply.
      </div>
    </div>
  `;
  return sendEmail(ccEmail, subject, html);
}

function ccChatNotificationEmail(ticket, senderName, messageText, ccEmail) {
  const subject = `[CC Update] New message on Ticket #${ticket.ticket_number}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #CC0000; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Nippon Express IT Portal</h2>
        <p style="margin: 5px 0 0;">New Message on a CC'd Request</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>A new message has been posted on IT Request <strong>#${ticket.ticket_number}</strong> (raised by ${ticket.requester_name}), which you were CC'd on.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #CC0000; margin: 15px 0;">
          <p style="margin: 0 0 5px; font-weight: bold;">${senderName} wrote:</p>
          <p style="margin: 0;">${messageText}</p>
        </div>
      </div>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Nippon Express IT Support Portal &mdash; This is an automated message, please do not reply.
      </div>
    </div>
  `;
  return sendEmail(ccEmail, subject, html);
}

module.exports = {
  sendEmail,
  parseCcEmails,
  newTicketEmailToIT,
  ticketConfirmationEmailToUser,
  ticketInProgressEmailToUser,
  ticketClosedEmailToUser,
  chatNotificationEmail,
  ccTicketCreatedEmail,
  ccStatusUpdateEmail,
  ccChatNotificationEmail
};
