"use strict";

const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const emailConfig = require("./praneEmailConfig");

const SMTP_USER = process.env.ZEPTOMAIL_SMTP_USER || process.env.ZEPTOMAIL_SMTP_USERNAME || process.env.ZEPTOMAIL_USER || process.env.ZEPTO_SMTP_USER || process.env.ZEPTO_USER || process.env.SMTP_USER;
const SMTP_PASS = process.env.ZEPTOMAIL_SMTP_PASS || process.env.ZEPTOMAIL_SMTP_PASSWORD || process.env.ZEPTOMAIL_PASSWORD || process.env.ZEPTO_SMTP_PASS || process.env.ZEPTO_PASSWORD || process.env.SMTP_PASS;
const SMTP_HOST = process.env.ZEPTOMAIL_SMTP_HOST || "smtp.zeptomail.com";
const SMTP_PORT = Number(process.env.ZEPTOMAIL_SMTP_PORT) || 587;
const FROM_EMAIL = process.env.ZEPTOMAIL_FROM_EMAIL || "evan.ligon@clubhouselinks.com";
const FROM_NAME = process.env.ZEPTOMAIL_FROM_NAME || "Evan Ligon";
const LOGO_PATH = path.join(__dirname, "clubhouse-logo.png");
const HEADSHOT_PATH = path.join(__dirname, "headshot.png");

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildEmail() {
  const hasLogo = fs.existsSync(LOGO_PATH);
  const hasHeadshot = fs.existsSync(HEADSHOT_PATH);
  const attachments = [];
  if (hasLogo) attachments.push({ filename: "clubhouse-logo.png", path: LOGO_PATH, cid: "clubhouse-logo" });
  if (hasHeadshot) attachments.push({ filename: "headshot.png", path: HEADSHOT_PATH, cid: "evan-headshot" });
  const logo = hasLogo ? '<p><img src="cid:clubhouse-logo" alt="Clubhouse Links" width="140" style="display:block;height:auto;border:0"></p>' : '';
  const headshot = hasHeadshot ? '<td style="padding-right:16px;vertical-align:top"><img src="cid:evan-headshot" alt="Evan Ligon" width="80" height="80" style="display:block;border-radius:50%;border:0"></td>' : '';
  const signature = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${headshot}<td style="font-size:14px;line-height:1.6"><strong>Evan Ligon</strong><br>President &amp; CEO | Clubhouse Links<br><a href="https://www.clubhouselinks.com">www.ClubhouseLinks.com</a><br><a href="mailto:evan.ligon@clubhouselinks.com">evan.ligon@clubhouselinks.com</a><br><a href="tel:+12145489175">214-548-9175</a><br><a href="https://apps.apple.com/us/app/clubhouse-links/id6790003233">Clubhouse Links on the App Store</a></td></tr></table>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(emailConfig.subject)}</title></head><body style="margin:0;background:white"><div style="max-width:680px;margin:auto;padding:28px 22px;font-family:Verdana,Arial,sans-serif;font-size:15px;line-height:1.65;color:#111827">${logo}${emailConfig.bodyHtml}<p>Best regards,</p><div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:20px">${signature}</div></div></body></html>`;
  const text = emailConfig.bodyHtml.replace(/<\/p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim() + "\n\nBest regards,\nEvan Ligon\nPresident & CEO | Clubhouse Links\n214-548-9175\nevan.ligon@clubhouselinks.com";
  return { subject: emailConfig.subject, html, text, attachments };
}

async function run() {
  try {
    if (!emailConfig.recipientEmail || !emailConfig.recipientName) throw new Error("Missing recipient details in praneEmailConfig.js");
    if (!SMTP_USER || !SMTP_PASS) throw new Error("Missing ZeptoMail SMTP credentials");
    const transport = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
    await transport.verify();
    const email = buildEmail();
    const result = await transport.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to: emailConfig.recipientEmail, replyTo: "evan.ligon@clubhouselinks.com", ...email });
    console.log("Proper HOA partnership invitation sent:", result.messageId);
  } catch (error) {
    console.error("Proper HOA invitation failed:", error);
    process.exitCode = 1;
  }
}

if (require.main === module) run();
module.exports = { buildEmail };
