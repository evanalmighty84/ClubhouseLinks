const dotenv = require('dotenv');
const { client, messagingServiceSid , texasMessagingServiceSid } = require('../utils/twilioClient');
const pool = require('../db/db');
const nodemailer = require('nodemailer'); // if not already imported
dotenv.config();
const OpenAI = require("openai");


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });





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



exports.incomingTwilioWebhook = async (req, res) => {
    try {
        const from = digitsOnly(req.body.From || "");
        const body = (req.body.Body || "").trim();

        if (!from || !body) {
            return res.sendStatus(200);
        }

        console.log("📩 Incoming SMS from:", from, "| Body:", body);

        // 1️⃣ Is this a professional replying?
        const { rows: userMatch } = await pool.query(
            `SELECT id, name, company_name
             FROM users
             WHERE regexp_replace(phone_number,'\\D','','g') = $1
             LIMIT 1`,
            [from]
        );

        let label = "Unknown Sender";

        if (userMatch.length) {
            label = `Professional: ${userMatch[0].company_name || userMatch[0].name}`;
        } else {

            // 2️⃣ Is this tied to a sent alert?
            const { rows: alertMatch } = await pool.query(
                `SELECT lead_phone, lead_city, lead_type
                 FROM lead_alerts_sent
                 WHERE regexp_replace(to_number,'\\D','','g') = $1
                 ORDER BY sent_at DESC
                 LIMIT 1`,
                [from]
            );

            if (alertMatch.length) {
                label = `Lead: ${alertMatch[0].lead_type} (${alertMatch[0].lead_city})`;
            }
        }

        // 3️⃣ Forward to Evan (your personal phone)
        await client.messages.create({
            to: "+14699032836", // your personal number
            messagingServiceSid: process.env.TWILIO_TEXAS_MESSAGING_SERVICE_SID,
            body: `📲 ${label}\nFrom: ${from}\n\n${body}`
        });

        res.sendStatus(200);

    } catch (err) {
        console.error("❌ Incoming webhook error:", err.message);
        res.sendStatus(500);
    }
};


/********************************************
 * MAIN notifyUsersForLead
 ********************************************/

