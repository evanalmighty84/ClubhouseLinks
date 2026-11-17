"use strict";

const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const emailConfig = require("./fourSightLunchLearnEmailConfig");

// Same local asset names and ZeptoMail environment variable fallbacks as the
// supplied hoaBoardWelcomeZeptoScript.js. Place logo/headshot beside this script.
const CLUBHOUSE_LOGO_PATH = path.join(__dirname, "clubhouse-logo.png");
const HEADSHOT_PATH = path.join(__dirname, "headshot.png");
const PRESENTATION_PATH = path.join(__dirname, emailConfig.presentationFilename);

const SMTP_USER = process.env.ZEPTOMAIL_SMTP_USER ||
  process.env.ZEPTOMAIL_SMTP_USERNAME || process.env.ZEPTOMAIL_USER ||
  process.env.ZEPTO_SMTP_USER || process.env.ZEPTO_USER || process.env.SMTP_USER;
const SMTP_PASS = process.env.ZEPTOMAIL_SMTP_PASS ||
  process.env.ZEPTOMAIL_SMTP_PASSWORD || process.env.ZEPTOMAIL_PASSWORD ||
  process.env.ZEPTO_SMTP_PASS || process.env.ZEPTO_PASSWORD || process.env.SMTP_PASS;
const SMTP_HOST = process.env.ZEPTOMAIL_SMTP_HOST || "smtp.zeptomail.com";
const SMTP_PORT = Number(process.env.ZEPTOMAIL_SMTP_PORT) || 587;
const FROM_EMAIL = process.env.ZEPTOMAIL_FROM_EMAIL || "evan.ligon@clubhouselinks.com";
const FROM_NAME = process.env.ZEPTOMAIL_FROM_NAME || "Evan Ligon";

function escapeHtml(v = "") {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function validate() {
  if (!emailConfig.recipientEmail || !emailConfig.recipientName) {
    throw new Error("Missing recipientEmail or recipientName in email config.");
  }
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("Missing ZeptoMail SMTP credentials.");
  }
  if (!fs.existsSync(PRESENTATION_PATH)) {
    throw new Error(`Required presentation PDF not found: ${PRESENTATION_PATH}`);
  }
}

