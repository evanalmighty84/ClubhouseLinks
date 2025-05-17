const { sendEmail } = require('../utils/sendEmail');

exports.createEmail = async (req, res) => {

    console.log('createEmail function invoked');

    try {
        // Extract form data from the request body
        const { name, phone, email, message } = req.body;

        // Validate required fields
        if (!name || !phone || !email || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Email content
        const subject = `Contact Form Submission from ${name}`;
        const textContent = `
            You have received a new message from your website contact form.

            Full Name: ${name}
            Phone: ${phone}
            Email: ${email}
            Message:
            ${message}
        `;

        // Send email using the sendEmail utility
        // Replace 'evanligon7@gmail.com' with your recipient email
        await sendEmail('office4clearly1pools@yahoo.com', subject, textContent);

        // Respond with success
        res.status(200).json({ message: "Your message has been sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "An error occurred while sending your message. Please try again later." });
    }
};
