const nodemailer = require('nodemailer');
const pool = require('./db/db');
const dotenv = require('dotenv');
const { getUserSMTPSettings } = require('./utils/smtp');
const { decryptPassword } = require('./utils/encryption');

dotenv.config();

const BATCH_SIZE = 10; // ✅ Number of emails sent per batch
const DELAY_BETWEEN_BATCHES = 30000; // ✅ Delay in milliseconds (30 seconds)

module.exports = async (cronDetails, context) => {
	if (process.env.NODE_ENV !== 'production') {
		console.log(`Cron job is not running in production. Skipping execution in ${process.env.NODE_ENV} environment.`);
		context.closeWithSuccess();
		return;
	}

	console.log('🚀 Starting Send Email cron job');

	try {
		const pendingEmailsResult = await pool.query(`
            SELECT q.id, q.user_id, q.subscriber_id, q.template_id, q.send_time, t.content AS template_content, t.category AS template_category
            FROM EmailQueue q
            INNER JOIN templates t ON q.template_id = t.id
            WHERE status = 'pending'
            AND DATE(send_time) = CURRENT_DATE - INTERVAL '1 day'
            ORDER BY q.send_time ASC;
        `);

		const pendingEmails = pendingEmailsResult.rows;

		if (pendingEmails.length === 0) {
			console.log('✅ No pending emails to send.');
			context.closeWithSuccess();
			return;
		}

		console.log(`📬 Found ${pendingEmails.length} pending emails. Sending in batches of ${BATCH_SIZE}...`);

		const sendBatch = async (batch) => {
			console.log(`🚀 Sending batch of ${batch.length} emails...`);

			for (const email of batch) {
				const { id, user_id, subscriber_id, template_content, template_category } = email;

				try {
					// Fetch subscriber details
					const subscriberDetailsResult = await pool.query(
						`SELECT email, name FROM subscribers WHERE id = $1`,
						[subscriber_id]
					);

					const subscriberDetails = subscriberDetailsResult.rows[0];
					if (!subscriberDetails) continue;

					const { email: recipientEmail, name } = subscriberDetails;

					let transporter;
					let smtpConfig;
					let decryptedPassword;
					let attempt = 1;

					const smtpSettings = await getUserSMTPSettings(user_id);
					if (smtpSettings) {
						try {
							decryptedPassword = decryptPassword(smtpSettings.smtp_password);
						} catch (decryptionError) {
							console.error('Decryption failed:', decryptionError.message);
							throw new Error('Decryption of SMTP password failed');
						}

						smtpConfig = {
							host: smtpSettings.smtp_host,
							port: 587,
							secure: false,
							auth: {
								user: smtpSettings.smtp_username,
								pass: decryptedPassword
							},
							tls: { rejectUnauthorized: false }
						};

						transporter = nodemailer.createTransport(smtpConfig);
					} else {
						console.log('Fallback: Using default Zoho SMTP settings...');
						smtpConfig = {
							host: 'smtp.zoho.com',
							port: 587,
							secure: false,
							auth: {
								user: process.env.EMAIL_USER,
								pass: process.env.EMAIL_PASS
							}
						};
						transporter = nodemailer.createTransport(smtpConfig);
					}

					const sendEmail = async () => {
						try {
							const appUrl = 'https://homepage-809404625.catalystserverless.com/server/crm_function';
							const trackingPixelUrl = `<img src="${appUrl}/api/track/template/open/${user_id}/${subscriber_id}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
							const unsubscribeLink = `<p style="text-align: center; font-size: xx-small"><a style="color:red;text-decoration: none" href="${appUrl}/api/unsubscribe/${subscriber_id}">Unsubscribe</a></p>`;
							const htmlWithTracking = `${template_content} ${trackingPixelUrl} ${unsubscribeLink}`;
							const htmlWithLinkTracking = htmlWithTracking.replace(
								/<a href="(.*?)"/g,
								(match, p1) => `<a href="${appUrl}/api/track/template/click/${user_id}/${subscriber_id}?redirect=${encodeURIComponent(p1)}"`
							);

							const getSubjectByCategory = (category, name) => {
								switch (category) {
									case 'Top of Mind':
										return `Hello ${name}! We haven't forgotten about you!`;
									case 'Opened Email Hot List':
									case 'Opened Email List':
										return `Hello ${name}! We've got what you need!`;
									default:
										return `Hello ${name}! Let us stay connected!`;
								}
							};

							const mailOptions = {
								from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER,
								to: recipientEmail,
								subject: getSubjectByCategory(template_category, name),
								html: htmlWithLinkTracking
							};

							await transporter.sendMail(mailOptions);
							console.log(`✅ Email sent to ${recipientEmail}`);

							await pool.query(`UPDATE EmailQueue SET status = 'sent', updated_at = NOW() WHERE id = $1`, [id]);

						} catch (error) {
							console.error(`Attempt ${attempt}: Error sending email:`, error);

							if (attempt === 1) {
								console.log('Retrying with SSL (Port 465)...');
								smtpConfig.port = 465;
								smtpConfig.secure = true;
								transporter = nodemailer.createTransport(smtpConfig);
								attempt++;
								await sendEmail();
							} else {
								throw new Error('Could not send email after retrying');
							}
						}
					};

					await sendEmail();

				} catch (emailError) {
					console.error(`❌ Error sending email for queue ID ${id}:`, emailError);
					await pool.query(`UPDATE EmailQueue SET status = 'failed', updated_at = NOW() WHERE id = $1`, [id]);
				}
			}

			console.log(`✅ Batch of ${batch.length} emails sent successfully!`);
		};

		// Process emails in batches with a delay
		const processBatches = async () => {
			for (let i = 0; i < pendingEmails.length; i += BATCH_SIZE) {
				const batch = pendingEmails.slice(i, i + BATCH_SIZE);
				await sendBatch(batch);

				if (i + BATCH_SIZE < pendingEmails.length) {
					console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
					await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
				}
			}

			console.log('🎉 All emails processed successfully!');
			context.closeWithSuccess();
		};

		await processBatches();

	} catch (error) {
		console.error('❌ Error in Send Email cron job:', error.message);
		context.closeWithFailure();
	}
};