function buildEmail() {
  const name = escapeHtml(emailConfig.recipientName);
  const subject = emailConfig.subject;
  const pStyle = 'style="margin:0 0 18px 0;color:#000000;"';
  const logoExists = fs.existsSync(CLUBHOUSE_LOGO_PATH);
  const headshotExists = fs.existsSync(HEADSHOT_PATH);
  const logoHtml = logoExists ? `<div style="margin:0 0 26px 0;"><img src="cid:clubhouse-logo" alt="Clubhouse Links" width="140" style="display:block;width:140px;height:auto;border:0;"></div>` : '';
  const headshotHtml = headshotExists ? `<td style="vertical-align:top;padding-right:16px;"><img src="cid:evan-headshot" alt="Evan Ligon" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:50%;border:0;"></td>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;"><div style="max-width:680px;margin:0 auto;padding:28px 22px;font-family:Verdana,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#000000;">
${logoHtml}
<p ${pStyle}>Hi ${name},</p>
<p ${pStyle}>It was great speaking with you, and thank you for offering to share this opportunity with the property managers at 4Sight!</p>
<p ${pStyle}>I'm excited to invite your management team to a <strong>Clubhouse Links Lunch &amp; Learn</strong>. I'd love to treat the managers to lunch and give them a live look at a different approach to neighborhood engagement—one that brings HOA communication, community events, resident service requests, and local businesses together in one app.</p>
<div style="margin:0 0 22px 0;padding:18px;background:#f5f8ff;border:1px solid #dbe5ff;border-radius:12px;color:#000000;">
<strong style="font-size:17px;">Lunch & Learn</strong>
<p style="margin:10px 0 0 0;">Instead of another routine software presentation, I'd like to show the team how everyday HOA situations could work through Clubhouse Links, from sending a neighborhood announcement to organizing an event or connecting a resident with a local service provider. There will be plenty of time for questions and feedback.</p></div>
<p ${pStyle}>We can explore how the platform could help managers:</p>
<ul style="margin:0 0 22px 22px;padding:0;color:#000000;">
<li style="margin-bottom:8px;">Communicate important updates and real-time alerts to residents.</li>
<li style="margin-bottom:8px;">Organize neighborhood events, such as game nights or wine nights.</li>
<li style="margin-bottom:8px;">Discover how residents can connect with local service providers, food trucks, and other neighborhood businesses.</li>
<li>We'll also explore different ways we can bring a 90-day pilot opportunity to all participating properties.</li></ul>
<p ${pStyle}>I think the managers will enjoy seeing the app in action and have fun sharing ideas about what would be most useful for the communities they oversee.</p>
<p ${pStyle}><strong>As discussed,If you could share the invitation with the property managers and find out how many will be attending that will be great.</strong> Even a preliminary headcount would help me arrange lunch for everyone and then I can arrange a date and time that works for the team.</p>
<p ${pStyle}>I've also attached a short <strong>Clubhouse Links Workflow Overview</strong> presentation in case anyone would like a preview before we meet.</p>
<p ${pStyle}>Thank you again for helping coordinate this, Alyssa. I'm looking forward to meeting the team!</p>
<p style="margin:28px 0 0 0;">Best regards,</p>
<div style="margin-top:18px;padding-top:22px;border-top:1px solid #e5e7eb;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${headshotHtml}<td style="vertical-align:middle;color:#000000;font-size:14px;line-height:1.55;"><strong style="font-size:16px;">Evan Ligon</strong><br>President &amp; CEO | Clubhouse Links<br>
<a href="https://www.clubhouselinks.com" style="color:#009899;text-decoration:none;">www.ClubhouseLinks.com</a><br>
<a href="mailto:evan.ligon@clubhouselinks.com" style="color:#009899;text-decoration:none;">evan.ligon@clubhouselinks.com</a><br>
<a href="tel:+12145489175" style="color:#009899;text-decoration:none;font-weight:700;">214-548-9175</a><br>
<a href="https://apps.apple.com/us/app/clubhouse-links/id6790003233" style="color:#009899;text-decoration:none;">Clubhouse Links on the App Store</a></td></tr></table></div>
</div></body></html>`;
  const text = `Hi ${emailConfig.recipientName},

It was great speaking with you, and thank you for offering to share this opportunity with the property managers at 4Sight!

I'm excited to invite your management team to a Clubhouse Links Lunch & Learn. I'd love to treat the managers to lunch and give them a live look at a different approach to neighborhood engagement—one that brings HOA communication, community events, resident service requests, and local businesses together in one app.

Instead of another routine software presentation, I'd like to show the team how everyday HOA situations could work through Clubhouse Links, from sending a neighborhood announcement to organizing an event or connecting a resident with a local service provider. There will be plenty of time for questions and feedback.

We'll explore important updates and real-time alerts, neighborhood events and vendor visits, resident service requests, and our 90-day pilot opportunity across three selected communities.

I think the managers will enjoy seeing the app in action and sharing ideas about what would be most useful for the communities they oversee.

Could you share the invitation with the management team and get a count of how many managers would be interested in attending? Even a preliminary headcount would help me arrange lunch for everyone. Once we know the level of interest, we can choose a date and time that works for the team.

I've also attached a Clubhouse Links Workflow Overview presentation in case anyone would like a preview before we meet.

Thank you again for helping coordinate this, Alyssa. I'm looking forward to meeting the team!

Best regards,
Evan Ligon
President & CEO | Clubhouse Links
214-548-9175
evan.ligon@clubhouselinks.com
https://www.clubhouselinks.com
https://apps.apple.com/us/app/clubhouse-links/id6790003233`;
  const attachments = [{filename:emailConfig.presentationFilename,path:PRESENTATION_PATH,contentType:"application/pdf"}];
  if (logoExists) attachments.push({filename:"clubhouse-logo.png",path:CLUBHOUSE_LOGO_PATH,cid:"clubhouse-logo"});
  if (headshotExists) attachments.push({filename:"headshot.png",path:HEADSHOT_PATH,cid:"evan-headshot"});
  return {subject,html,text,attachments};
}

async function run() {
  try {
    validate();
    const email = buildEmail();
    const transport = nodemailer.createTransport({
      host:SMTP_HOST, port:SMTP_PORT, secure:SMTP_PORT===465,
      auth:{user:SMTP_USER,pass:SMTP_PASS}
    });
    await transport.verify();
    console.log("Connected to ZeptoMail SMTP.");
    const info = await transport.sendMail({
      from:`"${FROM_NAME}" <${FROM_EMAIL}>`,
      to:emailConfig.recipientEmail,
      replyTo:"evan.ligon@clubhouselinks.com",
      subject:email.subject,
      html:email.html,
      text:email.text,
      attachments:email.attachments
    });
    console.log("✅ 4Sight Lunch & Learn invitation sent:",{
      to:emailConfig.recipientEmail,messageId:info.messageId,
      presentation:emailConfig.presentationFilename
    });
  } catch(err) {
    console.error("❌ 4Sight Lunch & Learn send failed:",err);
    process.exitCode = 1;
  }
}

if (require.main === module) run();
module.exports = {buildEmail};
