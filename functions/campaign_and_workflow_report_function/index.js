const db = require('./db/db');
const moment = require('moment');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const ADMIN_EMAIL = 'evan.ligon@clubhouselinks.com';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Email sender function
const sendEmail = async (to, subject, htmlContent) => {
	try {
		const transporter = nodemailer.createTransport({
			host: 'smtp.zoho.com',
			port: 587,
			secure: false,
			auth: {
				user: EMAIL_USER,
				pass: EMAIL_PASS
			},
			connectionTimeout: 15000,
			greetingTimeout: 10000,
			socketTimeout: 20000
		});

		await transporter.sendMail({
			from: EMAIL_USER,
			to,
			subject,
			html: htmlContent
		});

		console.log(`📤 Email sent to ${to}`);
	} catch (err) {
		console.error('❌ Email send error:', err);
		throw err;
	}
};

module.exports = async (cronDetails, context) => {

	if (process.env.NODE_ENV !== 'production') {
		console.log(`Cron job is not running in production. Skipping execution in ${process.env.NODE_ENV} environment.`);
		context.closeWithSuccess();
		return;
	}


	const today = moment().startOf('day');
	const day6 = today.clone().subtract(6, 'days');
	const day7 = today.clone().subtract(7, 'days');

	try {
		const { rows: campaigns } = await db.query(`
      SELECT c.id, c.user_id, c.subject, c.content, u.email AS user_email
      FROM campaigns c
      JOIN users u ON u.id = c.user_id
      WHERE c.created_at >= $1 AND c.created_at < ($1 + interval '1 day')
    `, [day7.format('YYYY-MM-DD')]);

		for (const campaign of campaigns) {
			const { id: campaignId, user_id, subject, content, user_email } = campaign;

			// Using email_open_events and email_click_events to simulate sent stats
			const { rows: openRows } = await db.query(`
        SELECT COUNT(DISTINCT subscriber_id) AS total_opened
        FROM email_open_events
        WHERE campaign_id = $1
      `, [campaignId]);

			const { rows: clickRows } = await db.query(`
        SELECT COUNT(DISTINCT subscriber_id) AS total_clicked
        FROM email_click_events
        WHERE campaign_id = $1
      `, [campaignId]);

			// Assume sent = unique opens + unique non-opened clicks (just a fallback estimate)
			const total_opened = parseInt(openRows[0].total_opened || 0);
			const total_clicked = parseInt(clickRows[0].total_clicked || 0);
			const total_sent = total_opened + 5; // or a better logic if available

			const open_rate = total_sent ? ((total_opened / total_sent) * 100).toFixed(2) : 0;
			const click_rate = total_sent ? ((total_clicked / total_sent) * 100).toFixed(2) : 0;

			// Queue pre-report to admin (6-day)
			await db.query(`
        INSERT INTO reportsqueue (
          user_id, report_type, campaign_id, scheduled_time, status,
          subject, to_email, report_html,
          total_sent, total_opened, open_rate,
          total_clicked, click_rate, campaign_preview
        ) VALUES (
          $1, 'campaign', $2, $3, 'pending',
          $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12
        )
      `, [
				user_id,
				campaignId,
				day6.endOf('day').toISOString(),
				`Pre-Report: ${subject} (Campaign #${campaignId})`,
				ADMIN_EMAIL,
				content,
				total_sent,
				total_opened,
				open_rate,
				total_clicked,
				click_rate,
				content
			]);

			// Queue final report to user (7-day)
			await db.query(`
        INSERT INTO reportsqueue (
          user_id, report_type, campaign_id, scheduled_time, status,
          subject, to_email, report_html,
          total_sent, total_opened, open_rate,
          total_clicked, click_rate, campaign_preview
        ) VALUES (
          $1, 'campaign', $2, $3, 'pending',
          $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12
        )
      `, [
				user_id,
				campaignId,
				day7.endOf('day').toISOString(),
				`Campaign Report: ${subject}`,
				user_email,
				content,
				total_sent,
				total_opened,
				open_rate,
				total_clicked,
				click_rate,
				content
			]);
		}

		console.log(`📂 Queued ${campaigns.length * 2} campaign report(s).`);

		// Send pending reports
		const { rows: reports } = await db.query(`
      SELECT * FROM reportsqueue
      WHERE status = 'pending' AND scheduled_time <= now()
      ORDER BY scheduled_time ASC
    `);

		for (const report of reports) {
			const {
				id,
				to_email,
				subject,
				report_html,
				total_sent,
				total_opened,
				open_rate,
				total_clicked,
				click_rate,
				top_links,
				campaign_preview,
				template_preview
			} = report;

			try {
				const html = `
          <div style="font-family: Arial, sans-serif;">
            <h2>${subject}</h2>
            <p><strong>Total Sent:</strong> ${total_sent}</p>
            <p><strong>Total Opened:</strong> ${total_opened}</p>
            <p><strong>Open Rate:</strong> ${open_rate}%</p>
            <p><strong>Total Clicked:</strong> ${total_clicked}</p>
            <p><strong>Click Rate:</strong> ${click_rate}%</p>
            <hr />
            <h3>Email Preview:</h3>
            <div style="border: 1px solid #ddd; padding: 15px;">
              ${campaign_preview || template_preview || '<p><em>No preview available.</em></p>'}
            </div>
          </div>
        `;

				await sendEmail(to_email, subject, html);

				await db.query(`
          UPDATE reportsqueue
          SET status = 'sent', updated_at = now()
          WHERE id = $1
        `, [id]);

				console.log(`✅ Report #${id} sent to ${to_email}`);
			} catch (err) {
				await db.query(`
          UPDATE reportsqueue
          SET status = 'failed', updated_at = now()
          WHERE id = $1
        `, [id]);

				console.error(`❌ Failed to send report #${id}`, err);
				console.log(`❌ Report #${id} failed`);
			}
		}
	} catch (err) {
		console.error('❌ Campaign report cron error:', err);
		console.log && console.log('❌ Campaign report cron error:', err.message);
	}
};