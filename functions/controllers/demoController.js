
require("dotenv").config();

const twilio = require("twilio");
const pool = require("../db/db");

// =====================================================
// CLUBHOUSE LINKS - SMS CONTROLLERS
// =====================================================

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// FamilyTreeNow September 2026 leads
const START_DATE = "2026-09-01";
const END_DATE = "2026-10-01";

// SMS cooldowns
const COOLDOWN_MS = 60 * 1000;
const recentSends = new Map();
const recentHOASends = new Map();

// HOA presentation settings
const HOA_NAME = "Cottonwood Creek";
const HOA_CITY = "Richardson, TX";
const HOA_NEIGHBORHOOD_ID = 68;

// =====================================================
// AVAILABLE INDUSTRIES
// =====================================================

const ALLOWED_CATEGORIES = [
    "handyman",
    "general_contractor",
    "roofer",
    "plumber",
    "electrician",
    "landscaping",
    "lawn_care",
    "house_cleaner",
    "painter",
    "security",
    "gutter",
    "gutters",
    "auto_body",
    "pool",
    "doors",
    "windows",
    "fencing",
    "flooring",
    "garage",
    "tree_service",
    "hvac",
    "pest_control",
    "mold",
    "junk_removal",
    "movers",
    "siding",
    "bookkeeping",
    "realtor",
    "concrete",
    "insulation",
    "appliance_repair",
    "interior_designer",
    "cabinets"
];

// =====================================================
// SHARED HELPERS
// =====================================================

function normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    if (digits.length === 11 && digits.startsWith("1")) {
        return `+${digits}`;
    }

    return null;
}

function formatPhone(value) {
    if (!value) return null;

    const digits = String(value).replace(/\D/g, "");

    const ten = digits.length === 11 && digits.startsWith("1")
        ? digits.slice(1)
        : digits;

    if (ten.length === 10) {
        return `(${ten.slice(0, 3)}) ` +
            `${ten.slice(3, 6)}-${ten.slice(6)}`;
    }

    return String(value).trim();
}

