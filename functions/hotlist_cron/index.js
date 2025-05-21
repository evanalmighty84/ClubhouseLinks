const moment = require('moment');
const pool = require('../../db/db'); // adjust path if needed
require('dotenv').config();

(async () => {
	if (process.env.NODE_ENV !== 'production') {
		console.log(`Cron job is not running in production. Skipping execution in ${process.env.NODE_ENV} environment.`);
		process.exit(0);
	}

	console.log('Starting Hot List cron job (Workflow 5)');

	try {
		const templatesResult = await pool.query(`
            SELECT t.id AS template_id, t.user_id, t.interval::INTEGER AS interval_days
            FROM templates t
            WHERE t.workflow = '5'
        `);

		const templates = templatesResult.rows;

		if (templates.length === 0) {
			console.log('No Workflow 5 templates found.');
			process.exit(0);
		}

		for (const template of templates) {
			const { user_id, interval_days, template_id } = template;

			console.log(`Processing Workflow 5 for User ID: ${user_id}`);

			const subscribersResult = await pool.query(`
                SELECT DISTINCT e.subscriber_id, MAX(e.opened_at) AS last_opened_at
                FROM email_open_events e
                INNER JOIN subscribers s ON e.subscriber_id = s.id
                WHERE e.opened_at >= NOW() - INTERVAL '${interval_days} days'
                AND s.user_id = $1
                GROUP BY e.subscriber_id
            `, [user_id]);

			const subscribers = subscribersResult.rows;

			if (subscribers.length === 0) {
				console.log(`No subscribers meet the criteria for User ID: ${user_id}`);
				continue;
			}

			for (const subscriber of subscribers) {
				const { subscriber_id } = subscriber;

				const existingEmailResult = await pool.query(`
                    SELECT id 
                    FROM EmailQueue
                    WHERE user_id = $1
                    AND subscriber_id = $2
                    AND (
                        status = 'pending' AND DATE(send_time) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                        OR 
                        status = 'sent' AND DATE(send_time) >= CURRENT_DATE - INTERVAL '7 days'
                    )
                `, [user_id, subscriber_id]);

				if (existingEmailResult.rows.length > 0) {
					console.log(`Skipping subscriber_id: ${subscriber_id}. Already has email scheduled or sent recently.`);
					continue;
				}

				const proposedSendTime = moment()
					.add(interval_days, 'days')
					.format('YYYY-MM-DD HH:mm:ss');

				await pool.query(`
                    INSERT INTO EmailQueue (user_id, subscriber_id, template_id, send_time, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                `, [user_id, subscriber_id, template_id, proposedSendTime]);

				console.log(`Queued email for subscriber_id: ${subscriber_id} at ${proposedSendTime}`);
			}
		}

		console.log('Hot List cron job completed successfully');
		process.exit(0);
	} catch (error) {
		console.error('Error in Hot List cron job:', error.message);
		process.exit(1);
	}
})();
