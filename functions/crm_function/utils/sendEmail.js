const nodemailer = require('nodemailer');

// Function to send an email
const sendEmail = async (to, subject, htmlContent) => {
    try {
        // Create a nodemailer transporter using Zoho SMTP settings
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 587,
            secure: false,  // Upgrade later with STARTTLS
            auth: {
                user: process.env.EMAIL_USER,  // Your Zoho email address
                pass: process.env.EMAIL_PASS   // Your Zoho app-specific password
            }
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,  // Sender address (your Zoho email)
            to: to,                        // Receiver's email address
            subject: subject,              // Subject line
            html: htmlContent              // HTML content
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;