/*
exports.notifyUsersForLead = async (req, res) => {
    console.log("🚨 notifyUsersForLead endpoint hit");
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

        /!** 1) Load by lead_id *!/
        if (lead_id) {
            const { rows } = await pool.query(
                `SELECT id, author, timestamp, location, city, lead_type, phone, mobile_phone, physical_address, description
                 FROM nextdoor_messages
                 WHERE id = $1`,
                [lead_id]
            );
            lead = rows[0];
        }



        /!** 3) Overlay request body *!/
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

        /!** 4) Canonical fields *!/
        const city = canonText(lead.city);

        // MULTI-INDUSTRY FIX
        const leadTypes = splitLeadTypes(lead.lead_type); // e.g. ["hvac","handyman"]

        /!** 5) Collect all phones *!/
        const phones = [];
        if (lead.mobile_phone) phones.push(lead.mobile_phone);
        if (lead.phone) phones.push(lead.phone);

        const deduped = [...new Set(phones.map((p) => formatUSPhone(p)).filter(Boolean))];
        const finalPhysicalAddress = lead.physical_address || null;

        // Multi-phone guard
        if (deduped.length === 0 || !city || leadTypes.length === 0) {
            return res.status(200).json({
                message: "Missing phone/city/industry; no alerts sent.",
                lead,
            });
        }

        /!**********************************************
         * SQL — match ANY industry
         **********************************************!/
        const usersSql = `
            SELECT id, name, phone_number, company_name, industry, subscribed_areas
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

        /!**********************************************
         * 8) Send SMS + store rows (MULTI-PHONE VERSION)
         **********************************************!/
        const results = [];

        for (const u of users) {
            const to = normalizeToE164(u.phone_number);
            if (!to) {
                results.push({
                    userId: u.id,
                    sent: false,
                    reason: "invalid phone",
                });
                continue;
            }

            // Send a text FOR EACH PHONE NUMBER FOUND IN THE LEAD
            for (const rawPhone of deduped) {
                const ph = digitsOnly(rawPhone);
                const prettyPh = formatUSPhone(ph);

                // Build SMS body specific to this phone
                const phoneLine = `📞 ${prettyPh}`;

                // Build SMS body
                let text;

                if (lead.lead_type?.toLowerCase() === "prospect") {

                    // 🔵 AI / Networking Prospect Template
                    text = [
                        `Hi this is Evan Ligon.`,
                        `I got your number from the ${u.networking_source || "Plano Chamber of Commerce / LeTip"}.`,
                        ``,
                        `I built a lead generation CRM and thought this lead might be useful to you.`,
                        ``,
                        lead.description ? truncate(lead.description, 250) : "",
                        ``,
                        `If you find value in it, maybe we could meet later this week and talk about subscribing.`,
                        ``,
                        `Thanks!`
                    ].filter(Boolean).join("\n");

                } else {

                    // 🟢 NORMAL CRM ALERT
                    text = [
                        `🔔 New ${leadTypes.map(titleCase).join("/")} lead in ${titleCase(city)}`,
                        `👤 ${lead.author || "Unknown"}`,
                        lead.timestamp ? `🕒 ${fmtCST(lead.timestamp)} (CST)` : "",
                        `📍 ${lead.location || "Unknown"}${
                            finalPhysicalAddress ? " • " + finalPhysicalAddress : ""
                        }`,
                        phoneLine,
                        lead.description ? `📝 ${truncate(lead.description, 300)}` : ""
                    ].filter(Boolean).join("\n");
                }


                // Per-phone dedupe key
                const perPhoneLeadKey = lead.id
                    ? `id:${lead.id}|ph:${ph}`
                    : `ph:${ph}|city:${city}|types:${leadTypes.join("|")}|n:${hash(lead.author || "")}`;

                // Duplicate check
                const already = await pool.query(
                    `SELECT 1 FROM lead_alerts_sent WHERE post_url = $1 AND user_id = $2`,
                    [perPhoneLeadKey, u.id]
                );

                if (already.rowCount > 0) {
                    results.push({
                        userId: u.id,
                        company_name: u.company_name,
                        phone: prettyPh,
                        sent: false,
                        reason: "duplicate",
                    });
                    continue;
                }

                // Try sending SMS
                try {
                    const msg = await client.messages.create({
                        to,
                        body: text,
                        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                    });

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
                            chosen: ph,
                            chosen_pretty: prettyPh,
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
                            perPhoneLeadKey,
                            u.id,
                            msg.sid,
                            to,
                            JSON.stringify(envelope),
                            lead.id || null,
                            prettyPh,
                            city,
                            leadTypes.join(','),
                        ]
                    );

                    results.push({
                        userId: u.id,
                        company_name: u.company_name, // ✅ THIS FIXES YOUR ISSUE
                        phone: prettyPh,
                        sent: true,
                        sid: msg.sid,
                    });

                } catch (e) {
                    console.error(`❌ SMS send failed for user ${u.id}:`, e.message);

                    await pool.query(
                        `INSERT INTO lead_alerts_sent
                         (post_url, user_id, sent_at, sms_sid, to_number, body, delivery_status, error_message,
                          lead_id, lead_phone, lead_city, lead_type)
                         VALUES
                             ($1, $2, NOW(), NULL, NULL, $3, 'failed', $4,
                              $5, $6, $7, $8)
                        `,
                        [
                            perPhoneLeadKey,
                            u.id,
                            text,
                            e?.message || null,
                            lead.id || null,
                            prettyPh,
                            city,
                            leadTypes.join(','),
                        ]
                    );

                    results.push({
                        userId: u.id,
                        company_name: u.company_name,
                        phone: prettyPh,
                        sent: false,
                        error: e.message,
                    });
                }
            }
        }

        return res.status(200).json({
            message: "Alert processing complete",
            matchedUsers: users.length,
            results,
        });

    } catch (err) {
        console.error("❌ notifyUsersForLead error:", err);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
};
*/

