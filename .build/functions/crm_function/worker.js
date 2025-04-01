// worker.js
require('dotenv').config();
const { Pool } = require('pg');
const client = require('./utils/twilioClient');
const moment = require('moment');

// Setup Postgres
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Polling interval (e.g., every minute)
const POLL_INTERVAL_MS = 60 * 1000;

const processQueue = async () => {
    console.log('Checking SMS queue...');

    const now = moment().toISOString();

    const res = await pool.query(`
        SELECT * FROM smsqueue
        WHERE status = 'pending' AND scheduled_time <= $1
        ORDER BY scheduled_time ASC
    `, [now]);

    for (const sms of res.rows) {
        try {
            await client.messages.create({
                body: sms.message,
                messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                to: sms.phone_number,
            });

            await pool.query(
                `UPDATE smsqueue SET status = 'sent', updated_at = NOW() WHERE id = $1`,
                [sms.id]
            );

            console.log(`SMS sent to ${sms.phone_number}`);
        } catch (err) {
            console.error('Failed to send SMS:', err);
            await pool.query(
                `UPDATE smsqueue SET status = 'failed', updated_at = NOW() WHERE id = $1`,
                [sms.id]
            );
        }
    }
};

setInterval(processQueue, POLL_INTERVAL_MS);
console.log('Worker started');
