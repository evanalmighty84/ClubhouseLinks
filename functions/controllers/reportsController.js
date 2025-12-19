const pool = require("../db/db"); // PostgreSQL connection

/**
 * Helper: resolve date range
 */
function resolveDateRange(startDate, endDate) {
    if (!startDate && !endDate) {
        return {
            start: "NOW() - INTERVAL '30 days'",
            end: "NOW()",
            values: [],
        };
    }

    if (startDate && !endDate) {
        return {
            start: "$1",
            end: "NOW()",
            values: [startDate],
        };
    }

    return {
        start: "$1",
        end: "$2",
        values: [startDate, endDate],
    };
}

/**
 * GET /api/reports/leads-sent
 * Params: industry, startDate?, endDate?
 */
exports.getLeadsSentByIndustry = async (req, res) => {
    try {
        const { industry, startDate, endDate } = req.query;

        if (!industry) {
            return res.status(400).json({ error: "industry is required" });
        }

        const start =
            startDate
                ? new Date(startDate)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const end = endDate ? new Date(endDate) : new Date();

        const query = `
            SELECT
                id,
                sent_at,
                lead_city AS city,
                lead_phone AS phone,
                lead_type,
                delivery_status,
                body
            FROM lead_alerts_sent
            WHERE lead_type ILIKE $1
              AND sent_at BETWEEN $2 AND $3
            ORDER BY sent_at DESC
        `;

        const values = [`%${industry}%`, start, end];

        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (err) {
        console.error("getLeadsSentByIndustry error:", err);
        res.status(500).json({ error: "Failed to fetch leads sent" });
    }
};

/**
 * GET /api/reports/possible-leads
 * Params: industries (comma-separated), startDate?, endDate?
 */
exports.getPossibleLeads = async (req, res) => {
    const { industries, startDate, endDate } = req.query;

    if (!industries) {
        return res.status(400).json({ error: "industries parameter required" });
    }

    const industryList = industries
        .split(",")
        .map(i => i.trim().toLowerCase())
        .filter(Boolean);

    const regex = industryList.join("|");
    const dateRange = resolveDateRange(startDate, endDate);

    try {
        const query = `
            SELECT
                id,
                city,
                state,
                lead_type,
                description,
                timestamp,
                post_url
            FROM nextdoor_messages
            WHERE enrichment = FALSE
              AND state = 'TX'
              AND lead_type ~* $${dateRange.values.length + 1}
              AND timestamp BETWEEN ${dateRange.start} AND ${dateRange.end}
            ORDER BY timestamp DESC
        `;

        const values = [...dateRange.values, regex];
        const { rows } = await pool.query(query, values);

        res.json(rows);
    } catch (err) {
        console.error("getPossibleLeads error:", err);
        res.status(500).json({ error: "Failed to fetch possible leads" });
    }
};

/**
 * POST /api/reports/send-industry-report
 * Body: userId, startDate?, endDate?
 */
exports.sendIndustryReportsEmail = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const INDUSTRIES = ["plumber", "electrician", "hvac"];

        const start =
            startDate
                ? new Date(startDate)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const end = endDate ? new Date(endDate) : new Date();

        // Get email recipient
        const { rows: users } = await pool.query(
            `SELECT email, company_name FROM users WHERE id = $1`,
            [userId]
        );

        if (!users.length || !users[0].email) {
            return res.json({ message: "No email found for user" });
        }

        const to = users[0].email;
        const companyName = users[0].company_name || "Your Company";

        let emailSections = "";
        let totalLeadsSent = 0;

        // Leads sent per industry (GLOBAL, not per user)
        for (const industry of INDUSTRIES) {
            const { rows } = await pool.query(
                `
                    SELECT
                        lead_city,
                        lead_phone,
                        sent_at
                    FROM lead_alerts_sent
                    WHERE lead_type ILIKE $1
                      AND sent_at BETWEEN $2 AND $3
                    ORDER BY sent_at DESC
                `,
                [`%${industry}%`, start, end]
            );

            totalLeadsSent += rows.length;
            if (!rows.length) continue;

            const rowsHtml = rows.map(l => `
                <tr>
                    <td>${industry.toUpperCase()}</td>
                    <td>${l.lead_city || "—"}</td>
                    <td>${l.lead_phone || "—"}</td>
                    <td>${new Date(l.sent_at).toLocaleString()}</td>
                </tr>
            `).join("");

            emailSections += `
                <h3 style="margin-top:24px;">${industry.toUpperCase()} — Leads Sent</h3>
                <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse;">
                    <thead style="background:#f2f2f2;">
                        <tr>
                            <th>Industry</th>
                            <th>City</th>
                            <th>Phone</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            `;
        }

        await sendEmail(
            to,
            `Industry Lead Report — ${companyName}`,
            emailSections
        );

        res.json({
            success: true,
            sentTo: to,
            totalLeadsSent,
        });
    } catch (err) {
        console.error("❌ sendIndustryReportsEmail error:", err);
        res.status(500).json({ error: "Failed to send industry report email" });
    }
};