exports.notifyUsersForLead = async (req, res) => {
    console.log("🚨 notifyUsersForLead endpoint hit");
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
        company_name,
        professionalnumbertocall
    } = req.body || {};

    const hasPhone = phone || mobile_phone;

    if (!lead_id && (!hasPhone || !(name || author) || !lead_type)) {
        return res.status(400).json({
            error: "Provide lead_id OR (name AND phone/mobile_phone AND lead_type).",
        });
    }

    try {
        let lead;

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

            // ✅ IMPORTANT FOR PROSPECTS
            company_name: company_name || null,
            professionalnumbertocall: professionalnumbertocall || null,
        };

        const city = canonText(lead.city);
        const leadTypes = splitLeadTypes(lead.lead_type);

        /** Collect phones (still used for normal flow only) */
        const phones = [];
        if (lead.mobile_phone) phones.push(lead.mobile_phone);
        if (lead.phone) phones.push(lead.phone);

        const deduped = [...new Set(phones.map((p) => formatUSPhone(p)).filter(Boolean))];
        const finalPhysicalAddress = lead.physical_address || null;

        /**********************************************
         * 🚨 PROSPECT BYPASS (STRICT — NO FALLBACK)
         **********************************************/
        if (lead.lead_type?.toLowerCase() === "prospect") {

            if (!lead.professionalnumbertocall || !lead.professionalnumbertocall.length) {
                return res.status(200).json({
                    message: "Prospect has no professionalnumbertocall.",
                    lead
                });
            }

            const toNumbers = lead.professionalnumbertocall
                .map(p => normalizeToE164(p))
                .filter(Boolean);

            if (!toNumbers.length) {
                return res.status(200).json({
                    message: "Invalid professional numbers.",
                    lead
                });
            }

            const text = [
                `Hi this is Evan Ligon.`,
                `I got your number from ${lead.company_name || "a networking source"}.`,
                ``,
                lead.description ? truncate(lead.description, 250) : "",
                ``,
                `If you find value in it, maybe we could meet later this week and talk about subscribing.`,
                ``,
                `Thanks!`
            ].filter(Boolean).join("\n");

            const results = [];

            for (const to of toNumbers) {
                try {
                    const msg = await client.messages.create({
                        to,
                        body: text,
                        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                    });

                    results.push({
                        company: lead.company_name,
                        to,
                        sent: true,
                        sid: msg.sid
                    });

                } catch (e) {
                    results.push({
                        company: lead.company_name,
                        to,
                        sent: false,
                        error: e.message
                    });
                }
            }

            return res.status(200).json({
                message: "Prospect SMS sent to company",
                results
            });
        }

        /**********************************************
         * NORMAL CRM FLOW (UNCHANGED)
         **********************************************/

        // Original guard (unchanged for normal leads)
        if (deduped.length === 0 || !city || leadTypes.length === 0) {
            return res.status(200).json({
                message: "Missing phone/city/industry; no alerts sent.",
                lead,
            });
        }

        const usersSql = `
            SELECT id, name, phone_number, company_name, industry, subscribed_areas
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

        const results = [];

        for (const u of users) {
            const to = normalizeToE164(u.phone_number);
            if (!to) continue;

            for (const rawPhone of deduped) {
                const ph = digitsOnly(rawPhone);
                const prettyPh = formatUSPhone(ph);

                const phoneLine = `📞 ${prettyPh}`;

                const text = [
                    `🔔 New ${leadTypes.map(titleCase).join("/")} lead in ${titleCase(city)}`,
                    `👤 ${lead.author || "Unknown"}`,
                    lead.timestamp ? `🕒 ${fmtCST(lead.timestamp)} (CST)` : "",
                    `📍 ${lead.location || "Unknown"}${
                        finalPhysicalAddress ? " • " + finalPhysicalAddress : ""
                    }`,
                    phoneLine,
                    lead.description ? `📝 ${truncate(lead.description, 300)}` : ""
                ].filter(Boolean).join("\n");

                try {
                    const msg = await client.messages.create({
                        to,
                        body: text,
                        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                    });

                    results.push({
                        userId: u.id,
                        company_name: u.company_name,
                        phone: prettyPh,
                        sent: true,
                        sid: msg.sid,
                    });

                } catch (e) {
                    results.push({
                        userId: u.id,
                        sent: false,
                        error: e.message,
                    });
                }
            }
        }

        return res.status(200).json({
            message: "Alert processing complete",
            matchedUsers: users.length,
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




exports.testTexasSmsSend = async (req, res) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({
                success: false,
                error: "Missing 'to' phone number in request body"
            });
        }

        console.log("📤 Testing Texas SMS send to:", to);

        const msg = await client.messages.create({
            to,
            messagingServiceSid: texasMessagingServiceSid,
            body: "This is a test SMS from the Texas Messaging Service 🚀"
        });

        return res.status(200).json({
            success: true,
            sid: msg.sid,
            status: msg.status,
            to: msg.to,
            messagingServiceSid: texasMessagingServiceSid,
            message: "Texas SMS sent successfully"
        });

    } catch (err) {
        console.error("❌ Error testing Texas SMS send:", err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
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




/*exports.getLeadConversation = async (req, res) => {

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
};*/

exports.getLeadConversation = async (req, res) => {
    try {
        const { leadId } = req.params;
        console.log("💬 FETCHING conversation for lead:", leadId);

        const { rows } = await pool.query(
            `SELECT 
                id, 
                from_number, 
                to_number, 
                message_body, 
                media_urls,   -- 🔥 ADD THIS
                direction, 
                created_at
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


