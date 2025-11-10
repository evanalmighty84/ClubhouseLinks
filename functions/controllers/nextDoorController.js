const pool = require('../db/db');

exports.getNextDoorLeads = async (req, res) => {
    const { userId } = req.params;

    try {
        // 1️⃣ Get user's industries
        const userResult = await pool.query(
            'SELECT industry FROM users WHERE id = $1',
            [userId]
        );

        const industryArray = userResult.rows[0]?.industry || [];
        const normalizedIndustries = industryArray.map((s) => String(s).toLowerCase());

        // 2️⃣ Always join familytreenow for enrichment
        const sql = `
      SELECT 
        nm.id,
        nm.author,
        nm.location,
        nm.city,
        nm.lead_type,
        COALESCE(ftn.phone, NULL) AS phone,                    -- 🟢 enrich from familytreenow
        COALESCE(ftn.physical_address, NULL) AS physical_address,
        COALESCE(ftn.description, nm.description) AS description,
        nm.timestamp,
        nm.state,
        ftn.company_name,
        ftn.professionalnumbertocall,
        ftn.phones AS enriched_phones,
        CASE WHEN ftn.phone IS NOT NULL THEN TRUE ELSE FALSE END AS enriched
      FROM nextdoor_messages nm
      LEFT JOIN familytreenow ftn ON ftn.lead_id = nm.id
      WHERE
        array_length($1::text[], 1) IS NULL OR
        EXISTS (
          SELECT 1 FROM unnest($1::text[]) AS i
          WHERE LOWER(nm.lead_type) LIKE '%' || i || '%'
        )
      ORDER BY nm.timestamp DESC;
    `;

        const { rows } = await pool.query(sql, [normalizedIndustries]);

        console.log(`✅ Found ${rows.length} enriched leads (joined with familytreenow) for user ${userId}`);
        res.json(rows);

    } catch (err) {
        console.error('❌ Error fetching Nextdoor leads:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
};
