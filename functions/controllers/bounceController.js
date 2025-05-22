const pool = require('../db/db');  // Ensure the database pool is correctly configured
const { deleteSubscriber } = require('./subscriberController');  // Import the deleteSubscriber function

// Controller function to handle bounce events from Zoho
exports.handleBounceEvent = async (req, res) => {
    try {
        console.log('Received webhook payload:', req.body);

        // Extract the bounced email from the HTML field
        const htmlContent = req.body.html;
        const bounce_reason = req.body.summary || 'Unknown reason';
        const campaign_id = req.body.campaign_id || null;

        // Use regex to extract the email address from the HTML content
        const emailRegex = /Final-Recipient: rfc822; ([^<\s]+)/;
        const match = emailRegex.exec(htmlContent);
        const email = match ? match[1] : null;

        if (!email) {
            console.error('Failed to extract email from the payload');
            return res.status(400).json({ error: 'Failed to extract email from the bounce report' });
        }

        // Step 1: Find the subscriber by email
        const subscriberResult = await pool.query(
            'SELECT id, user_id FROM subscribers WHERE email = $1',
            [email]
        );

        const subscriber = subscriberResult.rows[0];

        if (subscriber) {
            const subscriberId = subscriber.id;
            const userId = subscriber.user_id;

            console.log(`Subscriber found: Subscriber ID: ${subscriberId}, User ID: ${userId}, Email: ${email}`);

            // Step 2: Log the bounce in the `email_bounce_events` table
            try {
                console.log('Logging bounce in email_bounce_events:', {
                    campaign_id,
                    subscriberId,
                    email,
                    bounce_reason,
                    userId
                });

                await pool.query(
                    `INSERT INTO email_bounce_events (campaign_id, subscriber_id, recipient_email, bounce_message, user_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [campaign_id, subscriberId, email, bounce_reason, userId]
                );

                console.log(`Bounce event logged for Subscriber ID: ${subscriberId}, Email: ${email}`);
            } catch (error) {
                console.error('Error logging bounce in email_bounce_events:', error);
                // Continue even if this step fails
            }

            // Step 3: Log the bounce in the `unsubscribes` table
            try {
                console.log('Logging unsubscribe due to bounce:', {
                    subscriberId,
                    email,
                    bounce_reason
                });

                await pool.query(
                    `INSERT INTO unsubscribes (subscriber_id, email, unsubscribe_reason, created_at)
                     VALUES ($1, $2, $3, NOW())`,
                    [subscriberId, email, 'Bounced: ' + bounce_reason]
                );

                console.log(`Unsubscribe event logged for Subscriber ID: ${subscriberId}, Email: ${email}`);
            } catch (error) {
                console.error('Error logging unsubscribe due to bounce:', error);
                // Continue even if this step fails
            }

            // Step 4: Call the `deleteSubscriber` function to clean up
            try {
                req.params.id = subscriberId;
                req.query.userId = userId;

                console.log(`Attempting to delete Subscriber ID: ${subscriberId}, User ID: ${userId}`);
                await deleteSubscriber(req, res);

                console.log(`Subscriber ID: ${subscriberId} successfully deleted.`);
            } catch (error) {
                console.error(`Error deleting Subscriber ID: ${subscriberId}:`, error);
                return res.status(500).json({ error: 'Failed to delete subscriber after bounce event' });
            }

        } else {
            console.error(`Subscriber with email ${email} not found`);
            return res.status(404).json({ error: 'Subscriber not found' });
        }
    } catch (error) {
        console.error('Error handling bounce event:', error);
        return res.status(500).json({ error: 'Failed to process bounce event' });
    }
};
