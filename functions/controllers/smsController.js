const dotenv = require('dotenv');
const { client, messagingServiceSid } = require('../utils/twilioClient');
const pool = require('../db/db');

dotenv.config();

const smsSessions = new Map(); // Simple in-memory session tracking

/* ---------- helpers: canonicalization ---------- */
const CANON = {
    'pool': 'pool',
    'handyman': 'handyman',
    'plumber': 'plumber',
    'house cleaner': 'house cleaner',   // keep the label EXACTLY as you store it in users.industry
    'house_cleaner': 'house cleaner',   // normalize inbound variants -> canonical
    'housecleaner': 'house cleaner',
    'roofer': 'roofer',
    'painter': 'painter',
    'lawncare': 'lawncare',
    'electrician': 'electrician',
    'golf instructor': 'golf instructor',
    'pet sitter': 'pet sitter',
    'junk removal': 'junk removal',
    'general contractor': 'general contractor',
    'realtor': 'realtor',
    'insurance': 'insurance',
};

function canonIndustry(s = '') {
    const k = String(s || '').trim().toLowerCase();
    return CANON[k] || k; // fall back to lower
}

function canonText(s = '') {
    return String(s || '').trim();
}

/* ---------- core: notify users for a given lead ---------- */
/**
 * POST /api/sms/notify-lead
 * Body can be:
 *   { post_url: "https://nextdoor..." }
 * or
 *   { lead_id: 123 }
 *
 * We will:
 *  - look up the lead in nextdoor_messages
 *  - if it has a phone number, find users whose:
 *      - industry array contains the lead's type (canonicalized)
 *      - subscribed_areas array contains the lead's city (case-insensitive match)
 *  - send each matching user an SMS with the lead details
 *  - record in lead_alerts_sent to avoid duplicates
 */
