const dotenv = require('dotenv');
const { client, messagingServiceSid } = require('../utils/twilioClient');
const pool = require('../db/db');
const nodemailer = require('nodemailer'); // if not already imported
dotenv.config();
const OpenAI = require("openai");


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });



const smsSessions = new Map(); // Simple in-memory session tracking

/* ---------- helpers: canonicalization ---------- */




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



/********************************************
 * HELPERS (clean + multi-industry safe)
 ********************************************/



const canonText = (s) => (s || "").trim().toLowerCase();

/** Split comma-separated lead_type:
 *   "hvac, handyman" → ["hvac","handyman"]
 */
const splitLeadTypes = (s) =>
    (s || "")
        .toLowerCase()
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

const hash = (s) => crypto.createHash("md5").update(canonText(s)).digest("hex");
const digitsOnly = (s) => (s || "").replace(/\D/g, "");

const titleCase = (s) =>
    (s || "").replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());

const truncate = (s, n = 300) =>
    s && s.length > n ? s.slice(0, n - 1) + "…" : s || "";

const formatUSPhone = (s) => {
    const d = digitsOnly(s);
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11 && d.startsWith("1"))
        return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return s || "N/A";
};

const normalizeToE164 = (s) => {
    const d = digitsOnly(s);
    if (!d) return null;
    if (d.length === 11 && d.startsWith("1")) return `+${d}`;
    if (d.length === 10) return `+1${d}`;
    return `+${d}`;
};

const fmtCST = (ts) => {
    try {
        return new Date(ts).toLocaleString("en-US", {
            timeZone: "America/Chicago",
        });
    } catch {
        return ts || "";
    }
};

/********************************************
 * Fetch lead by phone helper
 ********************************************/
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

/********************************************
 * MAIN notifyUsersForLead
 ********************************************/
