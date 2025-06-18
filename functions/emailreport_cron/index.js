#!/usr/bin/env node
require('dotenv').config();
const db = require('../db/db');
const moment = require('moment');
const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'evan.ligon@clubhouselinks.com';
const EMAIL_USER  = process.env.EMAIL_USER;
const EMAIL_PASS  = process.env.EMAIL_PASS;

// helper to send one email
async function sendEmail(to, subject, html) {
	const transporter = nodemailer.createTransport({
		host: 'smtp.zoho.com',
		port: 587,
		secure: false,
		auth: { user: EMAIL_USER, pass: EMAIL_PASS },
		connectionTimeout: 15000,
		greetingTimeout: 10000,
		socketTimeout: 20000
	});
	await transporter.sendMail({ from: EMAIL_USER, to, subject, html });
}

;(async function main() {
	// only run in production
	if (process.env.NODE_ENV !== 'production') {
		console.log(
			`Cron job is not running in production. Skipping execution in ${process.env.NODE_ENV}`
		);
		process.exit(0);
	}
	console.log('🚀 Starting Email Report Cron Job');

	const today = moment().startOf('day');
	const day6  = today.clone().subtract(6, 'days');
	const day7  = today.clone().subtract(7, 'days');

	try {
		// 1) find all campaigns created exactly 7 days ago
		const { rows: campaigns } = await db.query(
			`
      SELECT c.id, c.user_id, c.subject, c.content, u.email AS user_email
      FROM campaigns c
      JOIN users     u ON u.id = c.user_id
      WHERE c.created_at >= $1
        AND c.created_at < ($1 + interval '1 day')
    `,
			[day7.format('YYYY-MM-DD')]
		);

		// 2) queue both pre-report (6-day) and final report (7-day)
		for (let camp of campaigns) {
			const {
				id: campaign_id,
				user_id,
				subject,
				content: campaign_preview,
				user_email
			} = camp;

			// get basic stats
			const { rows: openRows } = await db.query(
				`SELECT COUNT(DISTINCT subscriber_id) AS total_opened
         FROM email_open_events
         WHERE campaign_id = $1`,
				[campaign_id]
			);
			const { rows: clickRows } = await db.query(
				`SELECT COUNT(DISTINCT subscriber_id) AS total_clicked
         FROM email_click_events
         WHERE campaign_id = $1`,
				[campaign_id]
			);

			const total_opened  = parseInt(openRows[0].total_opened  || 0, 10);
			const total_clicked = parseInt(clickRows[0].total_clicked || 0, 10);
			// fallback sent estimate
			const total_sent    = total_opened + 5;
			const open_rate     = total_sent ? ((total_opened  / total_sent)  * 100).toFixed(2) : 0;
			const click_rate    = total_sent ? ((total_clicked / total_sent)  * 100).toFixed(2) : 0;

			// helper to enqueue one report row
			const enqueue = async (scheduled_time, to_email, subj) => {
				await db.query(
					`
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
        `,
					[
						user_id,
						campaign_id,
						scheduled_time.toISOString(),
						subj,
						to_email,
						campaign_preview,
						total_sent,
						total_opened,
						open_rate,
						total_clicked,
						click_rate,
						campaign_preview
					]
				);
			};

			await enqueue(
				day6.endOf('day'),
				ADMIN_EMAIL,
				`Pre-Report: ${subject} (Campaign #${campaign_id})`
			);
			await enqueue(
				day7.endOf('day'),
				user_email,
				`Campaign Report: ${subject}`
			);
		}

		console.log(`📂 Queued ${campaigns.length * 2} report(s).`);

		// 3) immediately send anything pending whose time has arrived
		const { rows: reports } = await db.query(
			`
      SELECT *
      FROM reportsqueue
      WHERE status = 'pending'
        AND scheduled_time <= now()
      ORDER BY scheduled_time ASC
    `
		);

		for (let rpt of reports) {
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
				campaign_preview,
				template_preview
			} = rpt;

			const html = `
        <div style="font-family: Arial, sans-serif;">
          <h2>${subject}</h2>
          <p><strong>Total Sent:</strong> ${total_sent}</p>
          <p><strong>Total Opened:</strong> ${total_opened}</p>
          <p><strong>Open Rate:</strong> ${open_rate}%</p>
          <p><strong>Total Clicked:</strong> ${total_clicked}</p>
          <p><strong>Click Rate:</strong> ${click_rate}%</p>
          <hr/>
          <h3>Email Preview:</h3>
          <div style="border:1px solid #ddd; padding:15px;">
            ${campaign_preview || template_preview || '<em>No preview available.</em>'}
          </div>
        </div>
      `;

			try {
				await sendEmail(to_email, subject, html);
				await db.query(
					`UPDATE reportsqueue SET status='sent', updated_at=now() WHERE id=$1`,
					[id]
				);
				console.log(`✅ Report #${id} sent to ${to_email}`);
			} catch (err) {
				await db.query(
					`UPDATE reportsqueue SET status='failed', updated_at=now() WHERE id=$1`,
					[id]
				);
				console.error(`❌ Failed to send report #${id}:`, err.message);
			}
		}

		console.log('🎉 Email Report Cron Completed');
		process.exit(0);
	} catch (err) {
		console.error('❌ Email Report Cron Error:', err);
		process.exit(1);
	}
})();
