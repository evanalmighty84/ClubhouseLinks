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

        // Step 1️⃣: Get distinct company list
        const { rows: companies } = await db.query(`
            SELECT DISTINCT f.company_name, u.email AS user_email
            FROM familytreenow f
                     LEFT JOIN users u ON LOWER(TRIM(f.company_name)) = LOWER(TRIM(u.name))
            WHERE f.lead_sent = TRUE
              AND f.company_name IS NOT NULL
            ORDER BY f.company_name;
        `);

        if (!companies.length) {
            console.log("⚠️ No companies found to summarize.");
            return res.json({ message: "No companies found to summarize." });
        }

        // Step 2️⃣: Generate and send reports
        for (const company of companies) {
            const { company_name, user_email } = company;
            const to = user_email || "evan.ligon@clubhouselinks.com";

            console.log(`📧 Preparing summary for ${company_name} (${to})`);

            // Step 3️⃣: Query that company’s leads
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
        LIMIT 50;
        `,
                [company_name]
            );

            if (leads.length === 0) {
                console.log(`⚠️ No leads found for ${company_name}`);
                continue;
            }

            // Step 4️⃣: Generate HTML table
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
        <p>Below is a summary of your most recent leads from Clubhouse Links.</p>
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

            // Step 5️⃣: Send the email
            await sendEmail(to, `Your Lead Summary Report`, html);
            console.log(`📤 Email sent to ${to} for ${company_name}`);
        }

        res.json({ success: true, message: "✅ Lead summaries sent per company!" });
    } catch (error) {
        console.error("❌ Error sending lead summaries:", error);
        res.status(500).json({ error: "Failed to send lead summaries" });
    }
};