/*exports.twilioHandleIncomingSMS = async (req, res) => {
    console.log("📩 Incoming SMS:", req.body);

    try {
        const fromNumber = req.body.From?.replace(/\D/g, "");
        const incomingMessage = req.body.Body?.trim();

        if (!fromNumber || !incomingMessage) {
            return res.status(400).send("Missing required data");
        }

        //-----------------------------------------------------
        // 1️⃣ Check pending choice (contractor replying)
        //-----------------------------------------------------

        const pendingChoice = await pool.query(
            `SELECT * FROM sms_pending_choice
             WHERE professional_phone = $1
             ORDER BY created_at DESC
                 LIMIT 1`,
            [fromNumber]
        );

        if (pendingChoice.rows.length) {
            const choices = pendingChoice.rows[0].choices;

            // If number selection (multi-lead menu)
            const choiceIndex = parseInt(incomingMessage) - 1;

            if (!isNaN(choiceIndex) && choices[choiceIndex]) {
                const selected = choices[choiceIndex];

                await pool.query(
                    `UPDATE sms_pending_choice
                     SET choices = $2, created_at = NOW()
                     WHERE professional_phone = $1`,
                    [
                        fromNumber,
                        JSON.stringify([selected])
                    ]
                );

                return res.send(
                    `<Response><Message>Reply with your message and I’ll send it to this lead.</Message></Response>`
                );
            }

            // Otherwise → send message to selected lead
            const selected = choices?.[0];

            if (selected?.phone) {
                const toPhone = "+1" + selected.phone.replace(/\D/g, "");

                console.log("📤 Sending contractor reply to:", toPhone);

                await client.messages.create({
                    body: incomingMessage,
                    to: toPhone,
                    messagingServiceSid
                });

                await pool.query(
                    `INSERT INTO lead_sms
                    (lead_id, from_number, to_number, message_body, direction)
                     VALUES ($1,$2,$3,$4,'outbound')`,
                    [
                        selected.lead_id,
                        fromNumber,
                        selected.phone,
                        incomingMessage
                    ]
                );

                await pool.query(
                    `DELETE FROM sms_pending_choice
                     WHERE professional_phone = $1`,
                    [fromNumber]
                );

                return res.send(
                    `<Response><Message>✅ Message sent to lead.</Message></Response>`
                );
            }
        }

        //-----------------------------------------------------
        // 2️⃣ Check if message came from a lead
        //-----------------------------------------------------

        const leadLookup = await pool.query(
            `SELECT id AS lead_id, author, phone, professionalnumbertocall
             FROM familytreenow
             WHERE regexp_replace(phone,'\\D','','g') LIKE $1
             ORDER BY id DESC LIMIT 1`,
            [`%${fromNumber.slice(-10)}`]
        );

        const lead = leadLookup.rows[0];

        if (lead) {
            console.log("👤 Lead detected:", lead.author);

            //-------------------------------------------------
            // Log inbound message
            //-------------------------------------------------

            await pool.query(
                `INSERT INTO lead_sms
                     (lead_id, from_number, to_number, message_body, direction, is_new)
                 VALUES ($1,$2,$3,$4,'inbound',TRUE)`,
                [
                    lead.lead_id,
                    fromNumber,
                    process.env.TWILIO_NUMBER,
                    incomingMessage
                ]
            );

            //-------------------------------------------------
            // Get Emily's last message
            //-------------------------------------------------

            const { rows: lastOutbound } = await pool.query(
                `SELECT message_body
                 FROM lead_sms
                 WHERE lead_id = $1
                   AND direction = 'outbound'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [lead.lead_id]
            );

            const emilyMessage = lastOutbound[0]?.message_body || null;

            //-------------------------------------------------
            // Extract contractor phone (handle array)
            //-------------------------------------------------

            const rawPhone = Array.isArray(lead.professionalnumbertocall)
                ? lead.professionalnumbertocall[0]
                : lead.professionalnumbertocall;

            const cleaned = rawPhone?.toString().replace(/\D/g, "");

            if (!cleaned) {
                console.warn("⚠️ Invalid contractor phone");
                return res.send("<Response></Response>");
            }

            const contractorPhone = "+1" + cleaned;

            //-------------------------------------------------
            // Get recent leads for this contractor
            //-------------------------------------------------

            const recentLeads = await pool.query(
                `
                    SELECT DISTINCT ON (f.id) f.id, f.author, f.phone, s.created_at
                    FROM familytreenow f
                        JOIN lead_sms s ON s.lead_id = f.id
                    WHERE s.created_at > NOW() - INTERVAL '2 hours'
                    ORDER BY f.id, s.created_at DESC
                `
            );

            //-------------------------------------------------
            // CASE A: One lead
            //-------------------------------------------------

            if (recentLeads.rows.length === 1) {

                const onlyLead = recentLeads.rows[0];

                await pool.query(
                    `INSERT INTO sms_pending_choice
                    (professional_phone, choices, created_at)
                     VALUES ($1,$2,NOW())
                     ON CONFLICT (professional_phone)
                     DO UPDATE SET choices=$2, created_at=NOW()`,
                    [
                        cleaned,
                        JSON.stringify([{
                            lead_id: onlyLead.id,
                            phone: onlyLead.phone
                        }])
                    ]
                );

                await client.messages.create({
                    to: contractorPhone,
                    messagingServiceSid,
                    body:
                        `📩 Lead replied!

${emilyMessage ? `🧠 Emily said:\n"${emilyMessage}"\n\n` : ""}💬 Lead replied:
"${incomingMessage}"

Lead: ${lead.author}

Reply with your message and I’ll send it to the lead.`
                });

                return res.send("<Response></Response>");
            }

            //-------------------------------------------------
            // CASE B: Multiple leads → menu
            //-------------------------------------------------

            if (recentLeads.rows.length > 1) {

                let message = "You have multiple active leads:\n\n";
                const choices = [];

                recentLeads.rows.forEach((l, i) => {
                    message += `${i + 1}️⃣ ${l.author}\n`;

                    choices.push({
                        lead_id: l.id,
                        phone: l.phone
                    });
                });

                message += "\nReply with the number.";

                await pool.query(
                    `INSERT INTO sms_pending_choice
                    (professional_phone, choices, created_at)
                     VALUES ($1,$2,NOW())
                     ON CONFLICT (professional_phone)
                     DO UPDATE SET choices=$2, created_at=NOW()`,
                    [cleaned, JSON.stringify(choices)]
                );

                await client.messages.create({
                    to: contractorPhone,
                    messagingServiceSid,
                    body: message
                });

                return res.send("<Response></Response>");
            }
        }

        //-----------------------------------------------------
        // 3️⃣ Fallback
        //-----------------------------------------------------

        return res.send(
            `<Response><Message>No active conversation found.</Message></Response>`
        );

    } catch (err) {
        console.error("❌ SMS webhook error:", err);

        return res.status(500).send(
            `<Response><Message>Error processing message.</Message></Response>`
        );
    }
};*/

