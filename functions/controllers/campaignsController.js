const pool = require('../db/db');
const nodemailer = require('nodemailer');
const { sendCampaignEmail } = require('../utils/sendCampaignEmail');
const { decryptPassword } = require('../utils/encryption');
const { getUserSMTPSettings } = require('../utils/smtp');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;


// Reuse the SAME SMTP logic as sendThankYouTemplate
async function getTransporterForUser(userId) {
    let transporter;
    const smtpSettings = await getUserSMTPSettings(userId);

    if (smtpSettings) {
        console.log('Using user-specific SMTP settings...');
        const decryptedPassword = decryptPassword(smtpSettings.smtp_password);

        if (!decryptedPassword) {
            throw new Error('Decrypted SMTP password is invalid');
        }

        transporter = nodemailer.createTransport({
            host: smtpSettings.smtp_host,
            port: smtpSettings.smtp_port,
            secure: false, // TLS / STARTTLS
            auth: {
                user: smtpSettings.smtp_username,
                pass: decryptedPassword,
            },
            tls: { rejectUnauthorized: false },
        });
    } else {
        console.log('Fallback: Using default Gmail SMTP settings...');
        // NEW FALLBACK — Gmail (OAuth2 NOT required since using App Password)
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',   // ✅ Gmail SMTP host
            port: 587,                // ✅ Gmail TLS port
            secure: false,            // STARTTLS (true for port 465 SSL)
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,     // must be an App Password
            },
            tls: {
                rejectUnauthorized: false,
            },
        });


    }

    return { transporter, smtpSettings };
}


exports.resendCampaign = async (req, res) => {
    console.log("📨 Preparing to resend campaign...");

    const { id } = req.params;      // /campaigns/send/:id
    const { userId } = req.body;    // passed from frontend

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // 1️⃣ Fetch the campaign
        const campaignResult = await pool.query(
            `SELECT id, user_id, subject, content, list_ids
             FROM campaigns
             WHERE id = $1`,
            [id]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = campaignResult.rows[0];
        console.log("📧 Campaign found:", campaign);

        const { subject, content, list_ids } = campaign;

        if (!list_ids || list_ids.length === 0) {
            return res.status(400).json({ error: 'This campaign has no lists assigned.' });
        }

        // (Optional) sanity check: ownership
        if (campaign.user_id && Number(campaign.user_id) !== Number(userId)) {
            console.warn(
                `⚠️ resendCampaign: user ${userId} is resending campaign owned by ${campaign.user_id}`
            );
        }

        // 2️⃣ Fetch subscribers in those lists
        console.log("📋 Fetching subscribers for lists:", list_ids);

        const subsResult = await pool.query(
            `SELECT s.id AS subscriber_id, s.email
             FROM subscribers s
             JOIN list_subscribers ls ON s.id = ls.subscriber_id
             WHERE ls.list_id = ANY($1::int[])`,
            [list_ids]
        );

        const subscribers = subsResult.rows;
        console.log("👥 Subscribers found:", subscribers.length);

        if (subscribers.length === 0) {
            return res.json({
                message: "Campaign resend attempted, but there are no subscribers in the selected lists.",
                sentCount: 0,
            });
        }

        // 3️⃣ Get transporter using the SAME logic as Thank-You template
        console.log("🔧 Fetching SMTP settings for user:", userId);
        const { transporter } = await getTransporterForUser(userId);

        // 4️⃣ Loop through subscribers & send using sendCampaignEmail (keeps tracking)
        let sentCount = 0;

        for (const subscriber of subscribers) {
            try {
                console.log(`📤 Sending to ${subscriber.email} (subscriber ${subscriber.subscriber_id})`);

                await sendCampaignEmail(
                    subscriber.email,      // to
                    subject,               // subject
                    content,               // html content
                    campaign.id,           // campaign_id
                    subscriber.subscriber_id, // subscriber_id
                    userId,                // userId / owner
                    transporter            // nodemailer transporter
                    // attachments can be added later here if needed
                );

                sentCount += 1;
            } catch (err) {
                console.error(
                    `⚠️ Skipping subscriber ${subscriber.subscriber_id} (${subscriber.email}) due to error:`,
                    err.message
                );
                // continue to next subscriber
            }
        }

        console.log(`✔️ Resend complete. Successfully sent to ${sentCount} subscribers.`);

        // (Optional) bump send_count on the campaign
        try {
            await pool.query(
                'UPDATE campaigns SET send_count = send_count + $1, updated_at = NOW() WHERE id = $2',
                [sentCount, campaign.id]
            );
        } catch (e) {
            console.warn("⚠️ Failed to increment send_count:", e.message);
        }

        return res.json({
            message: 'Campaign resent successfully',
            sentCount,
        });

    } catch (err) {
        console.error("🔥 CRITICAL ERROR IN resendCampaign:", err);
        return res.status(500).json({ error: 'Failed to resend the campaign' });
    }
};






