const db = require("../db/db"); // PostgreSQL connection
const  sendEmail  = require("../utils/sendEmail"); // ✅ You'll need this helper (see below)
const moment = require("moment");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

let zeptoTransporter = null;

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
         * If more than one DIFFERENT email belongs to this company,
         * don't silently choose one. That could send the report to
         * the wrong person.
         */
        if (recipientRows.length > 1) {
            return res.status(409).json({
                error: `Multiple recipient emails found for ${company_name}`,
                recipients: recipientRows.map((r) => r.email)
            });
        }

        const to = recipientRows[0].email;

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
                    <td>${l.author || "N/A"}</td>
                    <td>${l.lead_type || "—"}</td>
                    <td>${l.city || "—"}</td>
                    <td>${l.state || "—"}</td>
                    <td>${l.phone || "—"}</td>
                    <td>
                        ${
                l.description
                    ? l.description.replace(/\n/g, "<br>")
                    : "—"
            }
                    </td>
                    <td>
                        ${
                l.scraped_at
                    ? new Date(l.scraped_at).toLocaleString()
                    : "—"
            }
                    </td>
                </tr>
            `)
            .join("");

        const html = `
            <h2>Lead Summary for ${company_name}</h2>

            <p>
                Here are your most recent leads from Clubhouse Links:
            </p>

            <table
                border="1"
                cellspacing="0"
                cellpadding="8"
                style="border-collapse: collapse; width: 100%;"
            >
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Phone</th>
                        <th>Description</th>
                        <th>Date</th>
                    </tr>
                </thead>

                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <p style="margin-top: 16px;">
                Total Leads:
                <strong>${rows.length}</strong>
            </p>

            <h3
                style="
                    margin-top: 24px;
                    text-align: center;
                    color: #ff0080;
                "
            >
                Click the link below to see how to get the most return
                on investment from your Clubhouse Links CRM hot leads.
            </h3>

            <div style="text-align: center; margin-top: 12px;">
                <img
                    src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1765155432/phonecall_odl0ou.webp"
                    alt="Phone Call Tutorial"
                    style="
                        max-width: 400px;
                        width: 100%;
                        border-radius: 8px;
                    "
                >
            </div>

            <p style="text-align: center; margin-top: 12px;">
                <a
                    href="https://www.canva.com/design/DAG6PZLvpUE/Fl6hv33MDHcHOQ8nPeCA9Q/view?utm_content=DAG6PZLvpUE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd30cbe3f30"
                    style="
                        font-size: 18px;
                        color: orange;
                        text-decoration: none;
                        font-weight: bold;
                    "
                >
                    Click here to view the video tutorial
                </a>
            </p>
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








