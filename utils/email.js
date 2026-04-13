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

module.exports = {
  sendEmail,
  newTicketEmailToIT,
  ticketClosedEmailToUser,
  chatNotificationEmail
};