exports.sendCampaignToLead = async (req, res) => {
    try {
        // 🔹 Make sure we have a clean integer id
        const campaignId = parseInt(req.params.id, 10);
        const { userId, email } = req.body;

        if (!campaignId || !userId || !email) {
            console.log('❌ Missing fields in sendCampaignToLead:', {
                rawId: req.params.id,
                campaignId,
                userId,
                email
            });
            return res
                .status(400)
                .json({ error: "campaignId, userId and email are required" });
        }

        console.log("📨 sendCampaignToLead called:", {
            campaignId,
            userId,
            email
        });

        // 1️⃣ Fetch campaign
        const { rows: campRows } = await pool.query(
            `SELECT id, subject, content, from_address
             FROM campaigns
             WHERE id = $1`,
            [campaignId]
        );

        console.log('🔎 sendCampaignToLead campRows length:', campRows.length);

        const campaign = campRows[0];

        if (!campaign) {
            console.log('❌ No campaign found for id:', campaignId);
            return res.status(404).json({ error: "Campaign not found" });
        }

        console.log('✅ Found campaign for send-to-lead:', {
            id: campaign.id,
            subject: campaign.subject
        });

        // 2️⃣ Fetch SMTP settings if they exist
        const smtpSettings = await getUserSMTPSettings(userId);
        let transporter;

        if (smtpSettings) {
            console.log("📧 Using user SMTP");
            const decryptedPassword = decryptPassword(smtpSettings.smtp_password);

            transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: smtpSettings.smtp_port,
                secure: false,
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword
                },
                tls: { rejectUnauthorized: false }
            });
        } else {
            console.log("📧 Using fallback Gmail SMTP");

            transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: { rejectUnauthorized: false }
            });
        }

        // 3️⃣ Actually send the email now
        await transporter.sendMail({
            from: campaign.from_address || process.env.EMAIL_USER,
            to: email,
            subject: campaign.subject,
            html: campaign.content
        });

        console.log("✅ Email sent to lead:", email);

        // 4️⃣ Create subscriber (if not already)
        await pool.query(
            `INSERT INTO subscribers (name, email, user_id, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
                 ON CONFLICT (email, user_id) DO NOTHING
            `,
            ["Lead", email, userId]
        );

        return res.status(200).json({
            message: "Campaign successfully sent to lead!",
            email
        });
    } catch (error) {
        console.error("❌ sendCampaignToLead ERROR:", error);
        res.status(500).json({
            error: "Failed to send campaign to lead",
            details: error.message
        });
    }
};









const incrementSendCount = async (campaignId, incrementBy = 1) => {
    try {
        await pool.query(
            'UPDATE campaigns SET send_count = send_count + $1 WHERE id = $2',
            [incrementBy, campaignId]
        );
        console.log(`📈 send_count incremented by ${incrementBy} for campaign ${campaignId}`);
    } catch (error) {
        console.error(`Error incrementing send_count for campaign ${campaignId}:`, error);
    }
};

