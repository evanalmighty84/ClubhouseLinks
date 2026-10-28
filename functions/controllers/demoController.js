
require("dotenv").config();

const twilio = require("twilio");
const pool = require("../db/db");

// =====================================================
// CLUBHOUSE LINKS - SERVICE LEAD SMS CONTROLLER
// =====================================================

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// September 2026 leads only
const START_DATE = "2026-09-01";
const END_DATE = "2026-10-01";

// Prevent repeated requests
const COOLDOWN_MS = 60 * 1000;
const recentSends = new Map();

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
// HELPERS
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

// Format date without converting between time zones.
// PostgreSQL will already format it.
function cleanDate(value) {
    return value ? String(value) : null;
}

// Find a supported ORIGINAL post-date column.
// We must not label scraped_at as the original post date.
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
// SEND SERVICE LEAD
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

        // ---------------------------------------------
        // Validate
        // ---------------------------------------------

        if (consent !== true) {
            return res.status(400).json({
                success: false,
                error: "SMS consent is required."
            });
        }

        if (
            !process.env.DEMO_ACCESS_CODE ||
            demoCode !== process.env.DEMO_ACCESS_CODE
        ) {
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

        // ---------------------------------------------
        // Cooldown
        // ---------------------------------------------

        const lastSent = recentSends.get(toNumber) || 0;

        if (Date.now() - lastSent < COOLDOWN_MS) {
            return res.status(429).json({
                success: false,
                error: "Please wait before requesting another lead."
            });
        }

        // ---------------------------------------------
        // Determine original post-date availability
        // ---------------------------------------------

        const dateColumn = await getPostDateColumn();

        // dateColumn comes ONLY from the fixed whitelist
        // in getPostDateColumn, never from request input.
        const postedDateExpression = dateColumn
            ? `TO_CHAR(${dateColumn}::timestamp, 'Mon DD, YYYY')`
            : "NULL::text";

        // ---------------------------------------------
        // Get random September FamilyTreeNow lead
        // ---------------------------------------------

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
                error: `No September leads found for ${selectedCategory}.`
            });
        }

        const lead = result.rows[0];

        console.log(
            `✅ Selected lead ${lead.id}, ${lead.city}`
        );

        // ---------------------------------------------
        // Lead details
        // ---------------------------------------------

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

        // ---------------------------------------------
        // Build Clubhouse Links SMS
        // ---------------------------------------------

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

        // ---------------------------------------------
        // Twilio sender
        // ---------------------------------------------

        const sender = process.env.TWILIO_MESSAGING_SERVICE_SID
            ? {
                messagingServiceSid:
                process.env.TWILIO_MESSAGING_SERVICE_SID
            }
            : {
                from: process.env.TWILIO_PHONE_NUMBER
            };

        // ---------------------------------------------
        // Send SMS
        // ---------------------------------------------

        console.log(
            `📲 Sending ${categoryLabel} to ${toNumber}`
        );

        const message = await client.messages.create({
            ...sender,
            to: toNumber,
            body
        });

        recentSends.set(toNumber, Date.now());

        console.log(
            `✅ Lead ${lead.id} submitted to Twilio | ${message.sid}`
        );

        // ---------------------------------------------
        // Response
        // ---------------------------------------------

        return res.status(200).json({
            success: true,
            message: "Lead submitted to Twilio.",
            leadId: lead.id,
            category: selectedCategory,
            city: lead.city,
            postedDate: postedDate,
            capturedDate: capturedDate,
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
