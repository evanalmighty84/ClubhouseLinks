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



/* ---------- core: notify users for a given lead ---------- */
/**
 * POST /api/smsqueue/alert-lead
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
// controller/notifyUsersForLead.js
const crypto = require('crypto');
// assume you already have: const pool = require('./../../../db/db');



const canonText = (s) => (s || '').trim().toLowerCase();
const hash = (s) => crypto.createHash('md5').update(canonText(s)).digest('hex');
const digitsOnly = (s) => (s || '').replace(/\D/g, '');
const titleCase = (s) => (s || '').replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
const truncate = (s, n = 300) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const formatUSPhone = (s) => {
    const d = digitsOnly(s);
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
    return s || 'N/A';
};
const normalizeToE164 = (s) => {
    const d = digitsOnly(s);
    if (!d) return null;
    return d.length === 11 && d.startsWith('1') ? `+${d}` : d.length === 10 ? `+1${d}` : `+${d}`;
};
const canonIndustry = (s) => {
    const v = canonText(s);
    // map aliases if needed
    if (['pool', 'pool service', 'pool maintenance'].includes(v)) return 'pool';
    if (['handyman', 'plumber', 'plumbing'].includes(v)) return 'handyman';
    if (['housecleaner', 'house cleaning', 'maid', 'cleaner'].includes(v)) return 'housecleaner';
    if (['lawncare', 'lawn care', 'landscaping'].includes(v)) return 'lawncare';
    return v || null;
};
const fmtCST = (ts) => {
    try {
        return new Date(ts).toLocaleString('en-US', { timeZone: 'America/Chicago' });
    } catch { return ts || ''; }
};

// Assumes helpers exist: pool, client (twilio), digitsOnly, hash, titleCase, truncate,
// formatUSPhone, normalizeToE164, fmtCST, canonText, canonIndustry

async function findByPhone(phoneDigits, table) {
    const { rows } = await pool.query(
        `
    SELECT id, author, timestamp, location, city, lead_type, phone, physical_address, description
      FROM ${table}
     WHERE regexp_replace(coalesce(phone,''), '\\D','','g') = $1
     ORDER BY timestamp DESC NULLS LAST
     LIMIT 1
    `,
        [phoneDigits]
    );
    return rows[0];
}

exports.notifyUsersForLead = async (req, res) => {
    const {
        lead_id,
        phone,
        name,            // REQUIRED when no lead_id (author/name)
        author,          // alias for name
        lead_type,       // REQUIRED when no lead_id
        description,     // optional
        city: cityOverride,                 // optional override
        location: locationOverride,         // optional override
        physical_address: physicalAddrOv,   // optional override
        timestamp: messageSentAtOv    // optional override
    } = req.body || {};

    // Keep your original "either lead_id OR (name & phone & lead_type)" guard.
    // With server-only approach, we DO require phone if there's no lead_id.
    const hasPhone = phone || mobile_phone;

    if (!lead_id && (!hasPhone || !(name || author) || !lead_type)) {
        return res.status(400).json({
            error: 'Provide lead_id OR (name AND phone/mobile_phone AND lead_type).'
        });
    }


    try {
        const phoneDigits = digitsOnly(phone || '');
        let lead;

        // 1) If lead_id provided, load from nextdoor_messages
        if (lead_id) {
            const { rows } = await pool.query(
                `SELECT id, author, timestamp, location, city, lead_type, phone, mobile_phone, physical_address, description
           FROM nextdoor_messages
          WHERE id = $1`,
                [lead_id]
            );
            lead = rows[0];
        }

        // 2) If no lead yet and we have a phone, try to fetch most recent by phone
        if (!lead && phoneDigits) {
            lead =
                (await findByPhone(phoneDigits, 'recent_nextdoor_messages')) ||
                (await findByPhone(phoneDigits, 'nextdoor_messages'));
        }

        // 3) Overlay request body (name/lead_type/etc.) as authoritative
        const providedName = (name || author || '').trim();
        const providedType = (lead_type || '').trim();

        lead = {
            id: lead?.id ?? null,
            author: providedName || lead?.author || 'Unknown',
            timestamp: messageSentAtOv ?? lead?.timestamp ?? null,
            location: locationOverride ?? lead?.location ?? 'Unknown',
            city: cityOverride ?? lead?.city ?? null,
            lead_type: providedType || lead?.lead_type || null,
            phone: phone ?? lead?.phone ?? null,
            mobile_phone: lead?.mobile_phone ?? null,
            physical_address: physicalAddrOv ?? lead?.physical_address ?? null,
            description: description ?? lead?.description ?? null
        };


        // 4) Validate required targeting fields (server-only: no enrichment here)
        const city = canonText(lead.city);
        const industry = canonIndustry(lead.lead_type);

// Prefer mobile_phone when available, fallback to phone
        const chosenPhone = digitsOnly(lead.mobile_phone || lead.phone || '');
        const prettyChosenPhone = formatUSPhone(chosenPhone);
        const finalPhysicalAddress = lead.physical_address || null;

        if (!chosenPhone || !city || !industry) {
            return res.status(200).json({
                message: 'Missing phone/city/industry; no alerts sent.',
                lead
            });
        }

// Format landline and mobile separately for display
        const landline = formatUSPhone(lead.phone || '');
        const mobile = formatUSPhone(lead.mobile_phone || '');
        const showBothPhones = landline && mobile && landline !== mobile;

        const phoneLine = showBothPhones
            ? `📞 ${mobile} (mobile)\n☎️ ${landline} (landline)`
            : mobile
                ? `📞 ${mobile}`
                : landline
                    ? `📞 ${landline}`
                    : '';

// 5) Find candidate users (industry + subscribed city)
        const usersSql = `
  SELECT id, name, phone_number, industry, subscribed_areas
    FROM users
   WHERE phone_number IS NOT NULL
     AND EXISTS (
           SELECT 1 FROM unnest(coalesce(industry, ARRAY[]::text[])) i
            WHERE lower(i) = lower($1)
       )
     AND EXISTS (
           SELECT 1 FROM unnest(coalesce(subscribed_areas, ARRAY[]::text[])) a
            WHERE lower(a) = lower($2)
       )
`;
        const { rows: users } = await pool.query(usersSql, [industry, city]);

        if (!users.length) {
            return res.status(200).json({ message: 'No matching users for this lead.', matchedUsers: 0, lead });
        }

// 6) Compose SMS text with both numbers shown (if available)
        const bodyLines = [
            `🔔 New ${titleCase(industry)} lead in ${titleCase(city)}`,
            `👤 ${lead.author || 'Unknown'}`,
            lead.timestamp ? `🕒 ${fmtCST(lead.timestamp)} (CST)` : '',
            `📍 ${lead.location || 'Unknown'}${finalPhysicalAddress ? ' • ' + finalPhysicalAddress : ''}`,
            phoneLine,
            lead.description ? `📝 ${truncate(lead.description, 300)}` : ''
        ].filter(Boolean);

        const text = bodyLines.join('\n');


        // 7) Dedupe key: prefer id; else phone+city+industry(+name) hash
        const leadKey = lead.id
            ? `id:${lead.id}`
            : `ph:${chosenPhone}|city:${city}|type:${industry}|n:${hash(lead.author || '')}`;

        // 8) Send + record (populate lead_alerts_sent fully)
        const results = [];
        for (const u of users) {
            try {
                // Deduplicate per user
                const already = await pool.query(
                    `SELECT 1 FROM lead_alerts_sent WHERE post_url = $1 AND user_id = $2`,
                    [leadKey, u.id]
                );
                if (already.rowCount > 0) {
                    results.push({ userId: u.id, sent: false, reason: 'duplicate' });
                    continue;
                }

                const to = normalizeToE164(u.phone_number);
                if (!to) {
                    results.push({ userId: u.id, sent: false, reason: 'invalid phone' });
                    continue;
                }

                // Send SMS
                const msg = await client.messages.create({
                    to,
                    body: text,
                    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
                });

                // Build a rich JSON envelope for the body column
                const envelope = {
                    lead_snapshot: {
                        id: lead.id,
                        author: lead.author,
                        city,
                        industry,
                        location: lead.location,
                        physical_address: finalPhysicalAddress,
                        timestamp: lead.timestamp
                    },
                    phones: {
                        chosen: chosenPhone,
                        chosen_pretty: prettyChosenPhone,
                        original: lead.phone || null
                    },
                    sms: {
                        sid: msg?.sid || null,
                        to
                    },
                    composed_text_preview: text
                };

                // Persist a full row (not just post_url,user_id)
                await pool.query(
                    `INSERT INTO lead_alerts_sent
             (post_url, user_id, sent_at, sms_sid, to_number, body, delivery_status, error_message,
              lead_id, lead_phone, lead_city, lead_type)
           VALUES
             ($1,       $2,      NOW(),  $3,      $4,       $5,   $6,              $7,
              $8,      $9,        $10,      $11)`,
                    [
                        leadKey,                          // post_url (dedupe key)
                        u.id,                             // user_id
                        msg?.sid || null,                 // sms_sid
                        to,                               // to_number (subscriber's number)
                        JSON.stringify(envelope),         // body (rich JSON)
                        'sent',                           // delivery_status
                        null,                             // error_message
                        lead.id || null,                  // lead_id (from nextdoor_messages)
                        formatUSPhone(chosenPhone),       // lead_phone (pretty or raw; your call)
                        city,                             // lead_city
                        industry                          // lead_type
                    ]
                );

                results.push({ userId: u.id, sent: true, sid: msg?.sid || null });
            } catch (e) {
                console.error(`❌ SMS send failed for user ${u.id}:`, e.message);

                // Store a failed row too, with error details
                const envelope = {
                    lead_snapshot: {
                        id: lead.id,
                        author: lead.author,
                        city,
                        industry,
                        location: lead.location,
                        physical_address: finalPhysicalAddress,
                        timestamp: lead.timestamp
                    },
                    phones: {
                        chosen: chosenPhone,
                        original: lead.phone || null
                    },
                    send_error: e?.message || String(e),
                    composed_text_preview: text
                };

                await pool.query(
                    `INSERT INTO lead_alerts_sent
             (post_url, user_id, sent_at, sms_sid, to_number, body, delivery_status, error_message,
              lead_id, lead_phone, lead_city, lead_type)
           VALUES
             ($1,       $2,      NOW(),  NULL,    NULL,     $3,   'failed',       $4,
              $5,      $6,        $7,       $8)`,
                    [
                        leadKey,
                        u.id,
                        JSON.stringify(envelope),
                        e?.message || null,
                        lead.id || null,
                        formatUSPhone(chosenPhone),
                        city,
                        industry
                    ]
                );

                results.push({ userId: u.id, sent: false, error: e.message });
            }
        }

        return res.status(200).json({
            message: 'Alert processing complete',
            matchedUsers: users.length,
            leadKey,
            results
        });
    } catch (err) {
        console.error('❌ notifyUsersForLead error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};







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







