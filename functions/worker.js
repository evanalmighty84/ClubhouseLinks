// worker.js
require('dotenv').config();
const { Pool } = require('pg');
const { client, messagingServiceSid } = require('./utils/twilioClient');
const moment = require('moment');

// Setup Postgres using individual env variables like the rest of your app
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// Polling interval (1 minute)
const POLL_INTERVAL_MS = 60 * 1000;

const processQueue = async () => {
    console.log(`[${new Date().toISOString()}] Checking SMS queue...`);

    try {
        const now = moment().toISOString();

        const res = await pool.query(`
            SELECT * FROM smsqueue
            WHERE status = 'pending' AND scheduled_time <= $1
            ORDER BY scheduled_time ASC
        `, [now]);

        if (res.rows.length === 0) {
            console.log(`[${new Date().toISOString()}] No pending SMS to process.`);
        }

        for (const sms of res.rows) {
            try {
                await client.messages.create({
                    body: sms.message,
                    messagingServiceSid,  // <--- this will now work
                    to: sms.phone_number,
                });


                await pool.query(
                    `UPDATE smsqueue SET status = 'sent', updated_at = NOW() WHERE id = $1`,
                    [sms.id]
                );

                console.log(`[${new Date().toISOString()}] ✅ SMS sent to ${sms.phone_number}`);
            } catch (err) {
                console.error(`[${new Date().toISOString()}] ❌ Failed to send SMS to ${sms.phone_number}:`, err.message);
                await pool.query(
                    `UPDATE smsqueue SET status = 'failed', updated_at = NOW() WHERE id = $1`,
                    [sms.id]
                );
            }
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ Error while checking SMS queue:`, err.message);
    }
};

setInterval(processQueue, POLL_INTERVAL_MS);
console.log(`[${new Date().toISOString()}] Worker started and polling every ${POLL_INTERVAL_MS / 1000} seconds`);
