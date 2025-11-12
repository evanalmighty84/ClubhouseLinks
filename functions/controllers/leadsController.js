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
        const { company_name } = req.body;

        if (!company_name) {
            return res.status(400).json({ error: "Missing company_name in request body" });
        }

        console.log(`📨 Generating lead summary for ${company_name}...`);

        // Get all leads for that company
        const { rows: leads } = await db.query(
            `
      SELECT 
        author,
        city,
        state,
        lead_type,
        phone,
        scraped_at
      FROM familytreenow
      WHERE company_name = $1
        AND lead_sent = TRUE
      ORDER BY scraped_at DESC
      LIMIT 100;
      `,
            [company_name]
        );

        if (!leads.length) {
            console.log(`⚠️ No leads found for ${company_name}`);
            return res.json({ message: `No leads found for ${company_name}` });
        }

        // Get the company’s user email from the users table
        const { rows: users } = await db.query(
            `
      SELECT email
      FROM users
      WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      LIMIT 1;
      `,
            [company_name]
        );

        const to = users.length ? users[0].email : "evan.ligon@clubhouselinks.com";

        // Build table
        const tableRows = leads
            .map(
                (l) => `
        <tr>
          <td>${l.author || "N/A"}</td>
          <td>${l.lead_type || "—"}</td>
          <td>${l.city || "—"}</td>
          <td>${l.state || "—"}</td>
          <td>${l.phone || "—"}</td>
          <td>${new Date(l.scraped_at).toLocaleString()}</td>
        </tr>
      `
            )
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
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <p style="margin-top: 16px;">Total Leads: <strong>${leads.length}</strong></p>
    `;

        await sendEmail(to, `Your Lead Summary Report — ${company_name}`, html);

        console.log(`📤 Email sent to ${to} for ${company_name}`);
        res.json({ success: true, message: `Report sent for ${company_name}` });
    } catch (error) {
        console.error("❌ Error sending lead summary:", error);
        res.status(500).json({ error: "Failed to send lead summary" });
    }
};




