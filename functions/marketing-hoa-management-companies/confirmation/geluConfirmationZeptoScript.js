'use strict';
// Uses the six existing ZEPTOMAIL_* environment variables.
// npm install nodemailer
// node geluConfirmationZeptoScript.js

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('./geluConfirmationEmailConfig');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function main() {
  if (!config.recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.recipientEmail.trim())) {
    throw new Error('Enter Christy Rivers\' actual email in geluConfirmationEmailConfig.js before sending.');
  }
  const required = ['ZEPTOMAIL_SMTP_HOST', 'ZEPTOMAIL_SMTP_PORT', 'ZEPTOMAIL_SMTP_USER',
    'ZEPTOMAIL_SMTP_PASSWORD', 'ZEPTOMAIL_FROM_EMAIL', 'ZEPTOMAIL_FROM_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error('Missing ZeptoMail environment variables: ' + missing.join(', '));

  const port = Number(process.env.ZEPTOMAIL_SMTP_PORT);
  const transport = nodemailer.createTransport({
    host: process.env.ZEPTOMAIL_SMTP_HOST, port, secure: port === 465,
    ...(port === 587 ? { requireTLS: true } : {}),
    auth: { user: process.env.ZEPTOMAIL_SMTP_USER, pass: process.env.ZEPTOMAIL_SMTP_PASSWORD },
    tls: { minVersion: 'TLSv1.2' }
  });

  const attachments = [];
  for (const [filename, cid] of [['clubhouse-logo.png','clubhouse-logo'], ['headshot.png','evan-headshot']]) {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) attachments.push({ filename, path: filePath, cid });
  }
  const hasLogo = fs.existsSync(path.join(__dirname, 'clubhouse-logo.png'));
  const hasHeadshot = fs.existsSync(path.join(__dirname, 'headshot.png'));
  const signature = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #e5e7eb;padding-top:14px;"><tr>
      <td style="vertical-align:middle;padding-right:16px;">${hasHeadshot ? '<img src="cid:evan-headshot" alt="Evan Ligon" width="75" style="width:75px;height:75px;border-radius:50%;object-fit:cover;display:block;">' : ''}</td>
      <td style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#263238;">
        <strong>Evan Ligon</strong><br>President &amp; CEO | Clubhouse Links<br>
        <a href="https://clubhouselinks.com">clubhouselinks.com</a><br>
        <a href="mailto:evan.ligon@clubhouselinks.com">evan.ligon@clubhouselinks.com</a> | <a href="tel:+12145489175">214-548-9175</a>
      </td></tr></table>
    ${hasLogo ? '<p><img src="cid:clubhouse-logo" alt="Clubhouse Links" width="135" style="width:135px;height:auto;"></p>' : ''}
  `;
  const body = config.bodyHtml.replace(/{{recipientName}}/g, escapeHtml(config.recipientName || 'there'));
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#f7f9fa;margin:0;padding:20px 10px;"><div style="max-width:660px;margin:auto;background:#fff;border:1px solid #e5e7eb;padding:28px 25px;font-family:Arial,sans-serif;color:#1b2730;font-size:15px;line-height:1.65;">${body}${signature}</div></body></html>`;
  const textBody = body.replace(/<\/li>/g, '\n').replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+\n/g, '\n').trim();

  return transport.sendMail({
    from: { name: process.env.ZEPTOMAIL_FROM_NAME, address: process.env.ZEPTOMAIL_FROM_EMAIL },
    to: config.recipientEmail.trim(), subject: config.subject, html,
    text: `${textBody}\n\nEvan Ligon | President & CEO | Clubhouse Links | 214-548-9175`,
    attachments
  }).then(result => console.log('Email sent to', config.recipientEmail, 'Message ID:', result.messageId));
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