exports.notifyUsersForLead = async (req, res) => {
    const { post_url, lead_id } = req.body || {};

    if (!post_url && !lead_id) {
        return res.status(400).json({ error: 'Provide post_url or lead_id' });
    }

    try {
        // 1) Load the lead
        const leadSql = post_url
            ? `SELECT id, post_url, author, city, lead_type, phone, description
           FROM nextdoor_messages
          WHERE post_url = $1`
            : `SELECT id, post_url, author, city, lead_type, phone, description
           FROM nextdoor_messages
          WHERE id = $1`;

        const leadParam = post_url || lead_id;
        const leadResult = await pool.query(leadSql, [leadParam]);
        const lead = leadResult.rows[0];

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        if (!lead.phone || !lead.phone.replace(/\D/g, '')) {
            return res.status(200).json({ message: 'Lead has no phone number; no alerts sent.', lead });
        }

        const city = canonText(lead.city);
        const industry = canonIndustry(lead.lead_type);

        if (!city || !industry) {
            return res.status(200).json({ message: 'Missing city or industry on lead; no alerts sent.', lead });
        }

        // 2) Find candidate users (industry + subscribed area)
        //    - industry: EXISTS in users.industry (case-insensitive)
        //    - area: EXISTS in users.subscribed_areas (case-insensitive)
        const usersSql = `
      SELECT id, name, phone_number, industry, subscribed_areas
        FROM users
       WHERE phone_number IS NOT NULL
         AND EXISTS (
               SELECT 1
                 FROM unnest(coalesce(industry, ARRAY[]::text[])) i
                WHERE lower(i) = lower($1)  -- industry match
         )
         AND EXISTS (
               SELECT 1
                 FROM unnest(coalesce(subscribed_areas, ARRAY[]::text[])) a
                WHERE lower(a) = lower($2)  -- city match
         )
    `;
        const { rows: users } = await pool.query(usersSql, [industry, city]);

        if (!users.length) {
            return res.status(200).json({ message: 'No matching users for this lead.', matchedUsers: 0, lead });
        }

        // 3) Compose the SMS text
        const phonePretty = formatUSPhone(lead.phone);
        const desc = lead.description ? `\n\n📝 Post: ${lead.description}` : '';
        const text = [
            `🔔 New ${industry} lead in ${city}`,
            `👤 ${lead.author || 'Unknown'}`,
            `📞 ${phonePretty}`,
            lead.post_url ? `🔗 ${lead.post_url}` : '',
            desc
        ].filter(Boolean).join('\n');

        // 4) Send + dedupe with lead_alerts_sent
        const results = [];
        for (const u of users) {
            try {
                // Skip if already sent for this (lead, user)
                const already = await pool.query(
                    `SELECT 1 FROM lead_alerts_sent WHERE post_url = $1 AND user_id = $2`,
                    [lead.post_url, u.id]
                );
                if (already.rowCount > 0) {
                    results.push({ userId: u.id, sent: false, reason: 'duplicate' });
                    continue;
                }

                await client.messages.create({
                    to: normalizeToE164(u.phone_number),
                    body: text,
                    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || messagingServiceSid,
                });

                await pool.query(
                    `INSERT INTO lead_alerts_sent (post_url, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [lead.post_url, u.id]
                );

                results.push({ userId: u.id, sent: true });
            } catch (e) {
                console.error(`❌ SMS send failed for user ${u.id}:`, e.message);
                results.push({ userId: u.id, sent: false, error: e.message });
            }
        }

        return res.status(200).json({
            message: 'Alert processing complete',
            matchedUsers: users.length,
            results
        });
    } catch (err) {
        console.error('❌ notifyUsersForLead error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

/* ---------- utilities ---------- */
function normalizeToE164(num = '') {
    const digits = String(num).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.startsWith('+')) return digits;
    // Fallback: best effort
    return `+${digits}`;
}

function formatUSPhone(num = '') {
    const d = String(num).replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
    return num;
}










// Existing - Send SMS immediately
exports.sendSMS = async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Phone number and message are required.' });
    }

    try {
        const result = await client.messages.create({
            body: message,
            to,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        });

        res.status(200).json({ message: 'SMS sent successfully!', sid: result.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS' });
    }
};

// ✅ NEW - Get scheduled SMS for a user
// ✅ Better: Join subscribers to get name & notes directly
exports.getScheduledSMS = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT sq.id, sq.subscriber_id, sq.message, sq.scheduled_time, s.name AS subscriber_name, s.notes
             FROM smsqueue sq
             JOIN subscribers s ON s.id = sq.subscriber_id
             WHERE sq.user_id = $1 AND sq.status = 'pending'`,
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching scheduled SMS:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled SMS' });
    }
};


exports.getAllSMS = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT sq.id, sq.subscriber_id, sq.message, sq.scheduled_time, sq.status, s.name AS subscriber_name, s.notes
             FROM smsqueue sq
             JOIN subscribers s ON s.id = sq.subscriber_id
             WHERE sq.user_id = $1`,
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all SMS:', error);
        res.status(500).json({ error: 'Failed to fetch all SMS' });
    }
};


// smsController.js (append to existing file)

exports.twilioStatusCallback = async (req, res) => {
    try {
        const { MessageSid, MessageStatus } = req.body;

        if (!MessageSid || !MessageStatus) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Optionally log it
        console.log(`Twilio Status Update - SID: ${MessageSid}, Status: ${MessageStatus}`);

        // Optional: If you later store sid in your smsqueue you could update by sid
        // For now, you might want to just log these or enhance later when you store sid

        res.status(200).send('Status received');
    } catch (error) {
        console.error('Error handling Twilio status callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




// We'll store a basic in-memory map of phone sessions (you can upgrade this later)



const nodemailer = require('nodemailer'); // if not already imported



exports.twilioHandleIncomingSMS = async (req, res) => {
    console.log('📩 Incoming SMS payload:', req.body);

    const introMessage = `const introMessage = \`💻 Grow Your Business with Clubhouse Links

🌐 Website – $599
Modern, mobile-ready, SEO-friendly

📧 Email Marketing – $69.99/mo
www.clubhouselinks.com

📲 Text Campaigns – $39.99/mo
Direct, fast, and effective

📣 Social Media – $59.99/mo
Done-for-you posts & strategy

👉 Text LAUNCH to get started or ask questions!
📞 (214) 548-9175\`;
`;


    try {
        const fromNumber = req.body.From?.replace(/\D/g, '');
        const incomingMessage = req.body.Body?.trim();
        const lower = incomingMessage?.toLowerCase();

        console.log(`🔍 From: ${fromNumber}, Message: ${incomingMessage}`);

        if (!fromNumber || !incomingMessage) {
            return res.status(400).send('Missing required data');
        }

        const userResult = await pool.query(
            `SELECT id, name, google_place_id, email FROM users 
             WHERE phone_number IS NOT NULL 
             AND REPLACE(phone_number, '+', '') LIKE $1`,
            [`%${fromNumber.slice(-10)}`]
        );

        const user = userResult.rows[0];
        if (!user) {
            console.warn('⚠️ Unrecognized sender');
            return res.status(200).send(`<Response><Message>Your number is not recognized.</Message></Response>`);
        }

        const session = smsSessions.get(fromNumber);

        // START: Email flow
        if (!session && lower.includes('email')) {
            smsSessions.set(fromNumber, { awaitingEmail: true });
            return res.status(200).send(`<Response><Message>What email should we send your message to?</Message></Response>`);
        }

        if (session?.awaitingEmail && !session.emailAddress) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(incomingMessage)) {
                return res.status(200).send(`<Response><Message>Please provide a valid email address.</Message></Response>`);
            }

            session.emailAddress = incomingMessage;
            session.awaitingType = true;
            smsSessions.set(fromNumber, session);

            return res.status(200).send(`<Response><Message>Would you like to send your Advertisement, Sale, or Review?</Message></Response>`);
        }

        // START: Introduction Flow
        // START: Introduction Flow (Step 1 - ask for number)
        if (!session && lower.includes('introduction')) {
            smsSessions.set(fromNumber, { awaitingIntroNumber: true });

            return res
                .status(200)
                .send(`<Response><Message>What number should we send the business info to?</Message></Response>`);
        }

// Step 2 - validate number and send intro MMS
        if (session?.awaitingIntroNumber) {
            const cleaned = incomingMessage.replace(/\D/g, '');

            if (cleaned.length !== 10) {
                return res
                    .status(200)
                    .send(`<Response><Message>Please enter a valid 10-digit phone number.</Message></Response>`);
            }

            const sendTo = '+1' + cleaned;

            // Send intro MMS to the requested number
            await client.messages.create({
                messagingServiceSid,
                to: sendTo,
                body: introMessage,
                mediaUrl: [
                    'https://res.cloudinary.com/duz4vhtcn/image/upload/v1733523325/Clubhouse_Links_2_zut83w.png'
                ]
            });

            // Send confirmation back to original sender
            smsSessions.delete(fromNumber);

            return res
                .status(200)
                .send(`<Response><Message>✅ Info sent to ${sendTo}</Message></Response>`);
        }
// END: Introduction Flow

// END: Introduction Flow


        if (session?.awaitingType) {
            const type = lower;
            let workflow;
            if (type.includes('advertisement')) workflow = 2;
            else if (type.includes('sale')) workflow = 3;
            else if (type.includes('review')) workflow = 6;
            else return res.status(200).send(`<Response><Message>Please choose: Advertisement, Sale, or Review.</Message></Response>`);

            const templateResult = await pool.query(
                `SELECT content FROM templates 
                 WHERE user_id = $1 AND workflow = $2`,
                [user.id, workflow]
            );

            const template = templateResult.rows[0];
            if (!template?.content) {
                return res.status(200).send(`<Response><Message>No template found for that type.</Message></Response>`);
            }

            // Send email
            const transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: session.emailAddress,
                subject: `${user.name} sent you a message`,
                html: template.content
            });

            smsSessions.delete(fromNumber);
            return res.status(200).send(`<Response><Message>✅ Email sent to ${session.emailAddress}</Message></Response>`);
        }
        // END: Email flow

        // START: Review QR Flow
        if (!session && lower.includes('review')) {
            smsSessions.set(fromNumber, { awaitingNumber: true });
            return res.status(200).send(`<Response><Message>What number should we send the review QR code to?</Message></Response>`);
        }

        if (session?.awaitingNumber) {
            const cleaned = incomingMessage.replace(/\D/g, '');
            if (cleaned.length < 10) {
                return res.status(200).send(`<Response><Message>Please enter a valid 10-digit number.</Message></Response>`);
            }

            const sendTo = '+1' + cleaned;
            const reviewLink = `https://search.google.com/local/writereview?placeid=${user.google_place_id}`;
            const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(reviewLink)}`;

            await client.messages.create({
                messagingServiceSid,
                to: sendTo,
                body: `${user.name} would appreciate your review!\n${reviewLink}`,
                mediaUrl: [qrCodeUrl]
            });

            smsSessions.delete(fromNumber);

            return res.status(200).send(`<Response><Message>✅ Review link sent to ${sendTo}</Message></Response>`);
        }
        // END: Review QR Flow

        return res.status(200).send(`<Response><Message>Send "review" or "email" to begin.</Message></Response>`);
    } catch (err) {
        console.error('❌ Error handling incoming SMS:', err);
        res.status(500).send(`<Response><Message>Something went wrong. Please try again later.</Message></Response>`);
    }
};







