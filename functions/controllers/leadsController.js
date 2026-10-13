const db = require("../db/db"); // PostgreSQL connection
const  sendEmail  = require("../utils/sendEmail"); // ✅ You'll need this helper (see below)
const moment = require("moment");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

let zeptoTransporter = null;

const REPORT_RECIPIENT_OVERRIDES = {
    "guardian construction and design":
        "Elle@guardiansolutionsconstruction.com",
};

function getZeptoTransporter() {
    const host = String(
        process.env.ZEPTOMAIL_SMTP_HOST || ""
    ).trim();

    const port = Number(
        process.env.ZEPTOMAIL_SMTP_PORT || 587
    );

    const user = String(
        process.env.ZEPTOMAIL_SMTP_USER || ""
    ).trim();

    const password = String(
        process.env.ZEPTOMAIL_SMTP_PASSWORD || ""
    ).trim();

    const fromEmail = String(
        process.env.ZEPTOMAIL_FROM_EMAIL || ""
    ).trim();

    const missingVariables = [];

    if (!host) {
        missingVariables.push(
            "ZEPTOMAIL_SMTP_HOST"
        );
    }

    if (!user) {
        missingVariables.push(
            "ZEPTOMAIL_SMTP_USER"
        );
    }

    if (!password) {
        missingVariables.push(
            "ZEPTOMAIL_SMTP_PASSWORD"
        );
    }

    if (!fromEmail) {
        missingVariables.push(
            "ZEPTOMAIL_FROM_EMAIL"
        );
    }

    if (missingVariables.length) {
        throw new Error(
            `Missing ZeptoMail variables: ${
                missingVariables.join(", ")
            }`
        );
    }

    if (!zeptoTransporter) {
        zeptoTransporter =
            nodemailer.createTransport({
                host,
                port,
                secure: port === 465,

                auth: {
                    user,
                    pass: password
                },

                connectionTimeout: 15_000,
                greetingTimeout: 15_000,
                socketTimeout: 30_000
            });
    }

    return zeptoTransporter;
}

const CHAMBER_DIGEST_SIZE = 10;

function chamberSecretMatches(provided) {
    const configured =
        String(
            process.env.CHAMBER_ALERT_SECRET ||
            ""
        );

    provided =
        String(provided || "");

    if (
        !configured ||
        configured.length !== provided.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(
            configured,
            "utf8"
        ),
        Buffer.from(
            provided,
            "utf8"
        )
    );
}


function escapeChamberHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatChamberIndustry(value) {
    return String(value || "")
        .trim()
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase()
        );
}


async function getOrCreateChamberUnsubscribe(
    email
) {
    const existing =
        await db.query(
            `
                SELECT
                    token,
                    unsubscribed_at

                FROM chamber_email_unsubscribes

                WHERE
                    LOWER(BTRIM(email)) =
                    LOWER(BTRIM($1))

                LIMIT 1;
            `,
            [email]
        );

    if (existing.rows.length) {
        return existing.rows[0];
    }

    try {
        const inserted =
            await db.query(
                `
                    INSERT INTO chamber_email_unsubscribes (
                        email
                    )
                    VALUES ($1)

                    RETURNING
                        token,
                        unsubscribed_at;
                `,
                [email]
            );

        return inserted.rows[0];

    } catch (error) {
        /*
         * Another process may have inserted
         * the same normalized email.
         */
        if (error.code !== "23505") {
            throw error;
        }

        const retry =
            await db.query(
                `
                    SELECT
                        token,
                        unsubscribed_at

                    FROM chamber_email_unsubscribes

                    WHERE
                        LOWER(BTRIM(email)) =
                        LOWER(BTRIM($1))

                    LIMIT 1;
                `,
                [email]
            );

        return retry.rows[0];
    }
}


/**
 * POST /api/leads/send-familytree-alerts
 *
 * Called by the Railway sendFamilyTreeLeadAlerts.js process.
 *
 * Expected headers:
 *   Content-Type: application/json
 *   x-ftn-alert-secret: <FTN_ALERT_SECRET>
 *
 * Expected body:
 * {
 *   "lead_id": 2583,
 *   "user_id": 1660,
 *   "company_name": "Construction With Integrity"
 * }
 */
/**
 * Railway calls this Heroku endpoint to send one FamilyTreeNow
 * lead email through ZeptoMail.
 *
 * Expected request:
 *
 * POST /api/leads/send-familytree-alerts
 *
 * Headers:
 * Content-Type: application/json
 * x-ftn-alert-secret: <FTN_ALERT_SECRET>
 *
 * Body:
 * {
 *     "lead_id": 2583,
 *     "user_id": 1660,
 *     "company_name": "Construction With Integrity"
 * }
 */