function formatCategory(category) {
    return String(category || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

function categoryEmoji(category) {
    const icons = {
        handyman: "🔧",
        general_contractor: "🏗️",
        roofer: "🏠",
        plumber: "🚰",
        electrician: "⚡",
        landscaping: "🌳",
        lawn_care: "🌱",
        house_cleaner: "🧹",
        painter: "🎨",
        security: "🔒",
        gutter: "🌧️",
        gutters: "🌧️",
        auto_body: "🚗",
        pool: "🏊",
        doors: "🚪",
        windows: "🪟",
        fencing: "🏡",
        flooring: "🪵",
        garage: "🚘",
        tree_service: "🌲",
        hvac: "❄️",
        pest_control: "🐜",
        mold: "🧪",
        junk_removal: "🚛",
        movers: "📦",
        siding: "🏠",
        bookkeeping: "📊",
        realtor: "🏘️",
        concrete: "🧱",
        insulation: "🏡",
        appliance_repair: "🛠️",
        interior_designer: "🛋️",
        cabinets: "🪚"
    };

    return icons[category] || "🛠️";
}

function cleanDate(value) {
    return value ? String(value) : null;
}

function getTwilioSender() {
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        return {
            messagingServiceSid:
            process.env.TWILIO_MESSAGING_SERVICE_SID
        };
    }

    return {
        from: process.env.TWILIO_PHONE_NUMBER
    };
}

function validDemoCode(demoCode) {
    return Boolean(
        process.env.DEMO_ACCESS_CODE &&
        demoCode === process.env.DEMO_ACCESS_CODE
    );
}

// =====================================================
// FIND ORIGINAL POST DATE
// =====================================================

async function getPostDateColumn() {
    const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = ANY(current_schemas(false))
          AND table_name = 'familytreenow'
          AND column_name IN (
              'post_date',
              'posted_at',
              'original_post_date',
              'post_created_at'
          )
    `);

    const available = new Set(
        result.rows.map(r => r.column_name)
    );

    const preference = [
        "post_date",
        "posted_at",
        "original_post_date",
        "post_created_at"
    ];

    return preference.find(c => available.has(c)) || null;
}

// =====================================================
// 1. SEND FAMILYTREENOW SERVICE LEAD
// =====================================================

exports.sendDemoLead = async (req, res) => {
    try {
        const {
            phone,
            category,
            industry,
            consent,
            demoCode
        } = req.body || {};

        const selectedCategory = String(
            category || industry || ""
        ).trim().toLowerCase();

        const toNumber = normalizePhone(phone);

        // ---------------- VALIDATION ----------------

        if (consent !== true) {
            return res.status(400).json({
                success: false,
                error: "SMS consent is required."
            });
        }

        if (!validDemoCode(demoCode)) {
            return res.status(403).json({
                success: false,
                error: "Invalid access code."
            });
        }

        if (!toNumber) {
            return res.status(400).json({
                success: false,
                error: "Invalid mobile phone number."
            });
        }

        if (!ALLOWED_CATEGORIES.includes(selectedCategory)) {
            return res.status(400).json({
                success: false,
                error: "Invalid service category."
            });
        }

        // ---------------- COOLDOWN ----------------

        const lastSent = recentSends.get(toNumber) || 0;

        if (Date.now() - lastSent < COOLDOWN_MS) {
            return res.status(429).json({
                success: false,
                error: "Please wait before requesting another lead."
            });
        }

        // ---------------- DATE COLUMN ----------------

        const dateColumn = await getPostDateColumn();

        const postedDateExpression = dateColumn
            ? `TO_CHAR(${dateColumn}::timestamp, 'Mon DD, YYYY')`
            : "NULL::text";

        // ---------------- FIND LEAD ----------------

        console.log(
            `🔎 Finding September lead: ${selectedCategory}`
        );

        const result = await pool.query(
            `
            SELECT
                id,
                author,
                city,
                phone,
                description,
                lead_type,
                TO_CHAR(
                    scraped_at::timestamp,
                    'Mon DD, YYYY'
                ) AS captured_date,
                ${postedDateExpression} AS posted_date
            FROM familytreenow
            WHERE EXISTS (
                SELECT 1
                FROM regexp_split_to_table(
                    COALESCE(lead_type, ''),
                    '[,/]'
                ) AS category_value
                WHERE LOWER(TRIM(category_value)) = $1
            )
              AND scraped_at >= $2::date
              AND scraped_at < $3::date
              AND description IS NOT NULL
              AND LENGTH(TRIM(description)) >= 20
              AND city IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 1
            `,
            [
                selectedCategory,
                START_DATE,
                END_DATE
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error:
                    `No September leads found for ${selectedCategory}.`
            });
        }

        const lead = result.rows[0];

        console.log(
            `✅ Selected lead ${lead.id}, ${lead.city}`
        );

        // ---------------- LEAD DETAILS ----------------

        const categoryLabel = formatCategory(selectedCategory);
        const emoji = categoryEmoji(selectedCategory);

        const author = String(
            lead.author || "Resident"
        ).trim();

        const city = String(lead.city).trim();
        const leadPhone = formatPhone(lead.phone);

        const description = String(lead.description)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 550);

        const postedDate = cleanDate(lead.posted_date);
        const capturedDate = cleanDate(lead.captured_date);

        // ---------------- SMS BODY ----------------

        const lines = [
            "🏡 CLUBHOUSE LINKS",
            "",
            `🚨 New ${categoryLabel} Lead!`,
            "",
            `${emoji} ${categoryLabel}`,
            `📍 ${city}, TX`,
            `👤 ${author}`
        ];

        if (leadPhone) {
            lines.push(`📞 ${leadPhone}`);
        }

        if (postedDate) {
            lines.push(`📅 Posted: ${postedDate}`);
        } else if (capturedDate) {
            lines.push(`📅 Captured: ${capturedDate}`);
        }

        lines.push(
            "",
            "📝 SERVICE REQUEST",
            description,
            "",
            "━━━━━━━━━━━━━━",
            "✨ CLUBHOUSE LINKS",
            "Connecting local professionals",
            "with neighborhood opportunities."
        );

        const body = lines.join("\n");

        // ---------------- SEND SMS ----------------

        const message = await client.messages.create({
            ...getTwilioSender(),
            to: toNumber,
            body
        });

        recentSends.set(toNumber, Date.now());

        console.log(
            `✅ Lead ${lead.id} submitted to Twilio | ${message.sid}`
        );

        return res.status(200).json({
            success: true,
            message: "Lead submitted to Twilio.",
            leadId: lead.id,
            category: selectedCategory,
            city: lead.city,
            postedDate,
            capturedDate,
            messageSid: message.sid,
            deliveryStatus: message.status
        });

    } catch (error) {
        console.error("❌ Lead SMS error:", {
            message: error.message,
            code: error.code,
            status: error.status,
            detail: error.detail,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: "Unable to send lead SMS."
        });
    }
};

// =====================================================
// 2. COTTONWOOD CREEK HOA BOARD PRESENTATION
// =====================================================

// Three supported HOA communication categories.
// Security alerts are explicitly labeled as sample
// messages to avoid causing an accidental alarm.
const HOA_ALERT_TYPES = {
    event: {
        label: "COMMUNITY EVENT",
        emoji: "🎉",
        title: "Neighborhood Event",
        example:
            "Join your neighbors for a community gathering! " +
            "Watch for additional event information from " +
            "the HOA board."
    },

    meeting: {
        label: "HOA MEETING",
        emoji: "📅",
        title: "Community Meeting",
        example:
            "The Cottonwood Creek HOA invites residents " +
            "to participate in an upcoming community " +
            "meeting. Meeting details will be shared " +
            "by the board."
    },

    security: {
        label: "SECURITY NOTICE",
        emoji: "🛡️",
        title: "Neighborhood Security Update",
        example:
            "This is an example of how the HOA can " +
            "share safety information with residents. " +
            "No actual security incident is being reported."
    }
};

// Accept normal names from the dropdown
function normalizeAlertType(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();

    const aliases = {
        event: "event",
        community_event: "event",
        hoa_event: "event",

        meeting: "meeting",
        hoa_meeting: "meeting",
        board_meeting: "meeting",

        security: "security",
        security_alert: "security",
        safety: "security"
    };

    return aliases[raw] || null;
}

// A presentation message can include optional
// custom wording. Limit it to prevent oversized
// messages and unwanted control characters.
function cleanHOAMessage(value) {
    return String(value || "")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
}

// ---------------- SEND HOA BOARD MESSAGE ----------------

exports.sendHOABoardDemo = async (req, res) => {
    try {
        const {
            phone,
            category,
            alertType,
            message: customMessage,
            consent,
            demoCode
        } = req.body || {};

        // ---------------- VALIDATION ----------------

        if (!validDemoCode(demoCode)) {
            return res.status(403).json({
                success: false,
                error: "Invalid presentation access code."
            });
        }

        if (consent !== true) {
            return res.status(400).json({
                success: false,
                error: "SMS consent is required."
            });
        }

        const toNumber = normalizePhone(phone);

        if (!toNumber) {
            return res.status(400).json({
                success: false,
                error: "Invalid mobile number."
            });
        }

        const selectedType = normalizeAlertType(
            alertType || category
        );

        if (!selectedType) {
            return res.status(400).json({
                success: false,
                error:
                    "Choose event, meeting, or security."
            });
        }

        const configuration = HOA_ALERT_TYPES[selectedType];

        // ---------------- COOLDOWN ----------------

        const lastSent = recentHOASends.get(toNumber) || 0;

        if (Date.now() - lastSent < COOLDOWN_MS) {
            return res.status(429).json({
                success: false,
                error:
                    "Please wait before requesting another HOA notification."
            });
        }

        // ---------------- MESSAGE CONTENT ----------------

        const messageText = cleanHOAMessage(customMessage);

        const announcement = messageText ||
            configuration.example;

        if (announcement.length < 10) {
            return res.status(400).json({
                success: false,
                error: "Announcement is too short."
            });
        }

        // Security messages must remain examples
        // until a board-authorized alert system
        // exists. Never send an unverified incident
        // announcement as if it were a real emergency.
        const securityNotice = selectedType === "security"
            ? "⚠️ SAMPLE SAFETY NOTIFICATION\n" +
            "No verified incident is being reported.\n\n"
            : "";

        // ---------------- SMS BODY ----------------

        const body = [
            "🏡 CLUBHOUSE LINKS",
            "🌳 COTTONWOOD CREEK",
            "",
            "📢 HOA BOARD NOTIFICATION",
            "",
            `${configuration.emoji} ${configuration.label}`,
            `📍 ${HOA_CITY}`,
            "",
            securityNotice + "📝 ANNOUNCEMENT",
            announcement,
            "",
            "━━━━━━━━━━━━━━",
            "🏘️ COTTONWOOD CREEK HOA",
            "Powered by Clubhouse Links",


        ].join("\n");

        // ---------------- SEND SMS ----------------

        console.log(
            `📲 Cottonwood Creek | ${selectedType} | ${toNumber}`
        );

        const sms = await client.messages.create({
            ...getTwilioSender(),
            to: toNumber,
            body
        });

        recentHOASends.set(toNumber, Date.now());

        console.log(
            `✅ HOA notification submitted | ${sms.sid}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Cottonwood Creek notification submitted to Twilio.",
            neighborhood: HOA_NAME,
            neighborhoodId: HOA_NEIGHBORHOOD_ID,
            category: selectedType,
            messageSid: sms.sid,
            deliveryStatus: sms.status
        });

    } catch (error) {
        console.error("❌ HOA notification error:", {
            message: error.message,
            code: error.code,
            status: error.status,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: "Unable to send HOA notification."
        });
    }
};