// =====================
// Get a specific campaign by ID
// =====================
exports.getCampaignById = async (req, res) => {
    const { campaignId } = req.params;

    try {
        console.log(`📥 getCampaignById → ${campaignId}`);

        const result = await pool.query(
            'SELECT * FROM campaigns WHERE id = $1',
            [campaignId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching campaign by ID:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
};

// =====================
// Create + immediately send a campaign (Option A style)
// =====================
exports.createCampaign = async (req, res) => {
    const {
        name,
        subject,
        fromAddress = 'noreply@user@yoursite.com',
        listIds,
        content,
        userId,
        attachments = []
    } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        console.log('🆕 createCampaign → payload:', req.body);

        const formattedListIds = Array.isArray(listIds)
            ? listIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n))
            : [];

        if (!formattedListIds.length) {
            return res.status(400).json({ error: 'At least one listId is required' });
        }

        // 1️⃣ Insert campaign into DB
        const result = await pool.query(
            `INSERT INTO campaigns 
             (name, subject, from_address, list_ids, template, messenger, tags, content, 
              url_slug, metadata, send_later, scheduled_date, publish_to_archive, user_id, 
              status, send_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'default', 'email', '', $5, 
                     '', '{}', false, null, false, $6, 'sent', 0, NOW(), NOW())
             RETURNING *`,
            [name, subject, fromAddress, formattedListIds, content, userId]
        );

        const newCampaign = result.rows[0];
        console.log('✅ Campaign inserted:', {
            id: newCampaign.id,
            subject: newCampaign.subject,
            list_ids: newCampaign.list_ids
        });

        // 2️⃣ Fetch subscribers in selected lists
        let totalSent = 0;

        if (newCampaign.status === 'sent') {
            const subsResult = await pool.query(
                `SELECT s.email, s.id AS subscriber_id 
                 FROM subscribers s
                 JOIN list_subscribers ls ON s.id = ls.subscriber_id
                 WHERE ls.list_id = ANY($1::int[])`,
                [formattedListIds]
            );

            const subscribers = subsResult.rows;
            console.log(`👥 Found ${subscribers.length} subscriber(s) for lists:`, formattedListIds);

            if (subscribers.length === 0) {
                return res.status(201).json({
                    message: 'Campaign created, but no subscribers found in the selected lists.',
                    campaign: newCampaign
                });
            }

            // 3️⃣ Configure SMTP (same pattern as thank-you template)
            let transporter;
            const smtpSettings = await getUserSMTPSettings(userId);

            if (smtpSettings) {
                console.log('📨 Using user-specific SMTP settings for createCampaign...', {
                    host: smtpSettings.smtp_host,
                    username: smtpSettings.smtp_username
                });

                const decryptedPassword = decryptPassword(smtpSettings.smtp_password);
                if (!decryptedPassword) {
                    throw new Error('SMTP password decryption failed');
                }

                transporter = nodemailer.createTransport({
                    host: smtpSettings.smtp_host,
                    port: smtpSettings.smtp_port,
                    secure: false,
                    auth: {
                        user: smtpSettings.smtp_username,
                        pass: decryptedPassword
                    },
                    tls: { rejectUnauthorized: false }
                });
            } else {
                console.log('📨 Using fallback Gmail SMTP for createCampaign');
                // NEW FALLBACK — Gmail (OAuth2 NOT required since using App Password)
                transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',   // ✅ Gmail SMTP host
                    port: 587,                // ✅ Gmail TLS port
                    secure: false,            // STARTTLS (true for port 465 SSL)
                    auth: {
                        user: EMAIL_USER,
                        pass: EMAIL_PASS,     // must be an App Password
                    },
                    tls: {
                        rejectUnauthorized: false,
                    },
                });

            }

            // 4️⃣ Send campaign to each subscriber using sendCampaignEmail
            for (const sub of subscribers) {
                try {
                    console.log(`📤 Sending campaign ${newCampaign.id} to ${sub.email}`);
                    await sendCampaignEmail(
                        sub.email,
                        subject,
                        content,
                        newCampaign.id,
                        sub.subscriber_id,
                        userId,
                        transporter,
                        attachments
                    );
                    totalSent++;
                } catch (sendErr) {
                    console.error(
                        `⚠️ Skipping subscriber ${sub.subscriber_id} (${sub.email}) due to error: ${sendErr.message}`
                    );
                    continue;
                }
            }

            await incrementSendCount(newCampaign.id, totalSent);
        }

        res.status(201).json({
            message: `Campaign created successfully and sent to ${totalSent} subscribers`,
            campaign: newCampaign
        });
    } catch (error) {
        console.error('Error creating campaign:', error.message);
        res.status(500).json({ error: 'Failed to create campaign', details: error.message });
    }
};