exports.sendFamilyTreeAlerts = async (req, res) => {
    try {
        /*
         * --------------------------------------------------------
         * Authenticate the request coming from Railway
         * --------------------------------------------------------
         */

        const configuredSecret = String(
            process.env.FTN_ALERT_SECRET || ""
        );

        const providedSecret = String(
            req.get("x-ftn-alert-secret") || ""
        );

        if (!configuredSecret) {
            console.error(
                "❌ FTN_ALERT_SECRET is not configured on Heroku."
            );

            return res.status(500).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                error:
                    "FamilyTree email endpoint is not configured"
            });
        }

        const configuredBuffer = Buffer.from(
            configuredSecret,
            "utf8"
        );

        const providedBuffer = Buffer.from(
            providedSecret,
            "utf8"
        );

        const secretMatches =
            configuredBuffer.length ===
            providedBuffer.length &&
            crypto.timingSafeEqual(
                configuredBuffer,
                providedBuffer
            );

        if (!secretMatches) {
            console.warn(
                "⚠️ Unauthorized FamilyTree email request rejected."
            );

            return res.status(401).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                error: "Unauthorized"
            });
        }

        /*
         * --------------------------------------------------------
         * Validate the Railway payload
         * --------------------------------------------------------
         */

        const leadId = Number(
            req.body?.lead_id
        );

        const userId = Number(
            req.body?.user_id
        );

        const requestedCompanyName = String(
            req.body?.company_name || ""
        ).trim();

        if (
            !Number.isInteger(leadId) ||
            leadId <= 0
        ) {
            return res.status(400).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                error:
                    "A valid lead_id is required"
            });
        }

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                error:
                    "A valid user_id is required"
            });
        }

        if (!requestedCompanyName) {
            return res.status(400).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                error:
                    "company_name is required"
            });
        }

        console.log(
            "📧 FamilyTree ZeptoMail request received:",
            {
                leadId,
                userId,
                requestedCompanyName
            }
        );

        /*
         * --------------------------------------------------------
         * Load the FamilyTreeNow lead
         * --------------------------------------------------------
         */

        const {
            rows: leadRows
        } = await db.query(
            `
                SELECT
                    id,
                    author,
                    phone,
                    email,
                    lead_type,
                    city,
                    state,
                    description,
                    location,
                    physical_address,
                    company_name,
                    professionalnumbertocall,
                    networkingsource,
                    scraped_at

                FROM familytreenow

                WHERE id = $1

                LIMIT 1;
            `,
            [leadId]
        );

        if (!leadRows.length) {
            console.warn(
                `⚠️ FamilyTreeNow lead ${leadId} was not found.`
            );

            return res.status(404).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                lead_id: leadId,
                error:
                    "FamilyTreeNow lead was not found"
            });
        }

        const lead = leadRows[0];

        /*
         * --------------------------------------------------------
         * Load the exact user selected by the Railway script
         * --------------------------------------------------------
         *
         * Railway already matched familytreenow.company_name
         * against users.company_name.
         *
         * Heroku verifies:
         * - The user exists
         * - alert_email is TRUE
         * - An email exists
         * - The supplied company name matches the user
         * --------------------------------------------------------
         */

        const {
            rows: userRows
        } = await db.query(
            `
                SELECT
                    id,
                    name,
                    company_name,
                    email,
                    phone_number,
                    alert_email

                FROM users

                WHERE id = $1

                  AND COALESCE(
                        alert_email,
                        FALSE
                      ) = TRUE

                  AND NULLIF(
                        BTRIM(email),
                        ''
                      ) IS NOT NULL

                  AND NULLIF(
                        BTRIM(company_name),
                        ''
                      ) IS NOT NULL

                LIMIT 1;
            `,
            [userId]
        );

        if (!userRows.length) {
            console.warn(
                `⚠️ users.id=${userId} is not eligible for email alerts.`
            );

            return res.status(404).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                lead_id: leadId,
                user_id: userId,
                error:
                    "User not found, email missing, or alert_email is not enabled"
            });
        }

        const recipient = userRows[0];

        /*
         * --------------------------------------------------------
         * Normalization and escaping helpers
         * --------------------------------------------------------
         */

        const normalizeCompanyName = (
            value
        ) =>
            String(value || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

        const escapeHtml = (
            value
        ) =>
            String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        const formatLeadType = (
            value
        ) => {
            const values =
                Array.isArray(value)
                    ? value
                    : String(value || "")
                        .split(",");

            const formattedValues =
                values
                    .map((item) =>
                        String(item || "")
                            .trim()
                            .replace(/_/g, " ")
                    )
                    .filter(Boolean)
                    .map((item) =>
                        item.replace(
                            /\b\w/g,
                            (character) =>
                                character.toUpperCase()
                        )
                    );

            return formattedValues.length
                ? formattedValues.join(", ")
                : "Home Service";
        };

        /*
         * --------------------------------------------------------
         * Confirm the requested company matches users.company_name
         * --------------------------------------------------------
         */

        const normalizedRequestedCompany =
            normalizeCompanyName(
                requestedCompanyName
            );

        const normalizedUserCompany =
            normalizeCompanyName(
                recipient.company_name
            );

        if (
            normalizedRequestedCompany !==
            normalizedUserCompany
        ) {
            console.warn(
                "⚠️ FamilyTree user/company validation failed:",
                {
                    requestedCompanyName,
                    userCompanyName:
                    recipient.company_name,
                    userId
                }
            );

            return res.status(409).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                lead_id: leadId,
                user_id: userId,
                requested_company_name:
                requestedCompanyName,
                user_company_name:
                recipient.company_name,
                error:
                    "Requested company does not match the selected user"
            });
        }

        /*
         * Confirm that the requested company also appears on
         * the FamilyTreeNow lead.
         */
        const leadCompanyNames =
            Array.isArray(lead.company_name)
                ? lead.company_name
                : lead.company_name
                    ? [lead.company_name]
                    : [];

        const leadContainsCompany =
            leadCompanyNames.some(
                (companyName) =>
                    normalizeCompanyName(
                        companyName
                    ) ===
                    normalizedRequestedCompany
            );

        if (!leadContainsCompany) {
            console.warn(
                "⚠️ Requested company was not assigned to the lead:",
                {
                    leadId,
                    requestedCompanyName,
                    leadCompanyNames
                }
            );

            return res.status(409).json({
                success: false,
                emails_sent: 0,
                emails_failed: 0,
                lead_id: leadId,
                user_id: userId,
                company_name:
                requestedCompanyName,
                lead_company_names:
                leadCompanyNames,
                error:
                    "Requested company is not assigned to this lead"
            });
        }

        /*
         * --------------------------------------------------------
         * Prepare the lead information
         * --------------------------------------------------------
         */

        const recipientName = String(
            recipient.name || ""
        ).trim();

        const companyName = String(
            recipient.company_name ||
            requestedCompanyName
        ).trim();

        const author = String(
            lead.author || ""
        ).trim() || "Name not provided";

        const leadPhone = String(
            lead.phone || ""
        ).trim() || "Phone not available";

        const leadEmail = String(
            lead.email || ""
        ).trim();

        const leadType = formatLeadType(
            lead.lead_type
        );

        const city = String(
            lead.city || ""
        ).trim();

        const state = String(
            lead.state || ""
        ).trim();

        const cityAndState =
            [city, state]
                .filter(Boolean)
                .join(", ") ||
            "City not provided";

        const physicalLocation = String(
            lead.physical_address ||
            lead.location ||
            ""
        ).trim() || "Location not provided";

        const description = String(
                lead.description || ""
            ).trim() ||
            "No lead description was provided.";

        const greeting =
            recipientName
                ? `Hey ${recipientName},`
                : `Hello ${companyName},`;

        const subject =
            `New ${leadType} Lead for ` +
            `${companyName} — ${cityAndState}`;

        const escapedDescription =
            escapeHtml(
                description
            ).replace(
                /\r?\n/g,
                "<br>"
            );

        const phoneDigits = String(
            lead.phone || ""
        ).replace(
            /\D/g,
            ""
        );

        const normalizedLeadPhone =
            phoneDigits.length >= 10
                ? phoneDigits.slice(-10)
                : "";

        const phoneLink =
            normalizedLeadPhone
                ? `tel:+1${normalizedLeadPhone}`
                : "";

        /*
         * --------------------------------------------------------
         * Neo-punk email HTML
         * --------------------------------------------------------
         */

        const emailHtml = `
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>${escapeHtml(subject)}</title>
</head>

<body style="
    margin:0;
    padding:0;
    background-color:#050510;
    color:#f8fafc;
">
    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="
            width:100%;
            margin:0;
            padding:0;
            background-color:#050510;
        "
    >
        <tr>
            <td
                align="center"
                style="padding:28px 14px;"
            >
                <table
                    role="presentation"
                    width="680"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%;
                        max-width:680px;
                        border-collapse:separate;
                        background-color:#090914;
                        border:1px solid #22d3ee;
                        border-radius:18px;
                        overflow:hidden;
                        box-shadow:
                            0 0 18px rgba(34,211,238,0.35),
                            0 0 36px rgba(255,0,128,0.20);
                    "
                >
                    <tr>
                        <td style="
                            padding:30px 28px 24px;
                            text-align:center;
                            background-color:#111126;
                            border-bottom:1px solid #ff0080;
                        ">
                            <div style="
                                display:inline-block;
                                padding:7px 14px;
                                margin-bottom:16px;
                                border:1px solid #22d3ee;
                                border-radius:999px;
                                color:#22d3ee;
                                font-family:
                                    Arial,
                                    Helvetica,
                                    sans-serif;
                                font-size:12px;
                                font-weight:700;
                                letter-spacing:2px;
                                text-transform:uppercase;
                            ">
                                Clubhouse Links // Lead Transmission
                            </div>

                            <h1 style="
                                margin:0;
                                color:#ffffff;
                                font-family:
                                    Arial,
                                    Helvetica,
                                    sans-serif;
                                font-size:30px;
                                line-height:1.2;
                                font-weight:900;
                                text-transform:uppercase;
                                letter-spacing:1px;
                                text-shadow:
                                    0 0 10px
                                    rgba(34,211,238,0.65);
                            ">
                                New Hot Lead
                            </h1>

                            <div style="
                                margin-top:12px;
                                color:#ff4db8;
                                font-family:
                                    Arial,
                                    Helvetica,
                                    sans-serif;
                                font-size:18px;
                                font-weight:800;
                            ">
                                ${escapeHtml(companyName)}
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding:26px 28px 10px;
                            font-family:
                                Arial,
                                Helvetica,
                                sans-serif;
                        ">
                            <p style="
                                margin:0 0 12px;
                                color:#ffffff;
                                font-size:17px;
                                line-height:1.6;
                            ">
                                ${escapeHtml(greeting)}
                            </p>

                            <p style="
                                margin:0;
                                color:#cbd5e1;
                                font-size:15px;
                                line-height:1.7;
                            ">
                                A new
                                <strong style="color:#22d3ee;">
                                    ${escapeHtml(leadType)}
                                </strong>
                                opportunity has been assigned to
                                <strong style="color:#ff4db8;">
                                    ${escapeHtml(companyName)}
                                </strong>.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:18px 28px 8px;">
                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%;
                                    background-color:#0d1020;
                                    border:1px solid #29324d;
                                    border-left:4px solid #22d3ee;
                                    border-radius:12px;
                                "
                            >
                                <tr>
                                    <td style="
                                        padding:20px;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                    ">
                                        <div style="
                                            margin-bottom:6px;
                                            color:#64748b;
                                            font-size:11px;
                                            font-weight:800;
                                            letter-spacing:1.7px;
                                            text-transform:uppercase;
                                        ">
                                            Homeowner / Author
                                        </div>

                                        <div style="
                                            color:#ffffff;
                                            font-size:24px;
                                            font-weight:900;
                                            line-height:1.25;
                                        ">
                                            ${escapeHtml(author)}
                                        </div>

                                        <div style="
                                            margin-top:8px;
                                            color:#22d3ee;
                                            font-size:15px;
                                            font-weight:700;
                                        ">
                                            ${escapeHtml(leadType)}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:14px 28px 8px;">
                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%;
                                    border-collapse:collapse;
                                    border:1px solid #252a40;
                                    background-color:#090914;
                                "
                            >
                                <tr>
                                    <td style="
                                        width:135px;
                                        padding:14px 16px;
                                        border-bottom:
                                            1px solid #252a40;
                                        color:#ff4db8;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:12px;
                                        font-weight:900;
                                        letter-spacing:1px;
                                        text-transform:uppercase;
                                        vertical-align:top;
                                    ">
                                        Company
                                    </td>

                                    <td style="
                                        padding:14px 16px;
                                        border-bottom:
                                            1px solid #252a40;
                                        color:#ffffff;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:15px;
                                        font-weight:800;
                                    ">
                                        ${escapeHtml(companyName)}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="
                                        width:135px;
                                        padding:14px 16px;
                                        border-bottom:
                                            1px solid #252a40;
                                        color:#22d3ee;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:12px;
                                        font-weight:900;
                                        letter-spacing:1px;
                                        text-transform:uppercase;
                                        vertical-align:top;
                                    ">
                                        Phone
                                    </td>

                                    <td style="
                                        padding:14px 16px;
                                        border-bottom:
                                            1px solid #252a40;
                                        color:#ffffff;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:15px;
                                        font-weight:700;
                                    ">
                                        ${
            phoneLink
                ? `
                                                    <a
                                                        href="${phoneLink}"
                                                        style="
                                                            color:#22d3ee;
                                                            text-decoration:none;
                                                            font-weight:900;
                                                        "
                                                    >
                                                        ${escapeHtml(leadPhone)}
                                                    </a>
                                                `
                : escapeHtml(leadPhone)
        }
                                    </td>
                                </tr>

                                ${
            leadEmail
                ? `
                                            <tr>
                                                <td style="
                                                    width:135px;
                                                    padding:14px 16px;
                                                    border-bottom:
                                                        1px solid #252a40;
                                                    color:#ff4db8;
                                                    font-family:
                                                        Arial,
                                                        Helvetica,
                                                        sans-serif;
                                                    font-size:12px;
                                                    font-weight:900;
                                                    letter-spacing:1px;
                                                    text-transform:uppercase;
                                                    vertical-align:top;
                                                ">
                                                    Email
                                                </td>

                                                <td style="
                                                    padding:14px 16px;
                                                    border-bottom:
                                                        1px solid #252a40;
                                                    color:#ffffff;
                                                    font-family:
                                                        Arial,
                                                        Helvetica,
                                                        sans-serif;
                                                    font-size:15px;
                                                ">
                                                    <a
                                                        href="mailto:${escapeHtml(leadEmail)}"
                                                        style="
                                                            color:#ff4db8;
                                                            text-decoration:none;
                                                            font-weight:700;
                                                        "
                                                    >
                                                        ${escapeHtml(leadEmail)}
                                                    </a>
                                                </td>
                                            </tr>
                                        `
                : ""
        }

                                <tr>
                                    <td style="
                                        width:135px;
                                        padding:14px 16px;
                                        border-bottom:
                                            1px solid #252a40;
                                        color:#22d3ee;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:12px;
                                        font-weight:900;
                                        letter-spacing:1px;
                                        text-transform:uppercase;
                                        vertical-align:top;
                                    ">
                                        City
                                    </td>

                                    <td style="
                                        padding:14px 16px;
                                        border-bottom:
                                            1px solid #252a40;
                                        color:#ffffff;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:15px;
                                    ">
                                        ${escapeHtml(cityAndState)}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="
                                        width:135px;
                                        padding:14px 16px;
                                        color:#ff4db8;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:12px;
                                        font-weight:900;
                                        letter-spacing:1px;
                                        text-transform:uppercase;
                                        vertical-align:top;
                                    ">
                                        Location
                                    </td>

                                    <td style="
                                        padding:14px 16px;
                                        color:#ffffff;
                                        font-family:
                                            Arial,
                                            Helvetica,
                                            sans-serif;
                                        font-size:15px;
                                        line-height:1.55;
                                    ">
                                        ${escapeHtml(physicalLocation)}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 28px 8px;">
                            <div style="
                                margin-bottom:10px;
                                color:#22d3ee;
                                font-family:
                                    Arial,
                                    Helvetica,
                                    sans-serif;
                                font-size:12px;
                                font-weight:900;
                                letter-spacing:1.8px;
                                text-transform:uppercase;
                            ">
                                Lead Description
                            </div>

                            <div style="
                                padding:20px;
                                background-color:#101020;
                                border:1px solid #ff0080;
                                border-radius:12px;
                                color:#e2e8f0;
                                font-family:
                                    Arial,
                                    Helvetica,
                                    sans-serif;
                                font-size:15px;
                                line-height:1.75;
                            ">
                                ${escapedDescription}
                            </div>
                        </td>
                    </tr>

                    ${
            phoneLink
                ? `
                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:
                                                24px 28px 12px;
                                        "
                                    >
                                        <a
                                            href="${phoneLink}"
                                            style="
                                                display:inline-block;
                                                padding:14px 28px;
                                                background-color:#22d3ee;
                                                border:
                                                    2px solid #22d3ee;
                                                border-radius:8px;
                                                color:#050510;
                                                font-family:
                                                    Arial,
                                                    Helvetica,
                                                    sans-serif;
                                                font-size:15px;
                                                font-weight:900;
                                                letter-spacing:1px;
                                                text-decoration:none;
                                                text-transform:uppercase;
                                            "
                                        >
                                            Call ${escapeHtml(author)}
                                        </a>
                                    </td>
                                </tr>
                            `
                : ""
        }

                    <tr>
                        <td style="
                            padding:24px 28px 30px;
                            text-align:center;
                            font-family:
                                Arial,
                                Helvetica,
                                sans-serif;
                        ">
                            <div style="
                                height:1px;
                                margin-bottom:18px;
                                background-color:#22d3ee;
                            "></div>

                            <div style="
                                color:#94a3b8;
                                font-size:12px;
                                line-height:1.6;
                            ">
                                Clubhouse Links
                                &nbsp;//&nbsp;
                               ${leadId}
                            </div>

                            <div style="
                                margin-top:5px;
                                color:#64748b;
                                font-size:11px;
                            ">
                                Routed to
                                ${escapeHtml(companyName)}
                                because email alerts are enabled.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        /*
         * --------------------------------------------------------
         * Plain-text fallback
         * --------------------------------------------------------
         */

        const emailText = [
            `New ${leadType} lead for ${companyName}`,
            "",
            greeting,
            "",
            `Company: ${companyName}`,
            `Author: ${author}`,
            `Phone: ${leadPhone}`,

            leadEmail
                ? `Email: ${leadEmail}`
                : null,

            `City: ${cityAndState}`,
            `Location: ${physicalLocation}`,
            "",
            "Description:",
            description,
            "",
            `FamilyTreeNow Lead ID: ${leadId}`,
            "",
            "Clubhouse Links"
        ]
            .filter(
                (line) =>
                    line !== null
            )
            .join("\n");

        /*
         * --------------------------------------------------------
         * Send through ZeptoMail on Heroku
         * --------------------------------------------------------
         */

        const transporter =
            getZeptoTransporter();

        const fromName = String(
            process.env.ZEPTOMAIL_FROM_NAME ||
            "Clubhouse Links"
        ).trim();

        const fromEmail = String(
            process.env.ZEPTOMAIL_FROM_EMAIL || ""
        ).trim();

        const emailResult =
            await transporter.sendMail({
                from: {
                    name: fromName,
                    address: fromEmail
                },

                to: recipient.email,

                subject,

                text: emailText,

                html: emailHtml
            });

        console.log(
            "✅ ZeptoMail FamilyTree alert delivered:",
            {
                leadId,
                userId,
                companyName,
                email:
                recipient.email,
                messageId:
                    emailResult?.messageId ||
                    null
            }
        );

        /*
         * Railway expects success=true and emails_sent > 0.
         */
        return res.status(200).json({
            success: true,
            emails_sent: 1,
            emails_failed: 0,

            lead_id: leadId,
            user_id: userId,

            company_name:
            companyName,

            recipient_email:
            recipient.email,

            message_id:
                emailResult?.messageId ||
                null,

            author,
            lead_type:
            leadType,
            city,
            state,

            location:
            physicalLocation,

            message:
                "FamilyTree email alert sent successfully through ZeptoMail"
        });
    } catch (error) {
        console.error(
            "❌ Error sending FamilyTree ZeptoMail alert:",
            error
        );

        return res.status(500).json({
            success: false,
            emails_sent: 0,
            emails_failed: 1,
            error:
                "Failed to send FamilyTree email alert through ZeptoMail",
            details:
            error.message
        });
    }
};
// ✅ Get summary of all leads sent, grouped by company
// Get summary of all leads sent, grouped by EACH company inside array
exports.getLeadsSent = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        console.log("📊 getLeadsSent query:", { start_date, end_date });

        const params = [];
        let dateClause = "";

        if (start_date && end_date) {
            params.push(start_date, end_date);
            dateClause = `AND scraped_at BETWEEN $1 AND $2`;
        }

        // IMPORTANT: UNNEST the company array
        const query = `
            SELECT
                COALESCE(unnested_company, 'Unknown Company') AS company_name,
                COUNT(*) AS total_leads,
                MAX(scraped_at) AS last_sent,
                STRING_AGG(DISTINCT city, ', ') AS cities
            FROM (
                     SELECT
                         scraped_at,
                         city,
                         UNNEST(company_name) AS unnested_company
                     FROM familytreenow
                     WHERE lead_sent = TRUE
                         ${dateClause}
                 ) AS expanded
            GROUP BY unnested_company
            ORDER BY total_leads DESC;
        `;

        console.log("📋 Running query:", query);

        const { rows } = await db.query(query, params);

        console.log(`✅ Found ${rows.length} company groups`);
        res.json(rows);

    } catch (error) {
        console.error("❌ Error fetching leads sent:", error);
        res.status(500).json({ error: "Failed to retrieve leads sent" });
    }
};



// ✅ Get all leads for one company (already in your file)
exports.getCompanyLeads = async (req, res) => {
    try {
        const { company_name } = req.params;

        const query = `
            SELECT
                f.id,
                f.author,
                f.city,
                f.state,
                f.lead_type,
                f.phone,
                f.email,
                f.physical_address,
                f.description,
                f.scraped_at
            FROM familytreenow f
            WHERE f.company_name @> ARRAY[$1]
              AND f.lead_sent = TRUE
            ORDER BY f.scraped_at DESC;
        `;

        const { rows } = await db.query(query, [company_name]);
        res.json(rows);

    } catch (error) {
        console.error("❌ Error fetching company leads:", error);
        res.status(500).json({ error: "Failed to retrieve company leads" });
    }
};






exports.sendLeadSummaries = async (req, res) => {
    try {
        const { company_name } = req.body;

        if (!company_name) {
            return res.status(400).json({
                error: "Missing company_name in request body"
            });
        }

        /*
         * ---------------------------------------------------------
         * 1. Find the recipient separately.
         *
         * Do NOT join users into the lead query. If multiple user
         * records exist for one company, that multiplies every lead.
         * ---------------------------------------------------------
         */
        const { rows: recipientRows } = await db.query(
            `
                SELECT DISTINCT email
                FROM users
                WHERE LOWER(TRIM(company_name)) = LOWER(TRIM($1))
                  AND email IS NOT NULL
                  AND TRIM(email) <> '';
            `,
            [company_name]
        );

        if (!recipientRows.length) {
            return res.json({
                message: `No email found for ${company_name}`
            });
        }

        /*
         * ---------------------------------------------------------
         * Recipient override.
         *
         * Some companies have multiple users, but one designated
         * person should receive the lead summary report.
         * ---------------------------------------------------------
         */
        const normalizedCompanyName =
            String(company_name)
                .trim()
                .toLowerCase();

        const overrideEmail =
            REPORT_RECIPIENT_OVERRIDES[normalizedCompanyName];

        let to;

        if (overrideEmail) {
            /*
             * Confirm that the configured override email still
             * belongs to this company.
             */
            const overrideRecipient =
                recipientRows.find(
                    (row) =>
                        String(row.email || "")
                            .trim()
                            .toLowerCase() ===
                        String(overrideEmail)
                            .trim()
                            .toLowerCase()
                );

            if (!overrideRecipient) {
                return res.status(409).json({
                    error:
                        `Configured report recipient ${overrideEmail} ` +
                        `was not found for ${company_name}`,
                    recipients:
                        recipientRows.map((r) => r.email)
                });
            }

            to = overrideRecipient.email;

        } else {
            /*
             * If more than one DIFFERENT email belongs to this company,
             * don't silently choose one. That could send the report to
             * the wrong person.
             */
            if (recipientRows.length > 1) {
                return res.status(409).json({
                    error:
                        `Multiple recipient emails found for ${company_name}`,
                    recipients:
                        recipientRows.map((r) => r.email)
                });
            }

            to = recipientRows[0].email;
        }

        /*
         * ---------------------------------------------------------
         * 2. Fetch the actual leads.
         *
         * Use scraped_at directly.
         * No nextdoor_messages join.
         * No users join.
         * ---------------------------------------------------------
         */
        const { rows } = await db.query(
            `
                SELECT
                    f.id,
                    f.author,
                    f.lead_type,
                    f.city,
                    f.state,
                    f.phone,
                    f.description,
                    f.scraped_at
                FROM familytreenow f
                WHERE EXISTS (
                    SELECT 1
                    FROM unnest(f.company_name) AS company
                    WHERE LOWER(TRIM(company)) = LOWER(TRIM($1))
                )
                  AND f.lead_sent = TRUE
                ORDER BY f.scraped_at DESC
                LIMIT 100;
            `,
            [company_name]
        );

        if (!rows.length) {
            return res.json({
                message: `No leads found for ${company_name}`
            });
        }

        const tableRows = rows
            .map((l) => `
                <tr>
                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #f5f5f5;
                            vertical-align: top;
                        "
                    >
                        ${l.author || "N/A"}
                    </td>

                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #67e8f9;
                            vertical-align: top;
                        "
                    >
                        ${l.lead_type || "—"}
                    </td>

                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #f5f5f5;
                            vertical-align: top;
                        "
                    >
                        ${l.city || "—"}
                    </td>

                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #f5f5f5;
                            vertical-align: top;
                        "
                    >
                        ${l.state || "—"}
                    </td>

                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #ffb000;
                            font-weight: bold;
                            vertical-align: top;
                        "
                    >
                        ${l.phone || "—"}
                    </td>

                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #f5f5f5;
                            line-height: 1.5;
                            vertical-align: top;
                        "
                    >
                        ${
                l.description
                    ? l.description.replace(/\n/g, "<br>")
                    : "—"
            }
                    </td>

                    <td
                        style="
                            padding: 10px;
                            border: 1px solid #ff2fa8;
                            color: #67e8f9;
                            white-space: nowrap;
                            vertical-align: top;
                        "
                    >
                        ${
                l.scraped_at
                    ? new Date(
                        l.scraped_at
                    ).toLocaleString()
                    : "—"
            }
                    </td>
                </tr>
            `)
            .join("");

        const html = `
            <div
                style="
                    margin: 0;
                    padding: 30px 20px;
                    background-color: #070712;
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;
                    color: #ffffff;
                "
            >
                <div
                    style="
                        max-width: 1200px;
                        margin: 0 auto;
                        background-color: #10051c;
                        border: 2px solid #ff0080;
                        border-radius: 14px;
                        overflow: hidden;
                        box-shadow:
                            0 0 20px rgba(255, 0, 128, 0.45);
                    "
                >

                    <div
                        style="
                            background-color: #180528;
                            border-bottom: 3px solid #ff0080;
                            padding: 28px 24px;
                            text-align: center;
                        "
                    >
                        <div
                            style="
                                color: #67e8f9;
                                font-size: 13px;
                                font-weight: bold;
                                letter-spacing: 3px;
                                text-transform: uppercase;
                                margin-bottom: 8px;
                            "
                        >
                            CLUBHOUSE LINKS
                        </div>

                        <h2
                            style="
                                margin: 0;
                                color: #ff2fa8;
                                font-size: 28px;
                                line-height: 1.25;
                            "
                        >
                            Lead Summary for ${company_name}
                        </h2>

                        <div
                            style="
                                width: 90px;
                                height: 4px;
                                background-color: #ffb000;
                                margin: 16px auto 0 auto;
                                border-radius: 4px;
                            "
                        ></div>
                    </div>

                    <div
                        style="
                            padding: 24px;
                        "
                    >
                        <p
                            style="
                                color: #e8e8ee;
                                font-size: 16px;
                                line-height: 1.6;
                                margin: 0 0 20px 0;
                            "
                        >
                            Here are your most recent leads from Clubhouse Links:
                        </p>

                        <div
                            style="
                                overflow-x: auto;
                                border-radius: 8px;
                            "
                        >
                            <table
                                border="0"
                                cellspacing="0"
                                cellpadding="0"
                                style="
                                    border-collapse: collapse;
                                    width: 100%;
                                    background-color: #0c0c18;
                                    border: 1px solid #ff2fa8;
                                "
                            >
                                <thead>
                                    <tr
                                        style="
                                            background-color: #260934;
                                        "
                                    >
                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            Name
                                        </th>

                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            Type
                                        </th>

                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            City
                                        </th>

                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            State
                                        </th>

                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            Phone
                                        </th>

                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            Description
                                        </th>

                                        <th
                                            style="
                                                padding: 12px 10px;
                                                border: 1px solid #ff2fa8;
                                                color: #ffb000;
                                                text-align: left;
                                            "
                                        >
                                            Date
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>

                        <div
                            style="
                                margin-top: 22px;
                                padding: 16px;
                                text-align: center;
                                background-color: #160820;
                                border: 1px solid #67e8f9;
                                border-radius: 8px;
                            "
                        >
                            <span
                                style="
                                    color: #d9d9e3;
                                    font-size: 16px;
                                "
                            >
                                Total Leads:
                            </span>

                            <strong
                                style="
                                    color: #67e8f9;
                                    font-size: 20px;
                                    margin-left: 6px;
                                "
                            >
                                ${rows.length}
                            </strong>
                        </div>

                        <div
                            style="
                                margin-top: 30px;
                                padding: 24px;
                                background-color: #12071d;
                                border: 1px solid #ff0080;
                                border-radius: 10px;
                                text-align: center;
                            "
                        >
                            <h3
                                style="
                                    margin:
                                        0
                                        0
                                        18px
                                        0;
                                    text-align: center;
                                    color: #ff2fa8;
                                    font-size: 21px;
                                    line-height: 1.45;
                                "
                            >
                                Click the link below to see how to get the most return
                                on investment from your Clubhouse Links CRM hot leads.
                            </h3>

                            <div
                                style="
                                    text-align: center;
                                    margin-top: 12px;
                                "
                            >
                                <img
                                    src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1765155432/phonecall_odl0ou.webp"
                                    alt="Phone Call Tutorial"
                                    style="
                                        max-width: 400px;
                                        width: 100%;
                                        border-radius: 8px;
                                        border: 2px solid #67e8f9;
                                    "
                                >
                            </div>

                            <p
                                style="
                                    text-align: center;
                                    margin:
                                        22px
                                        0
                                        4px
                                        0;
                                "
                            >
                                <a
                                    href="https://www.canva.com/design/DAG6PZLvpUE/Fl6hv33MDHcHOQ8nPeCA9Q/view?utm_content=DAG6PZLvpUE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd30cbe3f30"
                                    style="
                                        display: inline-block;
                                        padding: 13px 22px;
                                        font-size: 18px;
                                        color: #070712;
                                        background-color: #ffb000;
                                        text-decoration: none;
                                        font-weight: bold;
                                        border-radius: 6px;
                                        border: 2px solid #ff2fa8;
                                    "
                                >
                                    Click here to view the video tutorial
                                </a>
                            </p>
                        </div>
                    </div>

                    <div
                        style="
                            padding: 18px;
                            text-align: center;
                            background-color: #080810;
                            border-top: 1px solid #ff0080;
                            color: #888899;
                            font-size: 12px;
                            letter-spacing: 1px;
                        "
                    >
                        CLUBHOUSE LINKS • HOT LEAD REPORT
                    </div>

                </div>
            </div>
        `;

        await sendEmail(
            to,
            `Your Lead Summary Report — ${company_name}`,
            html
        );

        res.json({
            success: true,
            recipient: to,
            lead_count: rows.length,
            message:
                `Lead summary sent to ${to} for ${company_name}`
        });

    } catch (error) {
        console.error(
            "❌ Error sending lead summary:",
            error
        );

        res.status(500).json({
            error: "Failed to send lead summary"
        });
    }
};

/*
 * --------------------------------------------------------------------------
 * Chamber lead-type helper
 *
 * familytreenow.lead_type is TEXT, for example:
 *
 *   "painter"
 *   "general_contractor,painter"
 *   "garage,handyman,electrician,painter"
 *
 * chamber_lead_email_log.lead_type is TEXT[].
 *
 * This converts the FamilyTree text value into a real JS array
 * before PostgreSQL receives it as $5::text[].
 * --------------------------------------------------------------------------
 */

function normalizeChamberLeadTypeArray(value) {
    if (Array.isArray(value)) {
        return [
            ...new Set(
                value
                    .map((item) =>
                        String(item || "")
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, "_")
                            .replace(/-/g, "_")
                    )
                    .filter(Boolean)
            )
        ];
    }

    return [
        ...new Set(
            String(value || "")
                .replace(/^\{|\}$/g, "")
                .split(",")
                .map((item) =>
                    item
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/-/g, "_")
                )
                .filter(Boolean)
        )
    ];
}


/*
 * --------------------------------------------------------------------------
 * POST /api/leads/send-chamber-lead-digest
 * --------------------------------------------------------------------------
 */

exports.sendChamberLeadDigest =
    async (req, res) => {

        let batchId = null;
        let emailSent = false;

        try {

            /*
             * --------------------------------------------------------------
             * 1. Authenticate request from Railway / FTN
             * --------------------------------------------------------------
             */

            const providedSecret =
                req.get(
                    "x-chamber-alert-secret"
                );

            if (
                !chamberSecretMatches(
                    providedSecret
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        error: "Unauthorized"
                    });
            }


            /*
             * --------------------------------------------------------------
             * 2. Validate request payload
             * --------------------------------------------------------------
             */

            const chamberRecordId =
                Number(
                    req.body
                        ?.chamber_record_id
                );


            const industry =
                String(
                    req.body?.industry ||
                    ""
                )
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/-/g, "_");


            const requestedLeadIds =
                Array.isArray(
                    req.body?.lead_ids
                )
                    ? [
                        ...new Set(
                            req.body
                                .lead_ids
                                .map(
                                    (id) =>
                                        Number(id)
                                )
                        )
                    ]
                    : [];


            if (
                !Number.isSafeInteger(
                    chamberRecordId
                ) ||
                chamberRecordId <= 0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Valid chamber_record_id required"
                    });
            }


            if (!industry) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "industry is required"
                    });
            }


            if (
                requestedLeadIds.length !==
                CHAMBER_DIGEST_SIZE ||
                !requestedLeadIds.every(
                    (id) =>
                        Number.isSafeInteger(id) &&
                        id > 0
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Exactly 10 unique lead_ids are required"
                    });
            }


            /*
             * --------------------------------------------------------------
             * 3. Load the Chamber business
             * --------------------------------------------------------------
             */

            const chamberResult =
                await db.query(
                    `
                        SELECT
                            id,
                            name,
                            company_name,
                            email,
                            city,
                            lead_industries

                        FROM chamber_of_commerce

                        WHERE id = $1

                          AND NULLIF(
                                BTRIM(email),
                                ''
                              ) IS NOT NULL

                        LIMIT 1;
                    `,
                    [
                        chamberRecordId
                    ]
                );


            if (
                !chamberResult.rows.length
            ) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            "Chamber recipient not found"
                    });
            }


            const recipient =
                chamberResult.rows[0];


            /*
             * --------------------------------------------------------------
             * 4. Verify that this industry actually belongs to the
             *    Chamber business.
             * --------------------------------------------------------------
             */

            const allowedIndustries =
                Array.isArray(
                    recipient.lead_industries
                )
                    ? recipient
                        .lead_industries
                        .map(
                            (value) =>
                                String(value)
                                    .trim()
                                    .toLowerCase()
                                    .replace(
                                        /\s+/g,
                                        "_"
                                    )
                                    .replace(
                                        /-/g,
                                        "_"
                                    )
                        )
                    : [];


            if (
                !allowedIndustries
                    .includes(
                        industry
                    )
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        error:
                            "Industry is not assigned to this Chamber business",
                        requested_industry:
                        industry,
                        allowed_industries:
                        allowedIndustries
                    });
            }


            const recipientEmail =
                String(
                    recipient.email ||
                    ""
                ).trim();


            /*
             * --------------------------------------------------------------
             * 5. Create/retrieve unsubscribe token and make sure this
             *    recipient has not unsubscribed.
             * --------------------------------------------------------------
             */

            const unsubscribeRecord =
                await getOrCreateChamberUnsubscribe(
                    recipientEmail
                );


            if (
                !unsubscribeRecord ||
                !unsubscribeRecord.token
            ) {
                throw new Error(
                    "Could not create Chamber unsubscribe token"
                );
            }


            if (
                unsubscribeRecord
                    .unsubscribed_at
            ) {
                return res
                    .status(410)
                    .json({
                        success: false,
                        skipped: true,
                        reason:
                            "recipient_unsubscribed",
                        recipient_email:
                        recipientEmail
                    });
            }


            /*
             * --------------------------------------------------------------
             * 6. Lead age setting
             * --------------------------------------------------------------
             */

            const parsedMaxAgeDays =
                Number.parseInt(
                    process.env
                        .CHAMBER_LEAD_MAX_AGE_DAYS ||
                    "30",
                    10
                );


            const maxAgeDays =
                Number.isFinite(
                    parsedMaxAgeDays
                ) &&
                parsedMaxAgeDays >= 0
                    ? parsedMaxAgeDays
                    : 30;


            /*
             * --------------------------------------------------------------
             * 7. Re-validate all 10 FamilyTree leads.
             *
             * IMPORTANT:
             *
             * familytreenow.lead_type is TEXT, not TEXT[].
             *
             * Example:
             *
             *   painter
             *
             * or:
             *
             *   general_contractor,painter
             *
             * So we split it into a temporary PostgreSQL text array
             * before matching.
             * --------------------------------------------------------------
             */

            const leadResult =
                await db.query(
                    `
                        SELECT
                            f.id,
                            f.author,
                            f.city,
                            f.state,
                            f.description,
                            f.lead_type,
                            f.scraped_at

                        FROM familytreenow f

                        WHERE
                            f.id =
                            ANY(
                                $1::int[]
                            )

                          AND $2 = ANY(
                                regexp_split_to_array(
                                    TRIM(
                                        BOTH '{}'
                                        FROM LOWER(
                                            COALESCE(
                                                f.lead_type,
                                                ''
                                            )
                                        )
                                    ),
                                    '\\s*,\\s*'
                                )
                              )

                          AND NULLIF(
                                BTRIM(
                                    f.description
                                ),
                                ''
                              ) IS NOT NULL

                          AND (
                                $4::int <= 0

                                OR f.scraped_at >=
                                   NOW() -
                                   (
                                       $4::int *
                                       INTERVAL '1 day'
                                   )
                              )

                          AND NOT EXISTS (
                                SELECT 1

                                FROM
                                    chamber_lead_email_log
                                    AS log

                                WHERE
                                    log.lead_id =
                                    f.id

                                  AND LOWER(
                                        BTRIM(
                                            log.recipient_email
                                        )
                                      ) =
                                      LOWER(
                                        BTRIM($3)
                                      )
                              )

                        ORDER BY
                            f.scraped_at DESC,
                            f.id DESC;
                    `,
                    [
                        requestedLeadIds,
                        industry,
                        recipientEmail,
                        maxAgeDays
                    ]
                );


            const leads =
                leadResult.rows;


            /*
             * We send ONLY complete batches of 10.
             */

            if (
                leads.length !==
                CHAMBER_DIGEST_SIZE
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        error:
                            "All 10 leads are no longer eligible or unsent",
                        requested_count:
                        requestedLeadIds.length,
                        eligible_count:
                        leads.length
                    });
            }


            /*
             * --------------------------------------------------------------
             * 8. Reserve the leads before sending.
             *
             * This prevents two jobs from emailing the same lead to
             * the same recipient at the same time.
             * --------------------------------------------------------------
             */

            batchId =
                crypto.randomUUID();


            const reservationClient =
                await db.connect();


            try {

                await reservationClient
                    .query(
                        "BEGIN"
                    );


                for (
                    const lead of leads
                    ) {

                    /*
                     * Convert FamilyTree's TEXT lead_type into
                     * a proper JS array for the log's TEXT[] column.
                     */

                    const leadTypes =
                        normalizeChamberLeadTypeArray(
                            lead.lead_type
                        );


                    const reservation =
                        await reservationClient
                            .query(
                                `
                                    INSERT INTO
                                        chamber_lead_email_log
                                    (
                                        lead_id,
                                        chamber_source,
                                        chamber_record_id,
                                        recipient_email,
                                        company_name,
                                        lead_type,
                                        industry,
                                        batch_id,
                                        status,
                                        sent_at
                                    )

                                    VALUES
                                    (
                                        $1,
                                        'chamber_of_commerce',
                                        $2,
                                        $3,
                                        $4,
                                        $5::text[],
                                        $6,
                                        $7::uuid,
                                        'pending',
                                        NOW()
                                    )

                                    ON CONFLICT
                                        DO NOTHING

                                    RETURNING id;
                                `,
                                [
                                    lead.id,
                                    recipient.id,
                                    recipientEmail,
                                    recipient.company_name,
                                    leadTypes,
                                    industry,
                                    batchId
                                ]
                            );


                    if (
                        reservation.rowCount !==
                        1
                    ) {
                        throw new Error(
                            `Lead ${lead.id} was already reserved or sent`
                        );
                    }
                }


                await reservationClient
                    .query(
                        "COMMIT"
                    );

            } catch (error) {

                await reservationClient
                    .query(
                        "ROLLBACK"
                    );

                throw error;

            } finally {

                reservationClient
                    .release();
            }


            /*
             * --------------------------------------------------------------
             * 9. Build unsubscribe URL
             *
             * CHAMBER_PUBLIC_BASE_URL should be:
             *
             * https://crm-function-app-5d4de511071d.herokuapp.com/
             * server/lead_function/api/leads
             *
             * Therefore DO NOT add /api/leads again here.
             * --------------------------------------------------------------
             */

            const publicBaseUrl =
                String(
                    process.env
                        .CHAMBER_PUBLIC_BASE_URL ||
                    ""
                )
                    .trim()
                    .replace(
                        /\/+$/,
                        ""
                    );


            if (!publicBaseUrl) {
                throw new Error(
                    "CHAMBER_PUBLIC_BASE_URL is not configured"
                );
            }


            const unsubscribeUrl =
                `${publicBaseUrl}` +
                `/chamber-unsubscribe/` +
                `${encodeURIComponent(
                    String(
                        unsubscribeRecord.token
                    )
                )}`;


            /*
             * --------------------------------------------------------------
             * 10. Email content
             * --------------------------------------------------------------
             */

            const industryLabel =
                formatChamberIndustry(
                    industry
                );


            const companyName =
                String(
                    recipient.company_name ||
                    recipient.name ||
                    "Local Business"
                ).trim();


            const contactName =
                String(
                    recipient.name ||
                    ""
                ).trim();


            const greeting =
                contactName
                    ? `Hi ${contactName},`
                    : `Hello ${companyName},`;


            const subject =
                `10 New ${industryLabel} Opportunities in DFW`;


            /*
             * CTA is intentionally SMS-only.
             */

            const smsHref =
                `${publicBaseUrl}/chamber-signup-sms`;


            /*
             * --------------------------------------------------------------
             * 11. Build lead cards
             * --------------------------------------------------------------
             */

            const leadCards =
                leads
                    .map(
                        (
                            lead,
                            index
                        ) => {

                            const author =
                                String(
                                    lead.author ||
                                    "Local homeowner"
                                ).trim();


                            const city =
                                [
                                    lead.city,
                                    lead.state
                                ]
                                    .filter(Boolean)
                                    .join(", ") ||
                                "DFW";


                            const description =
                                escapeChamberHtml(
                                    lead.description ||
                                    ""
                                )
                                    .replace(
                                        /\r?\n/g,
                                        "<br>"
                                    );


                            const date =
                                lead.scraped_at
                                    ? new Date(
                                        lead.scraped_at
                                    )
                                        .toLocaleDateString(
                                            "en-US"
                                        )
                                    : "";


                            return `
                                <div
                                    style="
                                        margin:0 0 16px;
                                        padding:18px;
                                        background:#0d1020;
                                        border:1px solid #29324d;
                                        border-left:4px solid #22d3ee;
                                        border-radius:12px;
                                    "
                                >
                                    <div
                                        style="
                                            color:#ff4db8;
                                            font-size:12px;
                                            font-weight:900;
                                            letter-spacing:1.5px;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Opportunity ${index + 1}
                                    </div>

                                    <div
                                        style="
                                            margin-top:7px;
                                            color:#ffffff;
                                            font-size:18px;
                                            font-weight:900;
                                        "
                                    >
                                        ${escapeChamberHtml(author)}
                                    </div>

                                    <div
                                        style="
                                            margin-top:4px;
                                            color:#22d3ee;
                                            font-size:14px;
                                            font-weight:800;
                                        "
                                    >
                                        ${escapeChamberHtml(city)}
                                        ${
                                date
                                    ? ` • ${escapeChamberHtml(date)}`
                                    : ""
                            }
                                    </div>

                                    <div
                                        style="
                                            margin-top:13px;
                                            color:#dbe4ee;
                                            font-size:15px;
                                            line-height:1.65;
                                        "
                                    >
                                        ${description}
                                    </div>
                                </div>
                            `;
                        }
                    )
                    .join("");


            /*
             * --------------------------------------------------------------
             * 12. Neo-punk HTML email
             * --------------------------------------------------------------
             */

            const emailHtml = `
