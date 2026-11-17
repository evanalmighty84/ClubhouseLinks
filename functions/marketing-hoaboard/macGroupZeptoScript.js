'use strict';
// Matches the existing Clubhouse Links ZeptoMail SMTP + CID signature pattern.
// Requires: npm install nodemailer
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('./macGroupEmailConfig');

const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || process.env.FROM_EMAIL;
const fromName = process.env.ZEPTOMAIL_FROM_NAME || process.env.FROM_NAME || 'Evan Ligon | Clubhouse Links';
const smtpHost = process.env.ZEPTOMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.zeptomail.com';
const smtpPort = Number(process.env.ZEPTOMAIL_SMTP_PORT || process.env.SMTP_PORT || 587);
const smtpUser = process.env.ZEPTOMAIL_SMTP_USER || process.env.SMTP_USER;
const smtpPassword = process.env.ZEPTOMAIL_SMTP_PASSWORD || process.env.SMTP_PASSWORD;

function assetPath(filename) {
  const candidates = [
    path.join(__dirname, filename),
    path.join(__dirname, '..', 'marketing-hoaboard', filename),
    path.join(__dirname, 'marketing-hoaboard', filename),
  ];
  return candidates.find(p => fs.existsSync(p));
}

function image(filename, cid, alt, width) {
  const p = assetPath(filename);
  return p ? {
    html: `<img src="cid:${cid}" alt="${alt}" width="${width}" style="display:block;max-width:100%;height:auto;border:0;">`,
    attachment: { filename, path: p, cid }
  } : { html: '', attachment: null };
}

async function main() {
  if (!config.recipientEmail || !config.subject || !config.bodyHtml) throw new Error('Missing email config values');
  if (!fromEmail || !smtpUser || !smtpPassword) {
    throw new Error('Missing SMTP settings. Export ZEPTOMAIL_FROM_EMAIL, ZEPTOMAIL_SMTP_USER and ZEPTOMAIL_SMTP_PASSWORD (or corresponding FROM_EMAIL, SMTP_USER, SMTP_PASSWORD).');
  }
  const logo = image('clubhouse-logo.png', 'clubhouse-logo', 'Clubhouse Links', 175);
  const headshot = image('headshot.png', 'evan-headshot', 'Evan Ligon', 74);
  const html = `<!doctype html><html><body style="margin:0;background:#f7f7fa;padding:20px;">
    <div style="max-width:680px;margin:auto;background:#fff;padding:26px;font-family:Arial,Helvetica,sans-serif;color:#263047;line-height:1.65;font-size:15px;">
      ${logo.html ? `<div style="margin-bottom:24px">${logo.html}</div>` : '<h2 style="color:#7851a9">Clubhouse Links</h2>'}
      ${config.bodyHtml}
      <table role="presentation" style="border-top:1px solid #e7e7ec;margin-top:26px;padding-top:18px"><tr>
        ${headshot.html ? `<td style="vertical-align:top;padding-right:15px">${headshot.html}</td>` : ''}
        <td style="vertical-align:top;font-size:13px;line-height:1.5"><strong>Evan Ligon</strong><br>CEO / Web Developer<br>
        <a href="https://www.clubhouselinks.com">Clubhouse Links</a><br>
        <a href="mailto:Evan.Ligon@ClubhouseLinks.com">Evan.Ligon@ClubhouseLinks.com</a><br>
        <a href="tel:+12145489175">214-548-9175</a></td></tr></table>
    </div></body></html>`;
  const transport = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword }
  });
  await transport.verify();
  const info = await transport.sendMail({
    from: { name: fromName, address: fromEmail },
    to: { name: config.recipientName, address: config.recipientEmail },
    subject: config.subject,
    html,
    attachments: [logo.attachment, headshot.attachment].filter(Boolean),
    headers: { 'X-TM-OPEN-TRACK': 'true', 'X-TM-CLICK-TRACK': 'true' }
  });
  console.log('ZeptoMail accepted:', info.messageId);
}
main().catch(err => { console.error(err); process.exitCode = 1; });