// =====================
// Update a campaign's lists only
// =====================
exports.updateCampaignById = async (req, res) => {
    const { campaignId } = req.params;
    const { list_ids } = req.body;  // expect an array of ints

    try {
        console.log('🛠 updateCampaignById →', { campaignId, list_ids });

        const campaignResult = await pool.query(
            'SELECT * FROM campaigns WHERE id = $1',
            [campaignId]
        );
        if (campaignResult.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const formattedListIds = Array.isArray(list_ids)
            ? list_ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n))
            : [];

        const result = await pool.query(
            `UPDATE campaigns 
             SET list_ids = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [formattedListIds, campaignId]
        );

        res.status(200).json({
            message: 'Campaign lists updated successfully',
            campaign: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
};

// =====================
// Update campaign status (and send if status → sent)
// =====================
exports.updateCampaignStatus = async (req, res) => {
    const { campaignId } = req.params;
    const { status } = req.body;

    try {
        console.log('🛠 updateCampaignStatus →', { campaignId, status });

        const result = await pool.query(
            'UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, campaignId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const campaign = result.rows[0];

        // Only send if we set it to "sent"
        if (status === 'sent') {
            const listIds = (campaign.list_ids || []).map(id => parseInt(id, 10)).filter(n => !isNaN(n));

            if (!listIds.length) {
                return res.status(400).json({ error: 'This campaign has no lists assigned.' });
            }

            // Fetch subscribers
            const subscribersResult = await pool.query(
                `SELECT s.email, s.id AS subscriber_id 
                 FROM subscribers s
                 JOIN list_subscribers ls ON s.id = ls.subscriber_id
                 WHERE ls.list_id = ANY($1::int[])`,
                [listIds]
            );

            const subscribers = subscribersResult.rows;
            console.log(`👥 Subscribers for campaign ${campaignId}:`, subscribers.length);

            if (!subscribers.length) {
                return res.status(200).json({
                    message: 'Campaign status set to sent, but no subscribers in the lists.'
                });
            }

            // Configure SMTP just like thank-you template
            let transporter;
            const smtpSettings = await getUserSMTPSettings(campaign.user_id);

            if (smtpSettings) {
                console.log('📨 Using user-specific SMTP settings in updateCampaignStatus...', {
                    host: smtpSettings.smtp_host,
                    username: smtpSettings.smtp_username
                });

                const decryptedPassword = decryptPassword(smtpSettings.smtp_password);
                if (!decryptedPassword) {
                    throw new Error('SMTP password decryption failed');
                }

                transporter = nodemailer.createTransport({
                    host: smtpSettings.smtp_host,
                    port: smtpSettings.smtp_port,
                    secure: false,
                    auth: {
                        user: smtpSettings.smtp_username,
                        pass: decryptedPassword,
                    },
                    tls: { rejectUnauthorized: false }
                });
            } else {
                console.log('📨 Using fallback Gmail SMTP in updateCampaignStatus');
                // NEW FALLBACK — Gmail (OAuth2 NOT required since using App Password)
                transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',   // ✅ Gmail SMTP host
                    port: 587,                // ✅ Gmail TLS port
                    secure: false,            // STARTTLS (true for port 465 SSL)
                    auth: {
                        user: EMAIL_USER,
                        pass: EMAIL_PASS,     // must be an App Password
                    },
                    tls: {
                        rejectUnauthorized: false,
                    },
                });


            }

            // Send using sendCampaignEmail helper
            let sentCount = 0;
            for (const sub of subscribers) {
                try {
                    console.log(`📤 Sending campaign ${campaignId} to ${sub.email}`);
                    await sendCampaignEmail(
                        sub.email,
                        campaign.subject,
                        campaign.content,
                        campaign.id,
                        sub.subscriber_id,
                        campaign.user_id,
                        transporter
                    );
                    sentCount++;
                } catch (sendErr) {
                    console.error(
                        `⚠️ Skipping subscriber ${sub.subscriber_id} (${sub.email}) due to error: ${sendErr.message}`
                    );
                    continue;
                }
            }

            await incrementSendCount(campaignId, sentCount);
            return res.status(200).json({
                message: 'Campaign updated and emails sent',
                sent: sentCount
            });
        }

        // If not "sent", just confirm update
        res.status(200).json({ message: 'Campaign status updated', campaign });
    } catch (error) {
        console.error('Error updating campaign status:', error);
        res.status(500).json({ error: 'Failed to update campaign status' });
    }
};

// =====================
// Campaign stats (single campaign)
// =====================
exports.getCampaignStatsByCampaign = async (req, res) => {
    const { campaignId } = req.params;

    try {
        console.log('📊 getCampaignStatsByCampaign →', campaignId);

        const result = await pool.query(
            `SELECT 
                send_count, 
                CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END AS scheduled_count,
                CASE WHEN status = 'draft' THEN 1 ELSE 0 END AS draft_count
             FROM campaigns 
             WHERE id = $1`,
            [campaignId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No stats found for this campaign' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching campaign stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch campaign stats', details: error.message });
    }
};

// =====================
// Campaign stats (per user)
// =====================
exports.getCampaignStatsByUser = async (req, res) => {
    const { userId } = req.params;

    try {
        console.log('📊 getCampaignStatsByUser →', userId);

        const result = await pool.query(
            `SELECT 
                COALESCE(SUM(send_count), 0) AS sent_count,
                COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_count,
                COUNT(*) FILTER (WHERE status = 'draft') AS draft_count
             FROM campaigns 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No campaigns found for this user' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching campaign stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch campaign stats', details: error.message });
    }
};

