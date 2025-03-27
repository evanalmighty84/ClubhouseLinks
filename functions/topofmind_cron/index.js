const moment = require('moment');
const pool = require('./db/db'); // Adjust path as needed
const dotenv = require('dotenv');

dotenv.config();

module.exports = async (cronDetails, context) => {
	if (process.env.NODE_ENV !== 'production') {
		console.log(`Cron job is not running in production. Skipping execution in ${process.env.NODE_ENV} environment.`);
		context.closeWithSuccess();
		return;
	}
	console.log('Starting Top of Mind cron job (Workflow 1)');

	try {
		// Step 1: Fetch all users and their Workflow 1 templates
		const templatesResult = await pool.query(`
            SELECT t.id AS template_id, t.user_id, t.interval::INTEGER AS interval_days
            FROM templates t
            WHERE t.workflow = '1'
        `);

		const templates = templatesResult.rows;

		if (templates.length === 0) {
			console.log('No Workflow 1 templates found.');
			return;
		}

		// Process each template
		for (const template of templates) {
			const { user_id, interval_days, template_id } = template;

			console.log(`Processing Workflow 1 for User ID: ${user_id}, Template ID: ${template_id}, Interval: ${interval_days} days`);

			// Step 2: Fetch all subscribers who haven't opened an email in the last 30 days
			const subscribersResult = await pool.query(`
                SELECT s.id AS subscriber_id, MAX(e.opened_at) AS last_opened_at
                FROM subscribers s
                LEFT JOIN email_open_events e ON s.id = e.subscriber_id
                WHERE s.user_id = $1
                GROUP BY s.id
                HAVING MAX(e.opened_at) IS NULL OR MAX(e.opened_at) <= NOW() - INTERVAL '${interval_days} days'
            `, [user_id]);

			const subscribers = subscribersResult.rows;

			if (subscribers.length === 0) {
				console.log(`No subscribers found for User ID: ${user_id}`);
				continue;
			}

			// Process each subscriber
			for (const subscriber of subscribers) {
				const { subscriber_id } = subscriber;

				console.log(`Processing Subscriber ID: ${subscriber_id}`);

				// Check if there is already a pending email scheduled in the next 30 days
				const existingEmailResult = await pool.query(`
    SELECT id 
    FROM EmailQueue
    WHERE user_id = $1
    AND subscriber_id = $2
    AND (
        status = 'pending' AND DATE(send_time) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        OR 
        status = 'sent' AND DATE(send_time) >= CURRENT_DATE - INTERVAL '30 days'
    )
`, [user_id, subscriber_id]);


				if (existingEmailResult.rows.length > 0) {
					const existingEmail = existingEmailResult.rows[0];
					console.log(`Skipping Subscriber ID: ${subscriber_id}. Already has pending email within the next 30 days (Email ID: ${existingEmail.id}).`);

					// Prevent insertion into DB by skipping to the next iteration
					continue;
				}

				// Queue email for 30 days from today
				const proposedSendTime = moment()
					.add(interval_days, 'days') // Top of Mind interval (30 days)
					.format('YYYY-MM-DD HH:mm:ss');

				// Insert the new email into the queue
				await pool.query(`
                    INSERT INTO EmailQueue (user_id, subscriber_id, template_id, send_time, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                `, [user_id, subscriber_id, template_id, proposedSendTime]);

				console.log(`Queued email for Subscriber ID: ${subscriber_id}, User ID: ${user_id} with Template ID: ${template_id}, Send Time: ${proposedSendTime}`);
			}
		}

		console.log('Top of Mind cron job completed successfully');
		context.closeWithSuccess();
	} catch (error) {
		console.error('Error in Top of Mind cron job:', error.message);
		context.closeWithFailure();
	}
};
