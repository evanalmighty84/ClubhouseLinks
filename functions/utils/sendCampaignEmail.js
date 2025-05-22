const nodemailer = require('nodemailer');
const { getUserSMTPSettings } = require('./smtp');
const { decryptPassword } = require('./encryption');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env




const axios = require('axios');
const path = require('path');

// Convert remote file URL to nodemailer attachment object
const fetchAttachmentFromUrl = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        const contentType = response.headers['content-type'];
        const filename = path.basename(new URL(url).pathname);

        return {
            filename,
            content: Buffer.from(response.data),
            contentType
        };
    } catch (err) {
        console.error('Failed to fetch attachment from Cloudinary:', err.message);
        return null;
    }
};


const sendCampaignEmail = async (to, subject, html, campaignId, subscriberId, userId, externalTransporter = null, attachments = []) => {
    console.log('Sending campaign email...');
    console.log('Subscriber ID:', subscriberId);

    try {
        let transporter = externalTransporter;
        let smtpConfig;
        let decryptedPassword;
        let attempt = 1;

        if (!transporter) {
            const smtpSettings = await getUserSMTPSettings(userId);

            if (smtpSettings) {
                console.log('Using user-specific SMTP settings...');
                try {
                    decryptedPassword = decryptPassword(smtpSettings.smtp_password);
                } catch (decryptionError) {
                    console.error('Decryption failed:', decryptionError.message);
                    throw new Error('Decryption of SMTP password failed');
                }

                if (!decryptedPassword) {
                    throw new Error('Decrypted password is empty or invalid');
                }

                smtpConfig = {
                    host: smtpSettings.smtp_host,
                    port: 587,
                    secure: false,
                    auth: {
                        user: smtpSettings.smtp_username,
                        pass: decryptedPassword
                    },
                    tls: { rejectUnauthorized: false }
                };

                transporter = nodemailer.createTransport(smtpConfig);
            } else {
                console.log('Fallback: Using default Zoho SMTP settings...');
                smtpConfig = {
                    host: 'smtp.zoho.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                };
                transporter = nodemailer.createTransport(smtpConfig);
            }
        }

        const sendEmail = async () => {
            try {
                const appUrl = 'https://www.clubhouselinks.com/server/crm_function';

                const trackingCampaignPixelUrl = `<img src="${appUrl}/api/track/campaign/open/${campaignId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
                const unsubscribeLink = `<p style="text-align: center; color: gray"><a style="color: red; text-align: center" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

                const htmlWithTracking = `${html} ${trackingCampaignPixelUrl} ${unsubscribeLink}`;

                const htmlWithLinkTracking = htmlWithTracking.replace(
                    /<a href="(.*?)"/g,
                    (match, p1) => `<a href="${appUrl}/api/track/campaign/click/${campaignId}/${subscriberId}?redirect=${encodeURIComponent(p1)}"`
                );

                const mailOptions = {
                    from: transporter.options.auth.user,
                    to,
                    subject,
                    html: htmlWithLinkTracking,
                    headers: {
                        'X-Campaign-ID': campaignId,
                        'X-Subscriber-ID': subscriberId
                    }
                };


                await transporter.sendMail(mailOptions);
                console.log('Campaign email sent successfully');
            } catch (error) {
                console.error(`Attempt ${attempt}: Error sending campaign email:`, error);

                if (attempt === 1 && !externalTransporter) {
                    console.log('Retrying with SSL (Port 465)...');
                    smtpConfig.port = 465;
                    smtpConfig.secure = true;
                    transporter = nodemailer.createTransport(smtpConfig);
                    attempt++;
                    await sendEmail();
                } else {
                    throw new Error('Could not send campaign email after retrying');
                }
            }
        };

        await sendEmail();
    } catch (error) {
        console.error('Final error sending campaign email:', error);
        throw new Error('Could not send campaign email');
    }
};

module.exports = { sendCampaignEmail };