exports.notifyUsersForLead = async (req, res) => {
    const {
        lead_id,
        phone,
        mobile_phone,
        name,
        author,
        lead_type,
        description,
        city: cityOverride,
        location: locationOverride,
        physical_address: physicalAddrOv,
        timestamp: messageSentAtOv,
    } = req.body || {};

    const hasPhone = phone || mobile_phone;

    // Basic guard
    if (!lead_id && (!hasPhone || !(name || author) || !lead_type)) {
        return res.status(400).json({
            error: "Provide lead_id OR (name AND phone/mobile_phone AND lead_type).",
        });
    }

    try {
        let lead;
        const phoneDigits = digitsOnly(phone || "");

        /** 1) Load by lead_id */
        if (lead_id) {
            const { rows } = await pool.query(
                `SELECT id, author, timestamp, location, city, lead_type, phone, mobile_phone, physical_address, description
                 FROM nextdoor_messages
                 WHERE id = $1`,
                [lead_id]
            );
            lead = rows[0];
        }

        /** 2) If no lead found yet, search by phone */
        if (!lead && phoneDigits) {
            lead =
                (await findByPhone(phoneDigits, "recent_nextdoor_messages")) ||
                (await findByPhone(phoneDigits, "nextdoor_messages"));
        }

        /** 3) Overlay request body */
        const providedName = (name || author || "").trim();
        const providedType = (lead_type || "").trim();

        lead = {
            id: lead?.id ?? null,
            author: providedName || lead?.author || "Unknown",
            timestamp: messageSentAtOv ?? lead?.timestamp ?? null,
            location: locationOverride ?? lead?.location ?? "Unknown",
            city: cityOverride ?? lead?.city ?? null,
            lead_type: providedType || lead?.lead_type || null,
            phone: phone ?? lead?.phone ?? null,
            mobile_phone: mobile_phone ?? lead?.mobile_phone ?? null,
            physical_address: physicalAddrOv ?? lead?.physical_address ?? null,
            description: description ?? lead?.description ?? null,
        };

        /** 4) Canonical fields */
        const city = canonText(lead.city);

        // MULTI-INDUSTRY FIX:
        const leadTypes = splitLeadTypes(lead.lead_type); // ["hvac","handyman"]

        const phones = [];
        if (lead.mobile_phone) phones.push(lead.mobile_phone);
        if (lead.phone) phones.push(lead.phone);

        const deduped = [...new Set(phones.map((p) => formatUSPhone(p)).filter(Boolean))];

        const chosenPhone = digitsOnly(deduped[0] || "");
        const prettyChosenPhone = formatUSPhone(chosenPhone);
        const finalPhysicalAddress = lead.physical_address || null;

        if (!chosenPhone || !city || leadTypes.length === 0) {
            return res.status(200).json({
                message: "Missing phone/city/industry; no alerts sent.",
                lead,
            });
        }

        /** 5) Format SMS phone line */
        const phoneLine =
            deduped.length > 1
                ? deduped
                    .map((p, i) => `${i === 0 ? "📞" : "☎️"} ${p}`)
                    .join("\n")
                : `📞 ${deduped[0]}`;

        /**********************************************
         * SQL — match ANY industry
         **********************************************/
        const usersSql = `
            SELECT id, name, phone_number, industry, subscribed_areas
            FROM users
            WHERE phone_number IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM unnest(coalesce(industry, ARRAY[]::text[])) i
                WHERE lower(i) = ANY($1)
              )
              AND EXISTS (
                SELECT 1
                FROM unnest(coalesce(subscribed_areas, ARRAY[]::text[])) a
                WHERE lower(a) = lower($2)
              )
        `;

        const { rows: users } = await pool.query(usersSql, [leadTypes, city]);

        if (!users.length) {
            return res.status(200).json({
                message: "No matching users for this lead.",
                matchedUsers: 0,
                lead,
            });
        }

        /** 6) Build SMS body */
        const bodyLines = [
            `🔔 New ${leadTypes.map(titleCase).join("/")} lead in ${titleCase(city)}`,
            `👤 ${lead.author || "Unknown"}`,
            lead.timestamp ? `🕒 ${fmtCST(lead.timestamp)} (CST)` : "",
            `📍 ${lead.location || "Unknown"}${
                finalPhysicalAddress ? " • " + finalPhysicalAddress : ""
            }`,
            phoneLine,
            lead.description ? `📝 ${truncate(lead.description, 300)}` : "",
        ].filter(Boolean);

        const text = bodyLines.join("\n");

        /** 7) Dedupe key */
        const leadKey = lead.id
            ? `id:${lead.id}`
            : `ph:${chosenPhone}|city:${city}|types:${leadTypes.join(
                "|"
            )}|n:${hash(lead.author || "")}`;

        /**********************************************
         * 8) Send SMS + store rows
         **********************************************/
        const results = [];

        for (const u of users) {
            try {
                // Per-user dedupe
                const already = await pool.query(
                    `SELECT 1 FROM lead_alerts_sent WHERE post_url = $1 AND user_id = $2`,
                    [leadKey, u.id]
                );

                if (already.rowCount > 0) {
                    results.push({
                        userId: u.id,
                        sent: false,
                        reason: "duplicate",
                    });
                    continue;
                }

                const to = normalizeToE164(u.phone_number);
                if (!to) {
                    results.push({
                        userId: u.id,
                        sent: false,
                        reason: "invalid phone",
                    });
                    continue;
                }

                // Send SMS
                const msg = await client.messages.create({
                    to,
                    body: text,
                    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                });

                /** Build JSON envelope */
                const envelope = {
                    lead_snapshot: {
                        id: lead.id,
                        author: lead.author,
                        city,
                        types: leadTypes, // MULTI-INDUSTRY FIX
                        location: lead.location,
                        physical_address: finalPhysicalAddress,
                        timestamp: lead.timestamp,
                    },
                    phones: {
                        chosen: chosenPhone,
                        chosen_pretty: prettyChosenPhone,
                        original: lead.phone || null,
                    },
                    sms: {
                        sid: msg?.sid || null,
                        to,
                    },
                    composed_text_preview: text,
                };

                await pool.query(
                    `INSERT INTO lead_alerts_sent
                     (post_url, user_id, sent_at, sms_sid, to_number, body, delivery_status, error_message,
                      lead_id, lead_phone, lead_city, lead_type)
                     VALUES
                         ($1, $2, NOW(), $3, $4, $5, 'sent', NULL,
                          $6, $7, $8, $9)
                    `,
                    [
                        leadKey,
                        u.id,
                        msg?.sid || null,
                        to,
                        JSON.stringify(envelope),
                        lead.id || null,
                        formatUSPhone(chosenPhone),
                        city,
                        leadTypes.join(','), // MULTI-INDUSTRY FIX
                    ]
                );

                results.push({
                    userId: u.id,
                    sent: true,
                    sid: msg?.sid || null,
                });
            } catch (e) {
                console.error(`❌ SMS send failed for user ${u.id}:`, e.message);

                const envelope = {
                    lead_snapshot: {
                        id: lead.id,
                        author: lead.author,
                        city,
                        types: leadTypes,
                        location: lead.location,
                        physical_address: finalPhysicalAddress,
                        timestamp: lead.timestamp,
                    },
                    phones: {
                        chosen: chosenPhone,
                        original: lead.phone || null,
                    },
                    send_error: e?.message || String(e),
                    composed_text_preview: text,
                };

                await pool.query(
                    `INSERT INTO lead_alerts_sent
                     (post_url, user_id, sent_at, sms_sid, to_number, body, delivery_status, error_message,
                      lead_id, lead_phone, lead_city, lead_type)
                     VALUES
                         ($1, $2, NOW(), NULL, NULL, $3, 'failed', $4,
                          $5, $6, $7, $8)
                    `,
                    [
                        leadKey,
                        u.id,
                        JSON.stringify(envelope),
                        e?.message || null,
                        lead.id || null,
                        formatUSPhone(chosenPhone),
                        city,
                        leadTypes.join(','), // MULTI-INDUSTRY FIX
                    ]
                );

                results.push({
                    userId: u.id,
                    sent: false,
                    error: e.message,
                });
            }
        }

        return res.status(200).json({
            message: "Alert processing complete",
            matchedUsers: users.length,
            leadKey,
            results,
        });
    } catch (err) {
        console.error("❌ notifyUsersForLead error:", err);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};


exports.testTexasNumber = async (req, res) => {
    try {
        console.log("🔵 Texas Messaging Service test endpoint hit");
        return res.status(200).json({
            success: true,
            message: "Texas Messaging Service is active and reachable."
        });
    } catch (err) {
        console.error("❌ Error in testTexasNumber:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};


exports.messageLead = async (req, res) => {

    try {

        const { lead_id, phone, description, user_id, company_name } = req.body;
        console.log("📨 LOGGING SMS for lead:", lead_id);


        if (!lead_id || !phone || !description || !user_id)
            return res.status(400).json({ error: "Missing required fields" });

        const toPhone = "+1" + phone.replace(/\D/g, "");

        // Fetch user info
        const { rows: userRows } = await pool.query(
            `SELECT id, name, company_name FROM users WHERE id = $1`,
            [user_id]
        );

        const user = userRows[0];
        if (!user) return res.status(404).json({ error: "User not found" });

        //---------------------------------------------------------
        // ⭐ AI-generated message only (NO fallback)
        //---------------------------------------------------------
        const prompt = `
Write a friendly SMS under 320 characters.
Sender: ${user.name} from ${company_name}

Lead posted: "${description}"
Tone: casual, helpful, offer a quote if relevant.
        `;

        const completion = await openai.responses.create({
            model: "gpt-4o-mini",
            input: prompt,
        });

        const messageBody = completion.output?.[0]?.content?.[0]?.text?.trim();

        if (!messageBody) {
            // This forces the UI to show “Failed to send”
            return res.status(500).json({
                error: "AI did not generate a message. Please try Open Chat instead."
            });
        }

        //---------------------------------------------------------
        // ⭐ Send SMS
        //---------------------------------------------------------
        const sms = await client.messages.create({
            body: messageBody,
            to: toPhone,
            messagingServiceSid,
            statusCallback: `${process.env.BASE_URL}/server/lead_function/api/smsqueue/status-callback`,
        });

        //---------------------------------------------------------
        // ⭐ Log message
        //---------------------------------------------------------
        await pool.query(
            `INSERT INTO lead_sms (lead_id, user_id, from_number, to_number, message_body, direction, status)
             VALUES ($1, $2, $3, $4, $5, 'outbound', 'sent')`,
            [lead_id, user.id, process.env.TWILIO_NUMBER, toPhone, messageBody]
        );

        //---------------------------------------------------------
        // ⭐ Respond OK
        //---------------------------------------------------------
        res.json({ success: true, message_sid: sms.sid, body: messageBody });

    } catch (err) {
        console.error("❌ messageLead error:", err);
        return res.status(500).json({ error: "Failed to send message. Try Open Chat instead." });
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
        console.log("BODY RECEIVED:", req.body);

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


exports.sendLeadReply = async (req, res) => {
    try {
        const { lead_id, message, user_id } = req.body;

        if (!lead_id || !message || !user_id)
            return res.status(400).json({ error: "Missing lead_id, message, or user_id" });

        const { rows: leadRows } = await pool.query(
            `SELECT phone FROM familytreenow WHERE id = $1`,
            [lead_id]
        );
        const lead = leadRows[0];
        if (!lead?.phone)
            return res.status(404).json({ error: "Lead not found" });

        const toPhone = "+1" + lead.phone.replace(/\D/g, "");

        const { rows: userRows } = await pool.query(
            `SELECT id, phone_number FROM users WHERE id = $1`,
            [user_id]
        );
        const user = userRows[0];
        if (!user?.phone_number)
            return res.status(400).json({ error: "User has no phone number set" });

        const fromNumber = user.phone_number;

        const sms = await client.messages.create({
            body: message,
            to: toPhone,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            statusCallback: `${process.env.BASE_URL}/server/lead_function/api/smsqueue/status-callback`,
        });

        await pool.query(
            `INSERT INTO lead_sms
             (lead_id, user_id, from_number, to_number, message_body, direction, status)
             VALUES ($1, $2, $3, $4, $5, 'outbound', 'sent')`,
            [lead_id, user.id, fromNumber, toPhone, message]
        );

        return res.json({ success: true, message_sid: sms.sid });

    } catch (err) {
        console.error("❌ sendLeadReply error:", err);
        return res.status(500).json({ error: "Failed to send reply" });
    }
};




exports.getLeadConversation = async (req, res) => {

    try {
        const { leadId } = req.params;
        console.log("💬 FETCHING conversation for lead:", leadId);


        const { rows } = await pool.query(
            `SELECT id, from_number, to_number, message_body, direction, created_at
             FROM lead_sms
             WHERE lead_id = $1
             ORDER BY created_at ASC`,
            [leadId]
        );

        res.json(rows);

    } catch (err) {
        console.error("❌ getLeadConversation error:", err);
        res.status(500).json({ error: "Failed to fetch conversation" });
    }
};



exports.getNewMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        const { rows } = await pool.query(
            `SELECT l.*
             FROM lead_sms l
             WHERE l.user_id = $1
               AND l.direction = 'inbound'
               AND l.is_new = TRUE
             ORDER BY l.created_at DESC`,
            [userId]
        );

        res.json(rows);
    } catch (err) {
        console.error("❌ getNewMessages error:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};


exports.markMessagesSeen = async (req, res) => {
    try {
        const { messageIds } = req.body;

        if (!messageIds || !messageIds.length)
            return res.status(400).json({ error: "No IDs provided" });

        await pool.query(
            `UPDATE lead_sms SET is_new = FALSE WHERE id = ANY($1::int[])`,
            [messageIds]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("❌ markMessagesSeen error:", err);
        res.status(500).json({ error: "Failed to update messages" });
    }
};

// We'll store a basic in-memory map of phone sessions (you can upgrade this later)

exports.twilioHandleIncomingSMS = async (req, res) => {
    console.log('📩 Incoming SMS payload:', req.body);

    try {
        const fromNumber = req.body.From?.replace(/\D/g, '');
        const incomingMessage = req.body.Body?.trim();
        const lower = incomingMessage?.toLowerCase();

        console.log(`🔍 From: ${fromNumber}, Message: ${incomingMessage}`);

        if (!fromNumber || !incomingMessage) {
            return res.status(400).send('Missing required data');
        }

        // ================= LEAD REPLY HANDLER =================
        const leadLookup = await pool.query(
            `SELECT id AS lead_id, author, phone, company_name
             FROM familytreenow
             WHERE regexp_replace(phone, '\\D', '', 'g') LIKE $1
             ORDER BY id DESC LIMIT 1`,
            [`%${fromNumber.slice(-10)}`]
        );

        const lead = leadLookup.rows[0];

        if (!lead) {
            console.warn("⚠️ No matching lead found for incoming SMS");
            return res.status(200).send(
                `<Response><Message>Your number is not recognized.</Message></Response>`
            );
        }

        await pool.query(
            `INSERT INTO lead_sms (lead_id, from_number, to_number, message_body, direction, is_new)
             VALUES ($1, $2, $3, $4, 'inbound', TRUE)`,
            [
                lead.lead_id,
                fromNumber,
                process.env.TWILIO_NUMBER,
                incomingMessage,
            ]
        );

        // 🛑 STOP HERE — DO NOT RUN USER LOGIC
        return res.status(200).send(
            `<Response><Message>Thanks for your message! We'll get back to you shortly.</Message></Response>`
        );

        // EVERYTHING BELOW THIS WAS REMOVED — because it is broken & unreachable

    } catch (err) {
        console.error('❌ Error handling incoming SMS:', err);
        return res.status(500).send(
            `<Response><Message>Something went wrong. Please try again later.</Message></Response>`
        );
    }
};








