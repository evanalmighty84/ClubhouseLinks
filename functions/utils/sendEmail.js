const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtppro.zoho.com",
            port: 465,
            secure: true,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
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