<!doctype html>

<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ${escapeChamberHtml(subject)}
    </title>
</head>


<body
    style="
        margin:0;
        padding:0;
        background:#050510;
    "
>

<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
        width:100%;
        background:#050510;
    "
>

<tr>

<td
    align="center"
    style="
        padding:28px 14px;
    "
>

<table
    role="presentation"
    width="680"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
        width:100%;
        max-width:680px;
        background:#090914;
        border:1px solid #22d3ee;
        border-radius:18px;
        overflow:hidden;
    "
>


<!-- Header -->

<tr>

<td
    style="
        padding:30px;
        text-align:center;
        background:#111126;
        border-bottom:2px solid #ff0080;
    "
>

    <div
        style="
            color:#22d3ee;
            font-family:Arial,sans-serif;
            font-size:12px;
            font-weight:900;
            letter-spacing:2px;
            text-transform:uppercase;
        "
    >
        CLUBHOUSE LINKS // LOCAL OPPORTUNITIES
    </div>


    <h1
        style="
            margin:14px 0 0;
            color:#ffffff;
            font-family:Arial,sans-serif;
            font-size:30px;
            line-height:1.25;
        "
    >
        10 New
        ${escapeChamberHtml(industryLabel)}
        Opportunities
    </h1>


    <div
        style="
            margin-top:8px;
            color:#ff4db8;
            font-family:Arial,sans-serif;
            font-size:17px;
            font-weight:800;
        "
    >
        Dallas–Fort Worth
    </div>

