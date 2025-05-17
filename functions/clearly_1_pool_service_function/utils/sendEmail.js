const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
        user: process.env.EMAIL_USER, // Your Zoho email address
        pass: process.env.EMAIL_PASS, // Your Zoho app-specific password
    },
});

// Function to send email
const sendEmail = async (recipient, subject, textContent) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER, // Your Zoho email address
            to: recipient, // Recipient email
            subject: subject, // Email subject
            text: textContent, // Plain text body
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully to:", recipient);
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

module.exports = { sendEmail };
