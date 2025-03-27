const nodemailer = require('nodemailer');
const { getUserSMTPSettings } = require('./smtp');
const { decryptPassword } = require('./encryption');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env

// Log the bounce event
const logBounceEvent = async (campaignId, subscriberId, recipientEmail, bounceMessage) => {
    try {
        await pool.query(
            `INSERT INTO email_bounce_events (campaign_id, subscriber_id, recipient_email, bounce_message, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [campaignId, subscriberId, recipientEmail, bounceMessage]
        );
        console.log('Bounce event logged successfully');
    } catch (error) {
        console.error('Error logging bounce event:', error);
    }
};

// Utility function to send campaign emails with tracking and unsubscribe link
const sendCampaignEmail = async (to, subject, html, campaignId, subscriberId, userId) => {
    console.log('Sending campaign email...');
    console.log('Subscriber ID:', subscriberId);

    try {
        let transporter;
        let smtpConfig;
        let decryptedPassword;
        let attempt = 1; // Track connection attempt

        // Fetch the SMTP settings for the user
        const smtpSettings = await getUserSMTPSettings(userId);

        if (smtpSettings) {
            console.log('Using user-specific SMTP settings...');
            try {
                // Attempt to decrypt the user's SMTP password
                decryptedPassword = decryptPassword(smtpSettings.smtp_password);
            } catch (decryptionError) {
                console.error('Decryption failed:', decryptionError.message);
                throw new Error('Decryption of SMTP password failed');
            }

            if (!decryptedPassword) {
                throw new Error('Decrypted password is empty or invalid');
            }

            // First attempt with STARTTLS (Port 587)
            smtpConfig = {
                host: smtpSettings.smtp_host,
                port: 587, // First attempt with STARTTLS
                secure: false, // STARTTLS requires secure=false
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword
                },
                tls: {
                    rejectUnauthorized: false
                }
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

        const sendEmail = async () => {
            try {
                const appUrl = 'https://www.clubhouselinks.com/server/crm_function';

                // Add tracking pixel for email opens
                const trackingCampaignPixelUrl = `<img src="${appUrl}/api/track/campaign/open/${campaignId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
                const unsubscribeLink = `<p style="text-align: center; color: gray"><a style="color: red; text-align: center" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

                // Combine HTML content with tracking pixel and unsubscribe link
                const htmlWithTracking = `${html} ${trackingCampaignPixelUrl} ${unsubscribeLink}`;

                // Wrap all links for click tracking
                const htmlWithLinkTracking = htmlWithTracking.replace(
                    /<a href="(.*?)"/g,
                    (match, p1) => `<a href="${appUrl}/api/track/campaign/click/${campaignId}/${subscriberId}?redirect=${encodeURIComponent(p1)}"`
                );

                const mailOptions = {
                    from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER,
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

                // If first attempt fails, retry with SSL (Port 465)
                if (attempt === 1) {
                    console.log('Retrying with SSL (Port 465)...');
                    smtpConfig.port = 465;
                    smtpConfig.secure = true; // SSL requires secure=true
                    transporter = nodemailer.createTransport(smtpConfig);
                    attempt++;
                    await sendEmail(); // Retry sending email
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


const advertisementEmail = async (to, subject, html, advertisementId, subscriberId, userId) => {
    console.log('Sending advertisement email...');
    console.log('Subscriber ID:', subscriberId);

    try {
        let transporter;

        // Fetch the SMTP settings for the user
        const smtpSettings = await getUserSMTPSettings(userId);

        if (smtpSettings) {
            console.log('Using user-specific SMTP settings...');
            let decryptedPassword;

            try {
                // Attempt to decrypt the user's SMTP password
                decryptedPassword = decryptPassword(smtpSettings.smtp_password);
            } catch (decryptionError) {
                console.error('Decryption failed:', decryptionError.message);
                throw new Error('Decryption of SMTP password failed');
            }

            // Check if decryptedPassword is valid
            if (!decryptedPassword) {
                throw new Error('Decrypted password is empty or invalid');
            }

            transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: smtpSettings.smtp_port,
                secure: false, // Use TLS
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
        } else {
            console.log('Fallback: Using default Zoho SMTP settings...');
            transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false, // Use STARTTLS
                auth: {
                    user: process.env.EMAIL_USER, // Zoho email
                    pass: process.env.EMAIL_PASS  // Zoho app-specific password
                }
            });
        }

        // Your domain URL (replace with actual)
        const appUrl = 'https://www.clubhouselinks.com/server/crm_function'


        // Add tracking pixel for email opens
        const trackingAdvertisementPixelUrl = `<img src="${appUrl}/api/track/advertisement/open/${advertisementId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;

        // Add unsubscribe link
        const unsubscribeLink = `<p style="text-align: center; color: gray"><a style="color: red; text-align: center" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

        // Combine HTML content with tracking pixel and unsubscribe link
        const htmlWithTracking = `${html} ${trackingAdvertisementPixelUrl} ${unsubscribeLink}`;

        // Wrap all links for click tracking
        const htmlWithLinkTracking = htmlWithTracking.replace(
            /<a href="(.*?)"/g,
            (match, p1) => `<a href="${appUrl}/api/track/campaign/click/${advertisementId}/${subscriberId}?redirect=${encodeURIComponent(p1)}"`
        );

        const mailOptions = {
            from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER, // Sender address
            to,
            subject,
            html: htmlWithLinkTracking, // HTML content with tracking
            headers: {
                'X-Campaign-ID': advertisementId,
                'X-Subscriber-ID': subscriberId
            }
        };

        await transporter.sendMail(mailOptions);
        console.log('Campaign email sent successfully');
    } catch (error) {
        console.error('Error sending campaign email:', error);

        // Log the bounce event to your database
        if (error.responseCode === 550 || error.responseCode === 554) {
            await logBounceEvent(advertisementId, subscriberId, to, error.response || 'SMTP bounce');
        }

        throw new Error('Could not send campaign email');
    }
};

module.exports = { sendCampaignEmail, logBounceEvent, advertisementEmail };