</td>

</tr>


<!-- Greeting -->

<tr>

<td
    style="
        padding:26px 28px 10px;
        color:#e2e8f0;
        font-family:Arial,sans-serif;
        font-size:16px;
        line-height:1.7;
    "
>

    <p
        style="
            margin:0 0 14px;
        "
    >
        ${escapeChamberHtml(greeting)}
    </p>


    <p
        style="
            margin:0;
        "
    >
        We identified these recent local

        <strong
            style="
                color:#22d3ee;
            "
        >
            ${escapeChamberHtml(industryLabel)}
        </strong>

        opportunities that may be relevant to

        <strong
            style="
                color:#ff4db8;
            "
        >
            ${escapeChamberHtml(companyName)}
        </strong>.
    </p>

</td>

</tr>


<!-- Main CTA -->

<tr>

<td
    style="
        padding:20px 28px 26px;
    "
>

    <div
        style="
            padding:22px;
            text-align:center;
            background:#111126;
            border:1px solid #22d3ee;
            border-radius:14px;
        "
    >

        <div
            style="
                color:#ffffff;
                font-family:Arial,sans-serif;
                font-size:20px;
                font-weight:900;
                line-height:1.4;
            "
        >
            Want leads like these sent directly
            to your business?
        </div>


        <div
            style="
                margin-top:10px;
                color:#cbd5e1;
                font-family:Arial,sans-serif;
                font-size:17px;
            "
        >
            Text

            <strong
                style="
                    color:#22d3ee;
                "
            >
                SIGNUP
            </strong>

            to

            <strong
                style="
                    color:#ff4db8;
                "
            >
                214-548-9175
            </strong>
        </div>


        <a
            href="${smsHref}"
            style="
                display:inline-block;
                margin-top:18px;
                padding:13px 24px;
                background:#22d3ee;
                color:#050510;
                border-radius:8px;
                font-family:Arial,sans-serif;
                font-size:15px;
                font-weight:900;
                text-decoration:none;
                text-transform:uppercase;
            "
        >
            TEXT SIGNUP NOW
        </a>

    </div>

