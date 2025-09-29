// send_recent_leads.js
//choose a user_id like 870 below and run that command
//node send_recent_leads.js 870
require('dotenv').config();
const pool = require('../../../db/db');
const axios = require('axios');

const PROD_ALERT_URL =
    process.env.LEAD_ALERT_URL ||
    'https://upbeat-spontaneity-production.up.railway.app/server/crm_function/api/smsqueue/alert-lead';



// --- optional normalization to match your app's behavior
function canonIndustry(s = '') {
    const x = s.trim().toLowerCase();
    const map = {
        pool: 'pool',
        pools: 'pool',
        housecleaner: 'house_cleaner',
        house_cleaner: 'house_cleaner',
        cleaning: 'house_cleaner',
        lawn: 'lawn',
        landscaping: 'lawn',
    };
    return map[x] || x;
}

async function postLeadAlert(payload) {
    // mirror your existing function's validation
    const data = {
        name: (payload.name || '').trim(),
        phone: (payload.phone || '').trim(),
        lead_type: canonIndustry(payload.lead_type || ''),
        city: (payload.city || '').trim() || null,
        description: payload.description ?? null,
        location: payload.location ?? null,
        physical_address: payload.physical_address ?? null,
        timestamp: payload.timestamp ?? null,
    };

    if (!data.name || !data.phone || !data.lead_type) {
        return { ok: false, skipped: true, reason: 'Missing name/phone/lead_type', payload: data };
    }

    try {
        const res = await axios.post(PROD_ALERT_URL, data, { timeout: 10000 });
        return { ok: true, data: res.data, payload: data };
    } catch (err) {
        return { ok: false, error: err.response?.data || err.message, payload: data };
    }
}

async function sendRecentLeadsForUser(userId) {
    const client = await pool.connect();
    try {
        // 1) Load the user
        const u = await client.query(
            `SELECT id, verified, subscribed_areas, industry
         FROM users
        WHERE id = $1`,
            [userId]
        );
        if (u.rowCount === 0) {
            console.log(`No such user id=${userId}`);
            return;
        }
        const user = u.rows[0];

        const areas = Array.isArray(user.subscribed_areas) ? user.subscribed_areas : [];
        if (areas.length === 0) {
            console.log(`User ${userId} has no subscribed_areas; nothing to send.`);
            return;
        }

        // industry can be text or text[]
        let industries = null;
        if (Array.isArray(user.industry)) industries = user.industry.map(canonIndustry);
        else if (user.industry) industries = [canonIndustry(user.industry)];

        // 2) Fetch leads from last 24 hours that match areas (+ optional industry),
        //    have a phone, and weren't already sent to this user.
        const q = `
            SELECT nm.*
            FROM nextdoor_messages nm
            WHERE nm.timestamp >= NOW() - INTERVAL '24 hours'
              AND nm.city = ANY($1::text[])
              AND (
                $2::text[] IS NULL
               OR array_length($2::text[],1) IS NULL
               OR canon_industry(nm.lead_type) = ANY($2::text[])
                )
              AND nm.phone IS NOT NULL AND nm.phone <> ''
            ORDER BY nm.timestamp DESC
                LIMIT 500;
        `;


        // create a tiny immutable canon_industry function if missing (session-safe)
        await client.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'canon_industry') THEN
          CREATE OR REPLACE FUNCTION canon_industry(t text) RETURNS text AS $f$
            SELECT CASE lower(trim($1))
              WHEN 'pools' THEN 'pool'
              WHEN 'pool' THEN 'pool'
              WHEN 'housecleaner' THEN 'house_cleaner'
              WHEN 'house_cleaner' THEN 'house_cleaner'
              ELSE lower(trim($1))
            END;
          $f$ LANGUAGE sql IMMUTABLE;
        END IF;
      END$$;`);

        // NEW
        const { rows: leads } = await client.query(q, [areas, industries]);


        if (leads.length === 0) {
            console.log(`No new leads in last 24h for user ${userId}.`);
            return;
        }

        console.log(`Found ${leads.length} leads for user ${userId}. Sending...`);

        for (const lead of leads) {
            const payload = {
                name: lead.name || '',
                phone: lead.phone || '',
                lead_type: lead.lead_type || '',
                city: lead.city || '',
                description: lead.description || null,
                location: lead.location || null,
                physical_address: lead.physical_address || null,
                timestamp: lead.timestamp || null,
            };

            const result = await postLeadAlert(payload);

            // Insert into lead_alerts_sent for dedupe / audit
            // Store what we sent, even on failure, with status + error message if any
            await client.query(
                `INSERT INTO lead_alerts_sent
           (user_id, lead_id, lead_phone, lead_city, lead_type, post_url, body, delivery_status, error_message, sent_at)
         VALUES
           ($1,     $2,      $3,        $4,        $5,        $6,       $7,   $8,              $9,            NOW())
        `,
                [
                    userId,
                    lead.id,
                    payload.phone,
                    payload.city,
                    canonIndustry(payload.lead_type),
                    PROD_ALERT_URL,
                    JSON.stringify(result.payload),
                    result.ok ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
                    result.ok ? null : (result.error || result.reason || null),
                ]
            );

            if (result.ok) {
                console.log(`✅ Sent lead ${lead.id}`);
            } else if (result.skipped) {
                console.log(`⏭️  Skipped lead ${lead.id}: ${result.reason}`);
            } else {
                console.log(`❌ Failed lead ${lead.id}: ${result.error}`);
            }
        }
    } finally {
        client.release();
    }
}

// CLI: node send_recent_leads.js 870
const userId = parseInt(process.argv[2], 10);
if (!userId) {
    console.error('Usage: node send_recent_leads.js <userId>');
    process.exit(1);
}
sendRecentLeadsForUser(userId).then(() => process.exit(0));
