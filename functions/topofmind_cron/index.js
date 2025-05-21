const moment = require('moment');
const pool = require('./db/db'); // Adjusted path
require('dotenv').config();

(async () => {
	if (process.env.NODE_ENV !== 'production') {
		console.log(`Cron job is not running in production. Skipping execution in ${process.env.NODE_ENV} environment.`);
		process.exit(0);
	}

	console.log('Starting Top of Mind cron job (Workflow 1)');

	try {
		const templatesResult = await pool.query(`
            SELECT t.id AS template_id, t.user_id, t.interval::INTEGER AS interval_days
            FROM templates t
            WHERE t.workflow = '1'
        `);

		const templates = templatesResult.rows;

		if (templates.length === 0) {
			console.log('No Workflow 1 templates found.');
			process.exit(0);
		}

		for (const template of templates) {
			const { user_id, interval_days, template_id } = template;

			console.log(`Processing Workflow 1 for User ID: ${user_id}, Template ID: ${template_id}, Interval: ${interval_days} days`);

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

			for (const subscriber of subscribers) {
				const { subscriber_id } = subscriber;

				console.log(`Processing Subscriber ID: ${subscriber_id}`);

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
					console.log(`Skipping Subscriber ID: ${subscriber_id}. Already has pending email within 30 days (Email ID: ${existingEmail.id}).`);
					continue;
				}

				const proposedSendTime = moment()
					.add(interval_days, 'days')
					.format('YYYY-MM-DD HH:mm:ss');

				await pool.query(`
                    INSERT INTO EmailQueue (user_id, subscriber_id, template_id, send_time, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                `, [user_id, subscriber_id, template_id, proposedSendTime]);

				console.log(`Queued email for Subscriber ID: ${subscriber_id}, Send Time: ${proposedSendTime}`);
			}
		}

		console.log('Top of Mind cron job completed successfully');
		process.exit(0);
	} catch (error) {
		console.error('Error in Top of Mind cron job:', error.message);
		process.exit(1);
	}
})();