</td>

</tr>


<!-- Ten opportunities -->

<tr>

<td
    style="
        padding:0 28px;
        font-family:Arial,sans-serif;
    "
>

    ${leadCards}

</td>

</tr>


<!-- Bottom CTA -->

<!-- Bottom CTA -->

<tr>
<td
    style="
        padding:24px 28px;
        text-align:center;
        font-family:Arial,sans-serif;
    "
>

    <a
        href="${smsHref}"
        style="
            display:block;
            padding:22px;
            border:1px solid #ff0080;
            border-radius:12px;
            background:#12071d;
            text-decoration:none;
        "
    >

        <strong
            style="
                display:block;
                color:#ffffff;
                font-size:19px;
            "
        >
            Ready to receive local opportunities?
        </strong>

        <div
            style="
                margin-top:9px;
                color:#cbd5e1;
                font-size:16px;
            "
        >
            Text

            <strong
                style="
                    color:#22d3ee;
                "
            >
                SIGNUP
            </strong>

            to

            <strong
                style="
                    color:#ff4db8;
                "
            >
                214-548-9175
            </strong>
        </div>

        <div
            style="
                margin-top:16px;
                color:#22d3ee;
                font-size:13px;
                font-weight:900;
                letter-spacing:1px;
                text-transform:uppercase;
            "
        >
            TAP HERE TO TEXT SIGNUP →
        </div>

    </a>

