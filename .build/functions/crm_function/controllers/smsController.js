// /server/crm_function/controllers/smsController.js
const client = require('../utils/twilioClient');

exports.sendSMS = async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Phone number and message are required.' });
    }

    try {
        const result = await client.messages.create({
            body: message,
            to, // e.g., '+1234567890'
            from: process.env.TWILIO_PHONE_NUMBER, // or messagingServiceSid: yourServiceSid
        });

        res.status(200).json({ message: 'SMS sent successfully!', sid: result.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS' });
    }
};