// =====================
// Get all campaigns for a user
// =====================
exports.getCampaignsByUser = async (req, res) => {
    const { userId } = req.params;

    try {
        console.log('📥 getCampaignsByUser →', userId);

        const result = await pool.query(
            'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No campaigns found for this user' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching campaigns:', error.message);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
};

// =====================
// Get sent campaign emails (from campaign_emails_sent)
// =====================
exports.getSentCampaignsByUser = async (req, res) => {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        console.log('📥 getSentCampaignsByUser →', userId);

        const result = await pool.query(
            `
            SELECT 
                ces.id,
                ces.user_id,
                ces.subscriber_id,
                ces.campaign_id,
                ces.sent_at,
                s.name AS subscriber_name,
                s.email AS subscriber_email,
                ces.subject AS campaign_subject,
                ces.html_preview AS template_preview
            FROM campaign_emails_sent ces
            INNER JOIN subscribers s ON ces.subscriber_id = s.id
            WHERE ces.user_id = $1
            ORDER BY ces.sent_at DESC
            `,
            [userId]
        );

        res.status(200).json({
            emails: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching sent campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch sent campaign emails.' });
    }
};

// =====================
// Simple DB connectivity test
// =====================
exports.testDatabaseConnection = async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({
            message: 'Database connection successful',
            timestamp: result.rows[0]
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
};

