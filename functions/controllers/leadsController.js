const db = require("../db/db"); // PostgreSQL connection
const  sendEmail  = require("../utils/sendEmail"); // ✅ You'll need this helper (see below)
const moment = require("moment");

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

            <h3 style="margin-top: 24px;">See tutorial on how to get the most Return On Investment from your hot leads:</h3>

            <div style="text-align:center; margin-top: 12px;">
                <img src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1765155432/phonecall_odl0ou.webp"
                     alt="Phone Call Tutorial"
                     style="max-width: 400px; width: 100%; border-radius: 8px;">
            </div>

            <p style="text-align:center; margin-top: 12px;">
                <a href="https://www.canva.com/design/DAG6PZLvpUE/Fl6hv33MDHcHOQ8nPeCA9Q/view?utm_content=DAG6PZLvpUE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd30cbe3f30"
                   style="font-size: 18px; color: #007bff; text-decoration: none;">
                    Click here to view tutorial
                </a>
            </p>

            <!-- ⭐ END NEW SECTION ⭐ -->
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








