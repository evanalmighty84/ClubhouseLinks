require('dotenv').config();
const pool = require('./../db/db'); // Adjusted path
const axios = require('axios');

(async () => {
    console.log('🐜 Starting Pest Control Lead Alert Job...');

    try {
        // ✅ Step 1: Query pest-control leads from the last 7 days that have a phone number
        const { rows: leads } = await pool.query(`
      SELECT 
        id, author, timestamp, location, city, lead_type, phone, mobile_phone, physical_address, description
      FROM nextdoor_messages
      WHERE lead_type ILIKE '%pest%'
        AND COALESCE(phone, '') <> ''
        AND timestamp >= NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
    `);

        console.log(`📋 Found ${leads.length} pest-control leads with phones from the last 7 days.`);

        // Define the core coverage areas for your pest_control subscriber(s)
        const coreCities = ['plano', 'mckinney', 'dallas', 'allen', 'richardson'];

        // ✅ Step 2: Loop through and send each via your controller endpoint
        for (const lead of leads) {
            const normalizedCity = (lead.city || '').trim().toLowerCase();

            // If city not in your subscribed core area list → use neighborhood as "address line"
            let adjustedCity = lead.city;
            let adjustedAddress = lead.physical_address;
            if (!coreCities.includes(normalizedCity)) {
                adjustedAddress = lead.location || lead.physical_address || null;
                // Optionally, you can route them under the nearest metro:
                adjustedCity = 'Plano';
            }

            // ✅ Build the payload exactly as your controller expects
            const payload = {
                lead_id: lead.id,
                city: adjustedCity,
                physical_address: adjustedAddress,
                description: lead.description,
            };

            try {
                // ✅ Step 3: Post to your live controller — this ensures Twilio + DB insertion
                const res = await axios.post(
                    'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/smsqueue/alert-lead',
                    payload,
                    { timeout: 20000 }
                );

                console.log(
                    `✅ [${lead.id}] ${lead.author || 'Unknown'} (${lead.city || 'Unknown'}) → ${
                        res.data?.matchedUsers || 0
                    } user(s) notified.`
                );
            } catch (err) {
                console.warn(`⚠️ Failed to send alert for lead ${lead.id}: ${err.message}`);
            }
        }

        console.log('🎉 Pest Control Lead Alert Job Complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal Error in Pest Control Alert Job:', err);
        process.exit(1);
    }
})();
