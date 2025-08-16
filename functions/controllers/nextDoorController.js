const pool = require('../db/db');

exports.getNextDoorLeads = async (req, res) => {
    const { userId } = req.params;

    try {
        // Step 1: Get user's industries
        const userResult = await pool.query(
            'SELECT industry FROM users WHERE id = $1',
            [userId]
        );

        const industryArray = userResult.rows[0]?.industry;

        if (!Array.isArray(industryArray) || industryArray.length === 0) {
            console.log('⚠️ No industries found for user:', userId);
            return res.json([]);
        }

        // Normalize input to lowercase to match `lead_type`
        const normalizedIndustries = industryArray.map(ind => ind.toLowerCase());

        // Step 2: Query matching messages
        const leadsResult = await pool.query(
            `SELECT * FROM nextdoor_messages WHERE LOWER(lead_type) = ANY($1)`,
            [normalizedIndustries]
        );

        console.log(`✅ Found ${leadsResult.rows.length} matching leads`);
        res.json(leadsResult.rows);
    } catch (err) {
        console.error('❌ Error fetching nextdoor leads:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
};
