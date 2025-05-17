const db = require('../db/db'); // adjust to your DB connection module
const nodemailer = require('nodemailer');
require('dotenv').config(); // if you're using a .env file

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const sendEmail = async (to, subject, htmlContent) => {
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
};

(async () => {
    try {
        const { rows: reports } = await db.query(`
      SELECT *
      FROM reportsqueue
      WHERE status = 'pending' AND scheduled_time <= now()
      ORDER BY scheduled_time ASC
      LIMIT 1
    `);

        if (reports.length === 0) {
            console.log('📭 No pending reports to send.');
            return;
        }

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

            const html = `
        <div style="font-family: Arial, sans-serif;">
          <h2>${subject}</h2>
          <p><strong>Total Sent:</strong> ${total_sent}</p>
          <p><strong>Total Opened:</strong> ${total_opened}</p>
          <p><strong>Open Rate:</strong> ${open_rate}%</p>
          <p><strong>Total Clicked:</strong> ${total_clicked}</p>
          <p><strong>Click Rate:</strong> ${click_rate}%</p>
          ${top_links ? `<h3>Top Links:</h3><ul>
            ${top_links.map(link => `<li><a href="${link.url}">${link.url}</a> - ${link.clicks} clicks</li>`).join('')}
          </ul>` : ''}
          <hr />
          <h3>Email Preview:</h3>
          <div style="border: 1px solid #ddd; padding: 15px;">
            ${campaign_preview || template_preview || '<p><em>No preview available.</em></p>'}
          </div>
        </div>
      `;

            console.log(`📤 Sending report to ${to_email}...`);

            await sendEmail(to_email, subject, html);

            await db.query(`UPDATE reportsqueue SET status = 'sent', updated_at = now() WHERE id = $1`, [id]);

            console.log(`✅ Report #${id} sent and marked as sent.`);
        }
    } catch (err) {
        console.error('❌ Error sending report:', err);
    } finally {
        process.exit();
    }
})();
