const pool = require('../db/db');

// controllers/nextdoor.js
exports.getNextDoorLeads = async (req, res) => {
    const { userId } = req.params;

    try {
        // 1) User industries
        const userResult = await pool.query(
            'SELECT industry FROM users WHERE id = $1',
            [userId]
        );
        const industryArray = userResult.rows[0]?.industry;

        if (!Array.isArray(industryArray) || industryArray.length === 0) {
            console.log('⚠️ No industries found for user:', userId);
            return res.json({ hot: [], warm: [] });
        }

        const normalizedIndustries = industryArray.map((s) => String(s).toLowerCase());

        // 2) HOT: everything in recent_nextdoor_messages for those industries
        const hotSql = `
      SELECT rnm.*
      FROM recent_nextdoor_messages rnm
      WHERE LOWER(rnm.lead_type) = ANY($1)
      ORDER BY COALESCE(rnm.message_sent_at, NOW() - INTERVAL '100 years') DESC, rnm.id DESC
    `;
        const { rows: hot } = await pool.query(hotSql, [normalizedIndustries]);

        // 3) WARM: from nextdoor_messages, excluding any still present in recent_nextdoor_messages
        const warmSql = `
      SELECT nm.*
      FROM nextdoor_messages nm
      LEFT JOIN recent_nextdoor_messages rnm
        ON rnm.post_url = nm.post_url
      WHERE LOWER(nm.lead_type) = ANY($1)
        AND rnm.post_url IS NULL
      ORDER BY COALESCE(nm.message_sent_at, NOW() - INTERVAL '100 years') DESC, nm.id DESC
    `;
        const { rows: warm } = await pool.query(warmSql, [normalizedIndustries]);

        console.log(`✅ Found ${hot.length} hot and ${warm.length} warm leads`);
        return res.json({ hot, warm });
    } catch (err) {
        console.error('❌ Error fetching nextdoor leads:', err);
        return res.status(500).json({ error: 'Failed to fetch leads' });
    }
};

