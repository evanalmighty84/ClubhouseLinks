const nodemailer = require('nodemailer');
const { getUserSMTPSettings } = require('./smtp');
const { decryptPassword } = require('./encryption');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// Cache one transporter per user to reuse the same SMTP connection
const transporterCache = new Map();

async function getTransporterForUser(userId) {
    if (transporterCache.has(userId)) {
        return transporterCache.get(userId);
    }

    const smtpSettings = await getUserSMTPSettings(userId);
    let config;

    if (smtpSettings) {
        // User-specific SMTP
        const password = decryptPassword(smtpSettings.smtp_password);
        config = {
            host: smtpSettings.smtp_host,
            port: 587,
            secure: false,
            auth: { user: smtpSettings.smtp_username, pass: password },
            tls: { rejectUnauthorized: false },
            pool: true,
            maxConnections: 5,
            maxMessages: Infinity
        };
    } else {
        // Fallback to default Zoho
        config = {
            host: 'smtp.zoho.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: { rejectUnauthorized: false },
            pool: true,
            maxConnections: 5,
            maxMessages: Infinity
        };
    }

    const transporter = nodemailer.createTransport(config);
    transporterCache.set(userId, transporter);
    return transporter;
}

// Fetch a remote image into an attachment buffer
async function fetchAttachmentFromUrl(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'];
        const filename = path.basename(new URL(url).pathname);
        return { filename, content: Buffer.from(response.data), contentType };
    } catch (err) {
        console.error('Failed to fetch attachment:', err.message);
        return null;
    }
}

/**
 * Send a campaign email, with tracking pixel + unsubscribe link and optional attachments.
 * Reuses a pooled transporter per user.
 */
async function sendCampaignEmail({
                                     to,
                                     subject,
                                     html,
                                     campaignId,
                                     subscriberId,
                                     userId,
                                     attachmentUrls = []
                                 }) {
    console.log('Sending campaign email... Subscriber ID:', subscriberId);

    const transporter = await getTransporterForUser(userId);

    // Build tracking pixel and unsubscribe
    const appUrl = 'https://www.clubhouselinks.com/server/crm_function';
    const trackingPixel =
        `<img src="${appUrl}/api/track/campaign/open/${campaignId}/${subscriberId}?rand=${Math.random()}" ` +
        'width="1" height="1" style="display:none;" />';
    const unsubscribe =
        `<p style="text-align:center;color:gray"><a ` +
        `href="${appUrl}/api/unsubscribe/${subscriberId}" style="color:red;">Unsubscribe</a></p>`;

    // Inject pixel & unsubscribe into HTML
    let htmlBody = `${html}${trackingPixel}${unsubscribe}`;
    // Rewrite all <a href="..."> to track clicks
    htmlBody = htmlBody.replace(
        /<a href="(.*?)"/g,
        (_, originalUrl) =>
            `<a href="${appUrl}/api/track/campaign/click/${campaignId}/${subscriberId}?redirect=${encodeURIComponent(
                originalUrl
            )}"`
    );

    // Prepare attachments
    const attachments = (
        await Promise.all(attachmentUrls.map(fetchAttachmentFromUrl))
    ).filter(Boolean);

    // Send mail
    await transporter.sendMail({
        from: transporter.options.auth.user,
        to,
        subject,
        html: htmlBody,
        attachments
    });

    console.log('Campaign email sent successfully');
}

module.exports = { sendCampaignEmail };