exports.twilioHandleIncomingSMS = async (req, res) => {
    console.log("📩 Incoming SMS:", req.body);

    try {
        const fromNumber = req.body.From?.replace(/\D/g, "");
        const incomingMessage = req.body.Body?.trim() || "";

        //-----------------------------------------------------
        // 📸 Extract media (images)
        //-----------------------------------------------------

        const numMedia = parseInt(req.body.NumMedia || "0");
        let mediaUrls = [];

        if (numMedia > 0) {
            for (let i = 0; i < numMedia; i++) {
                mediaUrls.push(req.body[`MediaUrl${i}`]);
            }
        }

        if (!fromNumber) {
            return res.status(400).send("Missing required data");
        }

        //-----------------------------------------------------
        // 1️⃣ Contractor replying (pending choice exists)
        //-----------------------------------------------------

        const pendingChoice = await pool.query(
            `SELECT * FROM sms_pending_choice
             WHERE professional_phone = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [fromNumber]
        );

        if (pendingChoice.rows.length) {
            const choices = pendingChoice.rows[0].choices;

            const choiceIndex = parseInt(incomingMessage) - 1;

            if (!isNaN(choiceIndex) && choices[choiceIndex]) {
                const selected = choices[choiceIndex];

                await pool.query(
                    `UPDATE sms_pending_choice
                     SET choices = $2, created_at = NOW()
                     WHERE professional_phone = $1`,
                    [fromNumber, JSON.stringify([selected])]
                );

                return res.send(
                    `<Response><Message>Reply with your message and I’ll send it to this lead.</Message></Response>`
                );
            }

            const selected = choices?.[0];

            if (selected?.phone) {
                const toPhone = "+1" + selected.phone.replace(/\D/g, "");

                console.log("📤 Sending contractor reply to:", toPhone);

                await client.messages.create({
                    body: incomingMessage || "📸 Image attached",
                    to: toPhone,
                    messagingServiceSid,
                    mediaUrl: mediaUrls.length ? mediaUrls : undefined
                });

                await pool.query(
                    `INSERT INTO lead_sms
                    (lead_id, from_number, to_number, message_body, media_urls, direction)
                     VALUES ($1,$2,$3,$4,$5,'outbound')`,
                    [
                        selected.lead_id,
                        fromNumber,
                        selected.phone,
                        incomingMessage,
                        mediaUrls
                    ]
                );

                await pool.query(
                    `DELETE FROM sms_pending_choice
                     WHERE professional_phone = $1`,
                    [fromNumber]
                );

                return res.send(`<Response><Message>✅ Message sent.</Message></Response>`);
            }
        }

        //-----------------------------------------------------
        // 2️⃣ Message from lead
        //-----------------------------------------------------

        const leadLookup = await pool.query(
            `SELECT id AS lead_id, author, phone, professionalnumbertocall
             FROM familytreenow
             WHERE regexp_replace(phone,'\\D','','g') = $1
             ORDER BY id DESC LIMIT 1`,
            [fromNumber.slice(-10)]
        );

        const lead = leadLookup.rows[0];

        if (lead) {

            console.log("👤 Lead detected:", lead.author);

            //-------------------------------------------------
            // Log inbound (with images)
            //-------------------------------------------------

            await pool.query(
                `INSERT INTO lead_sms
                (lead_id, from_number, to_number, message_body, media_urls, direction, is_new)
                 VALUES ($1,$2,$3,$4,$5,'inbound',TRUE)`,
                [
                    lead.lead_id,
                    fromNumber,
                    process.env.TWILIO_NUMBER,
                    incomingMessage,
                    mediaUrls
                ]
            );

            //-------------------------------------------------
            // Get Emily message
            //-------------------------------------------------

            const { rows: lastOutbound } = await pool.query(
                `SELECT message_body
                 FROM lead_sms
                 WHERE lead_id = $1
                   AND direction = 'outbound'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [lead.lead_id]
            );

            const emilyMessage = lastOutbound[0]?.message_body || null;

            //-------------------------------------------------
            // Extract contractor phone
            //-------------------------------------------------

            const rawPhone = Array.isArray(lead.professionalnumbertocall)
                ? lead.professionalnumbertocall[0]
                : lead.professionalnumbertocall;

            const cleaned = rawPhone?.toString().replace(/\D/g, "");

            if (!cleaned) return res.send("<Response></Response>");

            const contractorPhone = "+1" + cleaned;

            //-------------------------------------------------
            // Recent leads
            //-------------------------------------------------

            const recentLeads = await pool.query(
                `
                SELECT DISTINCT ON (f.id) f.id, f.author, f.phone, s.created_at
                FROM familytreenow f
                JOIN lead_sms s ON s.lead_id = f.id
                WHERE s.created_at > NOW() - INTERVAL '2 hours'
                ORDER BY f.id, s.created_at DESC
                `
            );

            //-------------------------------------------------
            // CASE 1: Single lead
            //-------------------------------------------------

            if (recentLeads.rows.length === 1) {

                await pool.query(
                    `INSERT INTO sms_pending_choice
                    (professional_phone, choices, created_at)
                     VALUES ($1,$2,NOW())
                     ON CONFLICT (professional_phone)
                     DO UPDATE SET choices=$2, created_at=NOW()`,
                    [
                        cleaned,
                        JSON.stringify([{
                            lead_id: lead.lead_id,
                            phone: lead.phone
                        }])
                    ]
                );

                await client.messages.create({
                    to: contractorPhone,
                    messagingServiceSid,
                    body:
                        `📩 Lead replied!

${emilyMessage ? `🧠 Emily said:\n"${emilyMessage}"\n\n` : ""}💬 Lead replied:
"${incomingMessage || "📸 Image attached"}"

Lead: ${lead.author}`,
                    mediaUrl: mediaUrls.length ? mediaUrls : undefined
                });

                return res.send("<Response></Response>");
            }

            //-------------------------------------------------
            // CASE 2: Multiple leads
            //-------------------------------------------------

            if (recentLeads.rows.length > 1) {

                let message = "Multiple leads replied:\n\n";
                const choices = [];

                recentLeads.rows.forEach((l, i) => {
                    message += `${i + 1}️⃣ ${l.author}\n`;
                    choices.push({ lead_id: l.id, phone: l.phone });
                });

                message += "\nReply with the number.";

                await pool.query(
                    `INSERT INTO sms_pending_choice
                    (professional_phone, choices, created_at)
                     VALUES ($1,$2,NOW())
                     ON CONFLICT (professional_phone)
                     DO UPDATE SET choices=$2, created_at=NOW()`,
                    [cleaned, JSON.stringify(choices)]
                );

                await client.messages.create({
                    to: contractorPhone,
                    messagingServiceSid,
                    body: message
                });

                return res.send("<Response></Response>");
            }
        }

        //-----------------------------------------------------
        // 3️⃣ Fallback
        //-----------------------------------------------------

        return res.send(`<Response><Message>No active conversation.</Message></Response>`);

    } catch (err) {
        console.error("❌ SMS webhook error:", err);

        return res.status(500).send(
            `<Response><Message>Error processing message.</Message></Response>`
        );
    }
};







