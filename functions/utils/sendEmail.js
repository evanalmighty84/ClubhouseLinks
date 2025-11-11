const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',   // ✅ Gmail SMTP host
            port: 587,                // ✅ Gmail TLS port
            secure: false,            // STARTTLS (true for port 465 SSL)
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,     // must be an App Password
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        await transporter.sendMail({
            from: `"Clubhouse Links" <${EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent,
        });

        console.log(`📤 Email sent to ${to}`);
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
};

module.exports = sendEmail;
