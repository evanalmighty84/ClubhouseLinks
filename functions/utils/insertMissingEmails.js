const pool = require('./../db/db'); // Ensure correct import path
require('dotenv').config();

async function insertMissingEmails() {
    try {
        const userId = 769; // User ID
        const campaignId = 1297; // Campaign ID
        const subject = "Let me help you fund your next property!"; // Subject of the email
        const sentAt = new Date('2025-07-25T14:30:00Z'); // Sent time (9:30 AM Central Time)

        // 1. Fetch all subscriber emails for user 769
        const subscriberQuery = `
            SELECT id, email
            FROM subscribers
            WHERE user_id = $1
        `;
        const subscriberResult = await pool.query(subscriberQuery, [userId]);

        if (subscriberResult.rows.length === 0) {
            console.log("No subscribers found for this user.");
            return;
        }

        // 2. Fetch the campaign content (html_preview from the campaigns table)
        const campaignQuery = `
            SELECT content
            FROM campaigns
            WHERE id = $1
        `;
        const campaignResult = await pool.query(campaignQuery, [campaignId]);

        if (campaignResult.rows.length === 0) {
            console.log("No campaign found with the provided campaign_id.");
            return;
        }

        const htmlPreview = campaignResult.rows[0].content; // HTML content for the campaign

        // 3. Insert email logs for each subscriber
        const insertQuery = `
            INSERT INTO campaign_emails_sent (
                user_id, campaign_id, subscriber_id, email, subject, html_preview, sent_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        // Loop through each subscriber and insert their email log
        for (let subscriber of subscriberResult.rows) {
            const { id: subscriberId, email } = subscriber;

            // Insert the email log into the campaign_emails_sent table
            await pool.query(insertQuery, [
                userId,
                campaignId,
                subscriberId,
                email,
                subject,
                htmlPreview,
                sentAt // Set the sent time as 9:30 AM Central Time
            ]);

            console.log(`Inserted email log for subscriber ID ${subscriberId}: ${email}`);
        }

        console.log("All missing emails have been inserted successfully!");
    } catch (err) {
        console.error('❌ Error inserting missing emails:', err.message);
    }
}

// Run the function to insert the emails
insertMissingEmails();
