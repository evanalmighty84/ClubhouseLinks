// utils/sendCampaignEmail.js
const nodemailer = require('nodemailer');
const { getUserSMTPSettings } = require('./smtp');
const { decryptPassword } = require('./encryption');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// --- TRANSPORTER CACHE (one per user) ---
const transporterCache = new Map();

/**
 * Fetches a remote URL into a Buffer attachment
 */
async function fetchAttachmentFromUrl(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const contentType = res.headers['content-type'];
        const filename = path.basename(new URL(url).pathname);
        return { filename, content: Buffer.from(res.data), contentType };
    } catch (err) {
        console.error('Failed to fetch attachment:', err.message);
        return null;
    }
}

/**
 * Sends a campaign email, reusing a pooled transporter per user.
 *
 * @param {string} to             recipient email address
 * @param {string} subject        email subject
 * @param {string} html           html body (will get pixel + unsubscribe appended)
 * @param {number} campaignId
 * @param {number} subscriberId
 * @param {number} userId         owner of the campaign (for lookup of SMTP)
 * @param {Transporter} [externalTransporter]
 * @param {string[]} [attachmentUrls]
 */
async function sendCampaignEmail(
    to,
    subject,
    html,
    campaignId,
    subscriberId,
    userId,
    externalTransporter = null,
    attachmentUrls = []
) {
    console.log('Sending campaign email... Subscriber ID:', subscriberId);
    if (!to) {
        throw new Error('No `to` address provided');
    }

    // 1) Get or build the transporter
    let transporter = externalTransporter;
    if (!transporter) {
        // reuse one per user
        if (transporterCache.has(userId)) {
            transporter = transporterCache.get(userId);
        } else {
            // build a pooled transporter
            const smtpSettings = await getUserSMTPSettings(userId);
            let config;

            if (smtpSettings) {
                const pass = decryptPassword(smtpSettings.smtp_password);
                config = {
                    host: smtpSettings.smtp_host,
                    port: smtpSettings.smtp_port || 587,
                    secure: false,
                    auth: {
                        user: smtpSettings.smtp_username,
                        pass
                    },
                    tls: { rejectUnauthorized: false },

                    // ==== POOL OPTIONS ====
                    pool: true,
                    maxConnections: 5,
                    maxMessages: Infinity
                };
            } else {
                // fallback Zoho with pooling too
                config = {
                    host: 'smtp.zoho.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: { rejectUnauthorized: false },

                    // ==== POOL OPTIONS ====
                    pool: true,
                    maxConnections: 5,
                    maxMessages: Infinity
                };
            }

            transporter = nodemailer.createTransport(config);
            transporterCache.set(userId, transporter);
        }
    }

    // 2) Build HTML with tracking pixel + unsubscribe + click-tracking
    const appUrl = 'https://www.clubhouselinks.com/server/crm_function';
    const pixel = `<img src="${appUrl}/api/track/campaign/open/${campaignId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
    const unsub = `<p style="text-align:center;color:gray">
                   <a href="${appUrl}/api/unsubscribe/${subscriberId}" style="color:red;">Unsubscribe</a>
                 </p>`;

    let htmlBody = `${html}${pixel}${unsub}`;
    htmlBody = htmlBody.replace(
        /<a href="(.*?)"/g,
        (_, original) =>
            `<a href="${appUrl}/api/track/campaign/click/${campaignId}/${subscriberId}?redirect=${encodeURIComponent(
                original
            )}"`
    );

    // 3) Fetch attachments
    const attachments = (
        await Promise.all(attachmentUrls.map(fetchAttachmentFromUrl))
    ).filter(Boolean);

    // 4) Send
    await transporter.sendMail({
        from: transporter.options.auth.user,
        to,
        subject,
        html: htmlBody,
        attachments,
        headers: {
            'X-Campaign-ID': campaignId,
            'X-Subscriber-ID': subscriberId
        }
    });

    console.log('Campaign email sent successfully');
}

module.exports = { sendCampaignEmail };
