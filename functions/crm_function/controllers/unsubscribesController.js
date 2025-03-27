const pool = require('../db/db');

exports.unsubscribe = async (req, res) => {
    const { subscriberId } = req.params; // Use the subscriberId from the route
    const client = await pool.connect();

    try {
        console.log(`Unsubscribe function triggered for Subscriber ID: ${subscriberId}`);

        await client.query('BEGIN');

        // Step 1: Fetch subscriber details
        const subscriberResult = await client.query(
            'SELECT id, email, user_id FROM subscribers WHERE id = $1',
            [subscriberId]
        );

        const subscriber = subscriberResult.rows[0];

        if (!subscriber) {
            console.log(`Subscriber with ID ${subscriberId} not found.`);
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        console.log(`Subscriber found: ${JSON.stringify(subscriber)}`);

        const { email, user_id } = subscriber; // Extract email and user ID for logging and insertion

        // Step 2: Insert into the unsubscribes table
        await client.query(
            `INSERT INTO unsubscribes (subscriber_id, email, user_id, unsubscribe_reason, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [subscriberId, email, user_id, 'Unsubscribed via email link']
        );
        console.log(`Inserted into unsubscribes table: Subscriber ID: ${subscriberId}, Email: ${email}, User ID: ${user_id}`);

        // Step 3: Delete the subscriber from the subscribers table
        await client.query('DELETE FROM subscribers WHERE id = $1', [subscriberId]);
        console.log(`Deleted subscriber ID ${subscriberId} from subscribers table`);

        await client.query('COMMIT');
        console.log(`Unsubscribe process completed for Subscriber ID: ${subscriberId}`);
        res.redirect('https://www.clubhouselinks.com/app/#/app/unsubscribe');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error during unsubscribe process for Subscriber ID: ${subscriberId}`, error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    } finally {
        client.release();
        console.log(`Database connection released for Subscriber ID: ${subscriberId}`);
    }
};