</td>
</tr>


<!-- Footer -->

<tr>

<td
    style="
        padding:22px 28px 30px;
        text-align:center;
        border-top:1px solid #29324d;
        color:#64748b;
        font-family:Arial,sans-serif;
        font-size:11px;
        line-height:1.7;
    "
>

    You're receiving this message because
    ${escapeChamberHtml(companyName)}
    appears in a local Chamber of Commerce
    business directory.

    <br><br>

    <a
        href="${unsubscribeUrl}"
        style="
            color:#22d3ee;
            text-decoration:underline;
        "
    >
        Unsubscribe from future lead opportunities
    </a>

</td>

</tr>


</table>

</td>

</tr>

</table>

</body>

</html>
            `;


            /*
             * --------------------------------------------------------------
             * 13. Plain-text fallback
             * --------------------------------------------------------------
             */

            const emailText =
                [
                    `10 New ${industryLabel} Opportunities in DFW`,
                    "",
                    greeting,
                    "",
                    "We identified these recent local opportunities that may be relevant to your business.",
                    "",

                    ...leads.flatMap(
                        (
                            lead,
                            index
                        ) => [
                            `Opportunity ${index + 1}`,
                            `${lead.author || "Local homeowner"} — ${
                                [
                                    lead.city,
                                    lead.state
                                ]
                                    .filter(Boolean)
                                    .join(", ")
                            }`,
                            String(
                                lead.description ||
                                ""
                            ),
                            ""
                        ]
                    ),

                    "Want leads like these sent directly to your business?",
                    "Text SIGNUP to 214-548-9175",
                    "",
                    `Unsubscribe: ${unsubscribeUrl}`
                ]
                    .join("\n");


            /*
             * --------------------------------------------------------------
             * 14. Send via existing ZeptoMail SMTP transporter
             * --------------------------------------------------------------
             */

            const transporter =
                getZeptoTransporter();


            const fromName =
                String(
                    process.env
                        .ZEPTOMAIL_FROM_NAME ||
                    "Clubhouse Links"
                ).trim();


            const fromEmail =
                String(
                    process.env
                        .ZEPTOMAIL_FROM_EMAIL ||
                    ""
                ).trim();


            let emailResult;


            try {

                emailResult =
                    await transporter
                        .sendMail({
                            from: {
                                name:
                                fromName,

                                address:
                                fromEmail
                            },

                            to:
                            recipientEmail,

                            subject,

                            text:
                            emailText,

                            html:
                            emailHtml,

                            headers: {
                                "List-Unsubscribe":
                                    `<${unsubscribeUrl}>`,

                                "List-Unsubscribe-Post":
                                    "List-Unsubscribe=One-Click"
                            }
                        });


                /*
                 * Once this flips true, we never delete the pending
                 * reservations automatically.
                 *
                 * If the DB update fails after Zepto accepted the email,
                 * retaining them prevents accidental duplicate sending.
                 */

                emailSent = true;


            } catch (error) {

                /*
                 * SMTP did NOT accept the email.
                 *
                 * Free the reservations so this exact group can be
                 * retried safely.
                 */

                await db.query(
                    `
                        DELETE FROM
                            chamber_lead_email_log

                        WHERE
                            batch_id =
                            $1::uuid

                          AND status =
                            'pending';
                    `,
                    [
                        batchId
                    ]
                );


                throw error;
            }


            /*
             * --------------------------------------------------------------
             * 15. Mark all ten rows sent
             * --------------------------------------------------------------
             */

            await db.query(
                `
                    UPDATE
                        chamber_lead_email_log

                    SET
                        status = 'sent',

                        provider_message_id =
                            $2,

                        sent_at =
                            NOW()

                    WHERE
                        batch_id =
                        $1::uuid;
                `,
                [
                    batchId,

                    emailResult
                        ?.messageId ||
                    null
                ]
            );


            /*
             * --------------------------------------------------------------
             * 16. Success response
             * --------------------------------------------------------------
             */

            console.log(
                "✅ Chamber lead digest delivered:",
                {
                    batchId,
                    chamberRecordId:
                    recipient.id,
                    companyName,
                    recipientEmail,
                    industry,
                    leadCount:
                    leads.length,
                    leadIds:
                        leads.map(
                            (lead) =>
                                lead.id
                        ),
                    messageId:
                        emailResult
                            ?.messageId ||
                        null
                }
            );


            return res
                .status(200)
                .json({
                    success: true,

                    batch_id:
                    batchId,

                    chamber_record_id:
                    recipient.id,

                    recipient_email:
                    recipientEmail,

                    company_name:
                    companyName,

                    industry,

                    lead_count:
                    leads.length,

                    lead_ids:
                        leads.map(
                            (lead) =>
                                lead.id
                        ),

                    message_id:
                        emailResult
                            ?.messageId ||
                        null,

                    emails_sent:
                        1
                });


        } catch (error) {

            console.error(
                "❌ Chamber digest error:",
                error
            );


            /*
             * If SMTP never accepted the email, clear pending
             * reservations.
             *
             * If SMTP DID accept the email but something later failed,
             * retain the pending reservation so another run cannot
             * accidentally send a duplicate.
             */

            if (
                batchId &&
                !emailSent
            ) {
                await db.query(
                    `
                        DELETE FROM
                            chamber_lead_email_log

                        WHERE
                            batch_id =
                            $1::uuid

                          AND status =
                            'pending';
                    `,
                    [
                        batchId
                    ]
                )
                    .catch(
                        () => {}
                    );
            }


            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Failed to send Chamber lead digest",
                    details:
                    error.message
                });
        }
    };

exports.openChamberSignupSms =
    (req, res) => {

        const userAgent =
            String(
                req.get("user-agent") || ""
            ).toLowerCase();

        /*
         * iOS uses &body=
         * Android generally uses ?body=
         */
        const smsUrl =
            /iphone|ipad|ipod/.test(
                userAgent
            )
                ? "sms:+12145489175&body=SIGNUP"
                : "sms:+12145489175?body=SIGNUP";


        res.set(
            "Cache-Control",
            "no-store"
        );


        return res
            .status(302)
            .set(
                "Location",
                smsUrl
            )
            .send(
                "Opening your messaging app..."
            );
    };

exports.unsubscribeChamberEmail =
    async (req, res) => {

        try {
            const token =
                String(
                    req.params?.token || ""
                ).trim();

            if (!token) {
                return res
                    .status(400)
                    .send(
                        "Invalid unsubscribe link."
                    );
            }


            /*
             * ---------------------------------------------------------
             * GET
             *
             * Do NOT unsubscribe here.
             *
             * Email security scanners frequently crawl links with GET.
             * We only show a confirmation page.
             * ---------------------------------------------------------
             */

            if (req.method === "GET") {

                const result =
                    await db.query(
                        `
                            SELECT
                                email,
                                unsubscribed_at

                            FROM
                                chamber_email_unsubscribes

                            WHERE
                                token = $1::uuid

                            LIMIT 1;
                        `,
                        [
                            token
                        ]
                    );


                if (!result.rows.length) {
                    return res
                        .status(404)
                        .send(
                            "This unsubscribe link is invalid or expired."
                        );
                }


                const record =
                    result.rows[0];


                if (
                    record.unsubscribed_at
                ) {
                    return res
                        .status(200)
                        .send(`
                            <!doctype html>

                            <html>
                            <head>
                                <meta
                                    name="viewport"
                                    content="width=device-width, initial-scale=1"
                                >

                                <title>
                                    Unsubscribed
                                </title>
                            </head>

                            <body
                                style="
                                    margin:0;
                                    padding:40px 20px;
                                    background:#050510;
                                    color:#ffffff;
                                    font-family:Arial,sans-serif;
                                    text-align:center;
                                "
                            >

                                <div
                                    style="
                                        max-width:560px;
                                        margin:0 auto;
                                        padding:30px;
                                        background:#0d1020;
                                        border:1px solid #22d3ee;
                                        border-radius:16px;
                                    "
                                >

                                    <h1
                                        style="
                                            color:#22d3ee;
                                        "
                                    >
                                        Already Unsubscribed
                                    </h1>

                                    <p
                                        style="
                                            color:#cbd5e1;
                                            line-height:1.6;
                                        "
                                    >
                                        This email address has already
                                        been removed from future
                                        Clubhouse Links lead opportunity
                                        emails.
                                    </p>

                                </div>

                            </body>
                            </html>
                        `);
                }


                return res
                    .status(200)
                    .send(`
                        <!doctype html>

                        <html>

                        <head>
                            <meta
                                name="viewport"
                                content="width=device-width, initial-scale=1"
                            >

                            <title>
                                Confirm Unsubscribe
                            </title>
                        </head>


                        <body
                            style="
                                margin:0;
                                padding:40px 20px;
                                background:#050510;
                                color:#ffffff;
                                font-family:Arial,sans-serif;
                                text-align:center;
                            "
                        >

                            <div
                                style="
                                    max-width:560px;
                                    margin:0 auto;
                                    padding:30px;
                                    background:#0d1020;
                                    border:1px solid #22d3ee;
                                    border-radius:16px;
                                "
                            >

                                <div
                                    style="
                                        color:#ff4db8;
                                        font-size:12px;
                                        font-weight:900;
                                        letter-spacing:2px;
                                    "
                                >
                                    CLUBHOUSE LINKS
                                </div>


                                <h1
                                    style="
                                        margin-top:15px;
                                        color:#ffffff;
                                    "
                                >
                                    Unsubscribe?
                                </h1>


                                <p
                                    style="
                                        color:#cbd5e1;
                                        line-height:1.6;
                                    "
                                >
                                    Confirm that you no longer want to
                                    receive local lead opportunities.
                                </p>


                                <form
                                    method="POST"
                                    action="/server/lead_function/api/leads/chamber-unsubscribe/${encodeURIComponent(token)}"
                                >

                                    <button
                                        type="submit"
                                        style="
                                            margin-top:18px;
                                            padding:14px 24px;
                                            background:#ff4db8;
                                            color:#050510;
                                            border:0;
                                            border-radius:8px;
                                            font-size:16px;
                                            font-weight:900;
                                            cursor:pointer;
                                        "
                                    >
                                        UNSUBSCRIBE
                                    </button>

                                </form>

                            </div>

                        </body>

                        </html>
                    `);
            }


            /*
             * ---------------------------------------------------------
             * POST
             *
             * This is the ONLY method that actually unsubscribes.
             * ---------------------------------------------------------
             */

            if (req.method === "POST") {

                const result =
                    await db.query(
                        `
                            UPDATE
                                chamber_email_unsubscribes

                            SET
                                unsubscribed_at =
                                    COALESCE(
                                        unsubscribed_at,
                                        NOW()
                                    )

                            WHERE
                                token = $1::uuid

                            RETURNING
                                email,
                                unsubscribed_at;
                        `,
                        [
                            token
                        ]
                    );


                if (!result.rows.length) {
                    return res
                        .status(404)
                        .json({
                            success: false,
                            error:
                                "Invalid unsubscribe token"
                        });
                }


                /*
                 * List-Unsubscribe-Post clients generally only care
                 * about a successful 2xx response.
                 */
                const acceptsJson =
                    String(
                        req.get("accept") || ""
                    ).includes(
                        "application/json"
                    );


                if (acceptsJson) {
                    return res
                        .status(200)
                        .json({
                            success: true,
                            unsubscribed: true
                        });
                }


                return res
                    .status(200)
                    .send(`
                        <!doctype html>

                        <html>

                        <head>
                            <meta
                                name="viewport"
                                content="width=device-width, initial-scale=1"
                            >

                            <title>
                                Unsubscribed
                            </title>
                        </head>


                        <body
                            style="
                                margin:0;
                                padding:40px 20px;
                                background:#050510;
                                color:#ffffff;
                                font-family:Arial,sans-serif;
                                text-align:center;
                            "
                        >

                            <div
                                style="
                                    max-width:560px;
                                    margin:0 auto;
                                    padding:30px;
                                    background:#0d1020;
                                    border:1px solid #22d3ee;
                                    border-radius:16px;
                                "
                            >

                                <h1
                                    style="
                                        color:#22d3ee;
                                    "
                                >
                                    You're Unsubscribed
                                </h1>


                                <p
                                    style="
                                        color:#cbd5e1;
                                        line-height:1.6;
                                    "
                                >
                                    You will no longer receive
                                    Clubhouse Links lead opportunity
                                    emails at this address.
                                </p>

                            </div>

                        </body>

                        </html>
                    `);
            }


            return res
                .status(405)
                .json({
                    success: false,
                    error:
                        "Method not allowed"
                });


        } catch (error) {

            console.error(
                "❌ Chamber unsubscribe error:",
                error
            );


            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Unable to process unsubscribe request"
                });
        }
    };










