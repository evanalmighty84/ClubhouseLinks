const db = require("../db/db"); // PostgreSQL connection
const  sendEmail  = require("../utils/sendEmail"); // ✅ You'll need this helper (see below)
const moment = require("moment");

// ✅ Get summary of all leads sent, grouped by company
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

        const query = `
      SELECT 
        COALESCE(company_name, 'Unknown Company') AS company_name,
        COUNT(*) AS total_leads,
        MAX(scraped_at) AS last_sent,
        STRING_AGG(DISTINCT city, ', ') AS cities
      FROM familytreenow
      WHERE lead_sent = TRUE
      ${dateClause}
      GROUP BY company_name
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

        console.log(`📋 Fetching leads for company: ${company_name}`);

        const query = `
      SELECT 
        id,
        author,
        city,
        state,
        lead_type,
        phone,
        scraped_at
      FROM familytreenow
      WHERE company_name = $1 
        AND lead_sent = TRUE
      ORDER BY scraped_at DESC;
    `;

        const { rows } = await db.query(query, [company_name]);

        console.log(`✅ Found ${rows.length} leads for ${company_name}`);
        res.json(rows);
    } catch (error) {
        console.error("❌ Error fetching company leads:", error);
        res.status(500).json({ error: "Failed to retrieve company leads" });
    }
};





exports.sendLeadSummaries = async (req, res) => {
    try {
        console.log("📨 Starting sendLeadSummaries...");

        const { start_date, end_date } = req.query;
        const params = [];
        let dateClause = "";

        if (start_date && end_date) {
            params.push(start_date, end_date);
            dateClause = `AND scraped_at BETWEEN $1 AND $2`;
        }

        // 1️⃣ Get companies that have leads_sent = TRUE
        const leadsQuery = `
            SELECT
                COALESCE(company_name, 'Unknown Company') AS company_name,
                COUNT(*) AS total_leads,
                MAX(scraped_at) AS last_sent,
                STRING_AGG(DISTINCT city, ', ') AS cities
            FROM familytreenow
            WHERE lead_sent = TRUE
                ${dateClause}
            GROUP BY company_name
            ORDER BY total_leads DESC;
        `;
        const { rows: companies } = await db.query(leadsQuery, params);

        if (!companies.length) {
            console.log("⚠️ No companies found with leads_sent = TRUE");
            return res.status(404).json({ message: "No leads found for summary." });
        }

        // 2️⃣ Loop through companies and match them to users with text_queue_enabled
        for (const company of companies) {
            const { company_name, total_leads, last_sent, cities } = company;

            // Get the user tied to this company
            const userRes = await db.query(
                `SELECT email FROM users
                 WHERE LOWER(company_name) = LOWER($1)
                   AND (text_queue_enabled = TRUE OR text_queue_enabled IS NULL)
                     LIMIT 1;`,
                [company_name]
            );

            if (!userRes.rows.length) {
                console.log(`⚠️ No email found for company ${company_name} — skipping`);
                continue;
            }

            const recipientEmail = userRes.rows[0].email;
            console.log(`📧 Preparing summary for ${company_name} (${recipientEmail})`);

            // Fetch that company's most recent leads
            const leadsRes = await db.query(
                `SELECT author, city, state, lead_type, phone, scraped_at
         FROM familytreenow
         WHERE company_name = $1 AND lead_sent = TRUE
         ORDER BY scraped_at DESC LIMIT 25;`,
                [company_name]
            );

            const leadsList = leadsRes.rows
                .map(
                    (l) =>
                        `• ${l.author} (${l.lead_type}) - ${l.city}, ${l.state} (${l.phone || "no phone"})`
                )
                .join("<br>");

            // 🧾 Build HTML email content
            const html = `
        <h2>📊 Weekly Lead Summary for ${company_name}</h2>
        <p><b>Total Leads Sent:</b> ${total_leads}</p>
        <p><b>Last Lead Sent:</b> ${moment(last_sent).format("MMM D, YYYY h:mm A")}</p>
        <p><b>Cities:</b> ${cities}</p>
        <hr>
        <h3>Recent Leads</h3>
        <div style="font-family: monospace; background: #f8f8f8; padding: 10px;">${leadsList}</div>
        <br/>
        <p>Need help following up? <a href="https://clubhouselinks.com/tutorial">Click here</a> for a quick guide.</p>
      `;

            // 3️⃣ Send the email using your SMTP config
            await sendEmail({
                to: recipientEmail,
                subject: `Your Lead Summary Report — ${moment().format("MMMM Do")}`,
                html,
            });

            console.log(`✅ Sent summary email to ${company_name} (${recipientEmail})`);
        }

        res.json({
            message: "Lead summaries sent successfully.",
            count: companies.length,
        });
    } catch (error) {
        console.error("❌ Error sending lead summaries:", error);
        res.status(500).json({ error: "Failed to send lead summaries" });
    }
};


