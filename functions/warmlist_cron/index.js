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


	console.log('Starting Warm List cron job (Workflow 6)');

	try {
		// Step 1: Fetch all users and their Workflow 6 templates
		const templatesResult = await pool.query(`
            SELECT t.id AS template_id, t.user_id, t.interval::INTEGER AS interval_days
            FROM templates t
            WHERE t.workflow = '4'
        `);

		const templates = templatesResult.rows;

		if (templates.length === 0) {
			console.log('No Workflow 4 templates found.');
			return;
		}

		// Process each template
		for (const template of templates) {
			const { user_id, interval_days, template_id } = template;

			console.log(`Processing Workflow 4 for User ID: ${user_id}, Template ID: ${template_id}, Interval: ${interval_days} days`);

			// Step 2: Fetch eligible subscribers who opened an email in the last 14 days but not in the last 7 days
			const subscribersResult = await pool.query(`
                SELECT DISTINCT e.subscriber_id, MAX(e.opened_at) AS last_opened_at
                FROM email_open_events e
                INNER JOIN subscribers s ON e.subscriber_id = s.id
                WHERE e.opened_at >= NOW() - INTERVAL '14 days'
                AND e.opened_at < NOW() - INTERVAL '7 days'
                AND s.user_id = $1
                GROUP BY e.subscriber_id
            `, [user_id]);

			const subscribers = subscribersResult.rows;

			if (subscribers.length === 0) {
				console.log(`No subscribers meet the criteria for User ID: ${user_id}`);
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
        status = 'pending' AND DATE(send_time) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        OR 
        status = 'sent' AND DATE(send_time) >= CURRENT_DATE - INTERVAL '14 days'
    )
`, [user_id, subscriber_id]);


				if (existingEmailResult.rows.length > 0) {
					const existingEmail = existingEmailResult.rows[0];
					console.log(`Skipping Subscriber ID: ${subscriber_id}. Already has pending email within the next 30 days (Email ID: ${existingEmail.id}).`);
					continue;
				}

				// Queue email for 14 days from today
				const proposedSendTime = moment()
					.add(interval_days, 'days') // Warm List interval (14 days)
					.format('YYYY-MM-DD HH:mm:ss');

				// Insert the new email into the queue
				await pool.query(`
                    INSERT INTO EmailQueue (user_id, subscriber_id, template_id, send_time, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                `, [user_id, subscriber_id, template_id, proposedSendTime]);

				console.log(`Queued email for Subscriber ID: ${subscriber_id}, User ID: ${user_id} with Template ID: ${template_id}, Send Time: ${proposedSendTime}`);
			}
		}

		console.log('Warm List cron job completed successfully');
		context.closeWithSuccess();
	} catch (error) {
		console.error('Error in Warm List cron job:', error.message);
		context.closeWithFailure();
	}
};

