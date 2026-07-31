const db = require("../db/db"); // PostgreSQL connection
const  sendEmail  = require("../utils/sendEmail"); // ✅ You'll need this helper (see below)
const moment = require("moment");
const crypto = require("crypto");


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
exports.sendFamilyTreeAlerts = async (req, res) => {
    try {
        /*
         * --------------------------------------------------------
         * 1. Authenticate the request from Railway
         * --------------------------------------------------------
         */

        const configuredSecret =
            String(
                process.env.FTN_ALERT_SECRET || ""
            );

        const providedSecret =
            String(
                req.get("x-ftn-alert-secret") || ""
            );

        if (!configuredSecret) {
            console.error(
                "❌ FTN_ALERT_SECRET is not configured on Heroku."
            );

            return res.status(500).json({
                success: false,
                emails_sent: 0,
                error:
                    "FamilyTree email endpoint is not configured"
            });
        }

        const configuredSecretBuffer =
            Buffer.from(
                configuredSecret,
                "utf8"
            );

        const providedSecretBuffer =
            Buffer.from(
                providedSecret,
                "utf8"
            );

        const secretIsValid =
            configuredSecretBuffer.length ===
            providedSecretBuffer.length &&
            crypto.timingSafeEqual(
                configuredSecretBuffer,
                providedSecretBuffer
            );

        if (!secretIsValid) {
            console.warn(
                "⚠️ Rejected unauthorized FamilyTree email request."
            );

            return res.status(401).json({
                success: false,
                emails_sent: 0,
                error: "Unauthorized"
            });
        }

        /*
         * --------------------------------------------------------
         * 2. Validate the Railway request body
         * --------------------------------------------------------
         */

        const leadId =
            Number(
                req.body?.lead_id
            );

        const userId =
            Number(
                req.body?.user_id
            );

        const requestedCompanyName =
            String(
                req.body?.company_name || ""
            ).trim();

        if (
            !Number.isInteger(leadId) ||
            leadId <= 0
        ) {
            return res.status(400).json({
                success: false,
                emails_sent: 0,
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
                error:
                    "A valid user_id is required"
            });
        }

        if (!requestedCompanyName) {
            return res.status(400).json({
                success: false,
                emails_sent: 0,
                error:
                    "company_name is required"
            });
        }

        console.log(
            "📧 FamilyTree email request received:",
            {
                leadId,
                userId,
                companyName:
                requestedCompanyName
            }
        );

        /*
         * --------------------------------------------------------
         * 3. Load the FamilyTreeNow lead
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
                lead_id: leadId,
                error:
                    "FamilyTreeNow lead was not found"
            });
        }

        const lead =
            leadRows[0];

        /*
         * --------------------------------------------------------
         * 4. Load the exact email recipient selected by Railway
         * --------------------------------------------------------
         *
         * The recipient must:
         * - Match the provided users.id
         * - Have alert_email = TRUE
         * - Have an email address
         * - Have a company name
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
                    verified,
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
                `⚠️ users.id=${userId} was not eligible for email alerts.`
            );

            return res.status(404).json({
                success: false,
                emails_sent: 0,
                lead_id: leadId,
                user_id: userId,
                error:
                    "The requested user was not found or does not have alert_email enabled"
            });
        }

        const recipient =
            userRows[0];

        /*
         * --------------------------------------------------------
         * 5. Confirm that Railway's company matches the user
         * --------------------------------------------------------
         */

        const normalizeCompanyName = (
            value
        ) =>
            String(value || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

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
                "⚠️ FamilyTree company validation failed:",
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
                lead_id: leadId,
                user_id: userId,
                requested_company_name:
                requestedCompanyName,
                user_company_name:
                recipient.company_name,
                error:
                    "The requested company does not match the selected user"
            });
        }

        /*
         * --------------------------------------------------------
         * 6. Prepare the email content
         * --------------------------------------------------------
         */

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

            const formatted =
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

            return formatted.length
                ? formatted.join(", ")
                : "Home Service";
        };

        const recipientName =
            String(
                recipient.name || ""
            ).trim();

        const companyName =
            String(
                recipient.company_name ||
                requestedCompanyName
            ).trim();

        const author =
            String(
                lead.author || ""
            ).trim() ||
            "Name not provided";

        const leadPhone =
            String(
                lead.phone || ""
            ).trim() ||
            "Phone not available";

        const leadEmail =
            String(
                lead.email || ""
            ).trim();

        const leadType =
            formatLeadType(
                lead.lead_type
            );

        const city =
            String(
                lead.city || ""
            ).trim();

        const state =
            String(
                lead.state || ""
            ).trim();

        const cityAndState =
            [
                city,
                state
            ]
                .filter(Boolean)
                .join(", ") ||
            "Location not provided";

        const physicalLocation =
            String(
                lead.physical_address ||
                lead.location ||
                ""
            ).trim() ||
            "Address not provided";

        const description =
            String(
                lead.description || ""
            ).trim() ||
            "No lead description was provided.";

        const greeting =
            recipientName
                ? `Hey ${recipientName},`
                : `Hello ${companyName},`;

        const subject =
            `⚡ New ${leadType} Lead for ${companyName} — ${cityAndState}`;

        const escapedDescription =
            escapeHtml(
                description
            ).replace(
                /\r?\n/g,
                "<br>"
            );

        const phoneDigits =
            String(lead.phone || "")
                .replace(/\D/g, "");

        const phoneLink =
            phoneDigits.length >= 10
                ? `tel:+1${phoneDigits.slice(-10)}`
                : "";

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
    background:#050510;
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
        background:#050510;
        margin:0;
        padding:0;
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
                    border-collapse:separate;
                    background:#090914;
                    border:1px solid #22d3ee;
                    border-radius:18px;
                    overflow:hidden;
                    box-shadow:
                        0 0 18px rgba(34,211,238,0.35),
                        0 0 36px rgba(255,0,128,0.20);
                "
            >
                <!-- Header -->
                <tr>
                    <td style="
                        padding:30px 28px 24px;
                        text-align:center;
                        background:
                            linear-gradient(
                                135deg,
                                #111126 0%,
                                #090914 55%,
                                #1a0822 100%
                            );
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
                                0 0 10px rgba(34,211,238,0.65);
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
                            font-size:17px;
                            font-weight:800;
                            letter-spacing:0.5px;
                        ">
                            ${escapeHtml(companyName)}
                        </div>
                    </td>
                </tr>

                <!-- Greeting -->
                <tr>
                    <td style="
                        padding:26px 28px 8px;
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

                <!-- Lead identity card -->
                <tr>
                    <td style="
                        padding:20px 28px 8px;
                    ">
                        <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                                width:100%;
                                background:#0d1020;
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

                <!-- Detail grid -->
                <tr>
                    <td style="
                        padding:14px 28px 8px;
                    ">
                        <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                                width:100%;
                                border-collapse:collapse;
                                background:#090914;
                                border:1px solid #252a40;
                                border-radius:12px;
                            "
                        >
                            <tr>
                                <td style="
                                    width:135px;
                                    padding:14px 16px;
                                    border-bottom:1px solid #252a40;
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
                                    border-bottom:1px solid #252a40;
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
                                    border-bottom:1px solid #252a40;
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
                                    border-bottom:1px solid #252a40;
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
                                                border-bottom:1px solid #252a40;
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
                                                border-bottom:1px solid #252a40;
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
                                    border-bottom:1px solid #252a40;
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
                                    border-bottom:1px solid #252a40;
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

                <!-- Description -->
                <tr>
                    <td style="
                        padding:20px 28px 8px;
                    ">
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
                            background:#101020;
                            border:1px solid #ff0080;
                            border-radius:12px;
                            color:#e2e8f0;
                            font-family:
                                Arial,
                                Helvetica,
                                sans-serif;
                            font-size:15px;
                            line-height:1.75;
                            box-shadow:
                                inset 0 0 20px rgba(255,0,128,0.08);
                        ">
                            ${escapedDescription}
                        </div>
                    </td>
                </tr>

                <!-- CTA -->
                ${
            phoneLink
                ? `
                            <tr>
                                <td
                                    align="center"
                                    style="
                                        padding:24px 28px 12px;
                                    "
                                >
                                    <a
                                        href="${phoneLink}"
                                        style="
                                            display:inline-block;
                                            padding:14px 28px;
                                            background:#22d3ee;
                                            border:2px solid #22d3ee;
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
                                            box-shadow:
                                                0 0 16px rgba(34,211,238,0.55);
                                        "
                                    >
                                        Call ${escapeHtml(author)}
                                    </a>
                                </td>
                            </tr>
                        `
                : ""
        }

                <!-- Footer -->
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
                            background:
                                linear-gradient(
                                    90deg,
                                    transparent,
                                    #22d3ee,
                                    #ff0080,
                                    transparent
                                );
                        "></div>

                        <div style="
                            color:#94a3b8;
                            font-size:12px;
                            line-height:1.6;
                        ">
                            Clubhouse Links
                            &nbsp;//&nbsp;
                            FamilyTreeNow Lead ${leadId}
                        </div>

                        <div style="
                            margin-top:5px;
                            color:#475569;
                            font-size:11px;
                        ">
                            This lead was routed to
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
         * 7. Send through the existing Heroku sendEmail helper
         * --------------------------------------------------------
         */

        await sendEmail(
            recipient.email,
            subject,
            emailHtml
        );

        console.log(
            "✅ FamilyTree email alert delivered:",
            {
                leadId,
                userId,
                companyName,
                email:
                recipient.email
            }
        );

        /*
         * The Railway script expects success=true and
         * emails_sent greater than zero.
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
            author,
            city,
            state,
            location:
            physicalLocation,
            message:
                "FamilyTree email alert sent successfully"
        });
    } catch (error) {
        console.error(
            "❌ Error sending FamilyTree email alert:",
            error
        );

        return res.status(500).json({
            success: false,
            emails_sent: 0,
            emails_failed: 1,
            error:
                "Failed to send FamilyTree email alert",
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
                f.email,                     -- 🔥 Add this
                f.physical_address,          -- (optional, nice to have)
                f.description,
                COALESCE(n.timestamp, f.scraped_at) AS post_date
            FROM familytreenow f
                     LEFT JOIN nextdoor_messages n ON f.lead_id = n.id
            WHERE f.company_name @> ARRAY[$1]
              AND f.lead_sent = TRUE
            ORDER BY post_date DESC;
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
            return res.status(400).json({ error: "Missing company_name in request body" });
        }

        // Unnest the company_name array and filter correctly
        const { rows } = await db.query(
            `
                SELECT
                    f.author,
                    f.lead_type,
                    f.city,
                    f.state,
                    f.phone,
                    f.description,
                    COALESCE(n.timestamp, f.scraped_at) AS post_date,
                    u.email AS user_email
                FROM (
                         SELECT *, unnest(company_name) AS single_company
                         FROM familytreenow
                     ) f
                         LEFT JOIN nextdoor_messages n
                                   ON f.lead_id = n.id
                         LEFT JOIN users u
                                   ON LOWER(TRIM(f.single_company)) = LOWER(TRIM(u.company_name))
                WHERE LOWER(TRIM(f.single_company)) = LOWER(TRIM($1))
                ORDER BY post_date DESC
                    LIMIT 100;
            `,
            [company_name]
        );

        if (!rows.length) {
            return res.json({ message: `No leads found for ${company_name}` });
        }

        const to = rows[0].user_email;
        if (!to) {
            return res.json({ message: `No email found for ${company_name}` });
        }

        const tableRows = rows
            .map((l) => `
                <tr>
                    <td>${l.author || "N/A"}</td>
                    <td>${l.lead_type || "—"}</td>
                    <td>${l.city || "—"}</td>
                    <td>${l.state || "—"}</td>
                    <td>${l.phone || "—"}</td>
                    <td>${l.description ? l.description.replace(/\n/g, "<br>") : "—"}</td>
                    <td>${l.post_date ? new Date(l.post_date).toLocaleString() : "—"}</td>
                </tr>
            `)
            .join("");

        const html = `
            <h2>Lead Summary for ${company_name}</h2>
            <p>Here are your most recent leads from Clubhouse Links:</p>

            <table border="1" cellspacing="0" cellpadding="8" style="border-collapse: collapse; width: 100%;">
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
                <tbody>${tableRows}</tbody>
            </table>

            <p style="margin-top: 16px;">
                Total Leads: <strong>${rows.length}</strong>
            </p>

            <!-- ⭐ NEW SECTION ADDED BELOW ⭐ -->
<!-- ⭐ UPDATED TUTORIAL SECTION ⭐ -->

<h3 style="margin-top: 24px; text-align: center; color:#ff0080;">
    Click the link below to see how to get the most return on investment from your Clubhouse Links CRM hot leads.
</h3>

<div style="text-align:center; margin-top: 12px;">
    <img src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1765155432/phonecall_odl0ou.webp"
         alt="Phone Call Tutorial"
         style="max-width: 400px; width: 100%; border-radius: 8px;">
</div>

<p style="text-align:center; margin-top: 12px;">
    <a href="https://www.canva.com/design/DAG6PZLvpUE/Fl6hv33MDHcHOQ8nPeCA9Q/view?utm_content=DAG6PZLvpUE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd30cbe3f30"
       style="font-size: 18px; color: orange; text-decoration: none; font-weight: bold;">
        Click here to view the video tutorial
    </a>
</p>

<!-- ⭐ END UPDATED SECTION ⭐ -->

        `;

        await sendEmail(to, `Your Lead Summary Report — ${company_name}`, html);

        res.json({
            success: true,
            message: `Lead summary sent to ${to} for ${company_name}`
        });

    } catch (error) {
        console.error("❌ Error sending lead summary:", error);
        res.status(500).json({ error: "Failed to send lead summary" });
    }
};








