// Run: node chrisZeptoScript.js
// Uses the six ZEPTOMAIL_* environment variables you export from Heroku.
// Requires: npm install nodemailer
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const emailConfig = require('./ryanEmailConfig');

const {
    ZEPTOMAIL_FROM_EMAIL,
    ZEPTOMAIL_FROM_NAME,
    ZEPTOMAIL_SMTP_HOST,
    ZEPTOMAIL_SMTP_PORT,
    ZEPTOMAIL_SMTP_USER,
    ZEPTOMAIL_SMTP_PASSWORD
} = process.env;

// Reuse the same two images as your marketing-hoaboard script.
// If this script is saved in the same folder as your images, it uses them there.
// Otherwise it also checks the neighboring marketing-hoaboard folder.
function resolveImage(filename) {
    const locations = [
        path.join(__dirname, filename),
        path.join(__dirname, '..', 'marketing-hoaboard', filename)
    ];
    const found = locations.find(file => fs.existsSync(file));
    if (!found) throw new Error(`Missing ${filename}. Place it beside this script or in marketing-hoaboard.`);
    return found;
}

function htmlToPlainText(html) {
    return html.replace(/<\/p>/gi, '\n\n').replace(/<\/li>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ').replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function buildEmail() {
    const logoPath = resolveImage('clubhouse-logo.png');
    const headshotPath = resolveImage('headshot.png');

    const signature = `
    <div style="margin-top:18px;padding-top:22px;border-top:1px solid #e5e7eb;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:top;padding-right:16px;">
            <img src="cid:evan-headshot" alt="Evan Ligon" width="80" height="80"
                 style="display:block;width:80px;height:80px;border-radius:50%;border:0;">
          </td>
          <td style="vertical-align:middle;color:#000000;font-size:14px;line-height:1.55;">
            <strong style="color:#000000;font-size:16px;">Evan Ligon</strong><br>
            <span style="color:#000000;">CEO / Web Developer</span><br>
            <a href="https://www.clubhouselinks.com" style="color:#009899;text-decoration:none;font-weight:600;">www.ClubhouseLinks.com</a><br>
            <a href="mailto:evan.ligon@clubhouselinks.com" style="color:#009899;text-decoration:none;">evan.ligon@clubhouselinks.com</a><br>
            <a href="tel:+12145489175" style="color:#009899;text-decoration:none;font-weight:700;">214-548-9175</a>
          </td>
        </tr>
      </table>
    </div>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="max-width:680px;margin:0 auto;padding:28px 22px;font-family:Verdana,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#000000;">
      <div style="margin:0 0 26px 0;"><img src="cid:clubhouse-logo" alt="Clubhouse Links" width="140" style="display:block;width:140px;max-width:100%;height:auto;border:0;"></div>
      ${emailConfig.bodyHtml}
      ${signature}
    </div>
  </body></html>`;

    const text = htmlToPlainText(emailConfig.bodyHtml) +
        '\n\nEvan Ligon\nCEO / Web Developer\nwww.ClubhouseLinks.com\nevan.ligon@clubhouselinks.com\n214-548-9175';
    const attachments = [
        {filename:'clubhouse-logo.png',path:logoPath,cid:'clubhouse-logo',contentDisposition:'inline'},
        {filename:'headshot.png',path:headshotPath,cid:'evan-headshot',contentDisposition:'inline'}
    ];
    return {html,text,attachments};
}

async function sendEmail() {
    const required = [
        'ZEPTOMAIL_FROM_EMAIL','ZEPTOMAIL_FROM_NAME','ZEPTOMAIL_SMTP_HOST',
        'ZEPTOMAIL_SMTP_PORT','ZEPTOMAIL_SMTP_USER','ZEPTOMAIL_SMTP_PASSWORD'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    const port = Number(ZEPTOMAIL_SMTP_PORT);
    if (!Number.isInteger(port) || port <= 0) throw new Error('Invalid ZEPTOMAIL_SMTP_PORT');
    const to = String(emailConfig.recipientEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Invalid recipientEmail in chrisEmailConfig.js');

    const transporter = nodemailer.createTransport({
        host: ZEPTOMAIL_SMTP_HOST,
        port,
        secure: port === 465,
        auth: {user: ZEPTOMAIL_SMTP_USER, pass: ZEPTOMAIL_SMTP_PASSWORD}
    });
    const email = buildEmail();
    await transporter.verify();
    const info = await transporter.sendMail({
        from: {name: ZEPTOMAIL_FROM_NAME, address: ZEPTOMAIL_FROM_EMAIL},
        to,
        subject: emailConfig.subject,
        html: email.html,
        text: email.text,
        attachments: email.attachments
    });
    console.log(`Sent to ${to}: ${info.messageId}`);
}

sendEmail().catch(error => {
    console.error('ZeptoMail send failed:', error.message);
    process.exitCode = 1;
});
