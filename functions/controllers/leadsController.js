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

        // ✅ Query each company’s stats + its matching email from users
        const { rows } = await db.query(`
      SELECT 
        COALESCE(f.company_name, 'Unknown Company') AS company_name,
        COUNT(*) AS total_leads,
        STRING_AGG(DISTINCT f.city, ', ') AS cities,
        MAX(f.scraped_at) AS last_sent,
        u.email AS user_email
      FROM familytreenow f
      LEFT JOIN users u ON LOWER(TRIM(f.company_name)) = LOWER(TRIM(u.name))
      WHERE f.lead_sent = TRUE
      GROUP BY f.company_name, u.email
      ORDER BY total_leads DESC;
    `);

        if (!rows.length) {
            console.log("⚠️ No company leads found for summary.");
            return res.json({ message: "No leads available to summarize." });
        }

        // ✅ Send to each company
        for (const company of rows) {
            const recipient = company.user_email || "evan.ligon@clubhouselinks.com"; // fallback
            console.log(`📧 Preparing summary for ${company.company_name} (${recipient})`);

            const html = `
        <h2>Lead Summary for ${company.company_name}</h2>
        <p><strong>Total Leads:</strong> ${company.total_leads}</p>
        <p><strong>Cities:</strong> ${company.cities}</p>
        <p><strong>Last Sent:</strong> ${new Date(company.last_sent).toLocaleString()}</p>
      `;

            await sendEmail(recipient, "Your Lead Summary Report", html);
        }

        res.json({ success: true, message: "Lead summary emails sent successfully!" });
    } catch (error) {
        console.error("❌ Error sending lead summaries:", error);
        res.status(500).json({ error: "Failed to send lead summaries" });
    }
};



