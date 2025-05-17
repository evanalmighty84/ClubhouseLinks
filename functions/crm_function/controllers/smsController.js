const dotenv = require('dotenv');
const { client, messagingServiceSid } = require('../utils/twilioClient');
const pool = require('../db/db');

dotenv.config(); // Load environment variables from .env
const smsSessions = new Map(); // Simple in-memory session tracking

// Existing - Send SMS immediately
exports.sendSMS = async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Phone number and message are required.' });
    }

    try {
        const result = await client.messages.create({
            body: message,
            to,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        });

        res.status(200).json({ message: 'SMS sent successfully!', sid: result.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS' });
    }
};

// ✅ NEW - Get scheduled SMS for a user
// ✅ Better: Join subscribers to get name & notes directly
exports.getScheduledSMS = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT sq.id, sq.subscriber_id, sq.message, sq.scheduled_time, s.name AS subscriber_name, s.notes
             FROM smsqueue sq
             JOIN subscribers s ON s.id = sq.subscriber_id
             WHERE sq.user_id = $1 AND sq.status = 'pending'`,
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching scheduled SMS:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled SMS' });
    }
};


exports.getAllSMS = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT sq.id, sq.subscriber_id, sq.message, sq.scheduled_time, sq.status, s.name AS subscriber_name, s.notes
             FROM smsqueue sq
             JOIN subscribers s ON s.id = sq.subscriber_id
             WHERE sq.user_id = $1`,
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all SMS:', error);
        res.status(500).json({ error: 'Failed to fetch all SMS' });
    }
};


// smsController.js (append to existing file)

exports.twilioStatusCallback = async (req, res) => {
    try {
        const { MessageSid, MessageStatus } = req.body;

        if (!MessageSid || !MessageStatus) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Optionally log it
        console.log(`Twilio Status Update - SID: ${MessageSid}, Status: ${MessageStatus}`);

        // Optional: If you later store sid in your smsqueue you could update by sid
        // For now, you might want to just log these or enhance later when you store sid

        res.status(200).send('Status received');
    } catch (error) {
        console.error('Error handling Twilio status callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




// We'll store a basic in-memory map of phone sessions (you can upgrade this later)



const nodemailer = require('nodemailer'); // if not already imported



exports.twilioHandleIncomingSMS = async (req, res) => {
    console.log('📩 Incoming SMS payload:', req.body);

    const introMessage = `const introMessage = \`💻 Grow Your Business with Clubhouse Links

🌐 Website – $599
Modern, mobile-ready, SEO-friendly

📧 Email Marketing – $69.99/mo
www.clubhouselinks.com

📲 Text Campaigns – $39.99/mo
Direct, fast, and effective

📣 Social Media – $59.99/mo
Done-for-you posts & strategy

👉 Text LAUNCH to get started or ask questions!
📞 (214) 548-9175\`;
`;


    try {
        const fromNumber = req.body.From?.replace(/\D/g, '');
        const incomingMessage = req.body.Body?.trim();
        const lower = incomingMessage?.toLowerCase();

        console.log(`🔍 From: ${fromNumber}, Message: ${incomingMessage}`);

        if (!fromNumber || !incomingMessage) {
            return res.status(400).send('Missing required data');
        }

        const userResult = await pool.query(
            `SELECT id, name, google_place_id, email FROM users 
             WHERE phone_number IS NOT NULL 
             AND REPLACE(phone_number, '+', '') LIKE $1`,
            [`%${fromNumber.slice(-10)}`]
        );

        const user = userResult.rows[0];
        if (!user) {
            console.warn('⚠️ Unrecognized sender');
            return res.status(200).send(`<Response><Message>Your number is not recognized.</Message></Response>`);
        }

        const session = smsSessions.get(fromNumber);

        // START: Email flow
        if (!session && lower.includes('email')) {
            smsSessions.set(fromNumber, { awaitingEmail: true });
            return res.status(200).send(`<Response><Message>What email should we send your message to?</Message></Response>`);
        }

        if (session?.awaitingEmail && !session.emailAddress) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(incomingMessage)) {
                return res.status(200).send(`<Response><Message>Please provide a valid email address.</Message></Response>`);
            }

            session.emailAddress = incomingMessage;
            session.awaitingType = true;
            smsSessions.set(fromNumber, session);

            return res.status(200).send(`<Response><Message>Would you like to send your Advertisement, Sale, or Review?</Message></Response>`);
        }

        // START: Introduction Flow
        // START: Introduction Flow (Step 1 - ask for number)
        if (!session && lower.includes('introduction')) {
            smsSessions.set(fromNumber, { awaitingIntroNumber: true });

            return res
                .status(200)
                .send(`<Response><Message>What number should we send the business info to?</Message></Response>`);
        }

// Step 2 - validate number and send intro MMS
        if (session?.awaitingIntroNumber) {
            const cleaned = incomingMessage.replace(/\D/g, '');

            if (cleaned.length !== 10) {
                return res
                    .status(200)
                    .send(`<Response><Message>Please enter a valid 10-digit phone number.</Message></Response>`);
            }

            const sendTo = '+1' + cleaned;

            // Send intro MMS to the requested number
            await client.messages.create({
                messagingServiceSid,
                to: sendTo,
                body: introMessage,
                mediaUrl: [
                    'https://res.cloudinary.com/duz4vhtcn/image/upload/v1733523325/Clubhouse_Links_2_zut83w.png'
                ]
            });

            // Send confirmation back to original sender
            smsSessions.delete(fromNumber);

            return res
                .status(200)
                .send(`<Response><Message>✅ Info sent to ${sendTo}</Message></Response>`);
        }
// END: Introduction Flow

// END: Introduction Flow


        if (session?.awaitingType) {
            const type = lower;
            let workflow;
            if (type.includes('advertisement')) workflow = 2;
            else if (type.includes('sale')) workflow = 3;
            else if (type.includes('review')) workflow = 6;
            else return res.status(200).send(`<Response><Message>Please choose: Advertisement, Sale, or Review.</Message></Response>`);

            const templateResult = await pool.query(
                `SELECT content FROM templates 
                 WHERE user_id = $1 AND workflow = $2`,
                [user.id, workflow]
            );

            const template = templateResult.rows[0];
            if (!template?.content) {
                return res.status(200).send(`<Response><Message>No template found for that type.</Message></Response>`);
            }

            // Send email
            const transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: session.emailAddress,
                subject: `${user.name} sent you a message`,
                html: template.content
            });

            smsSessions.delete(fromNumber);
            return res.status(200).send(`<Response><Message>✅ Email sent to ${session.emailAddress}</Message></Response>`);
        }
        // END: Email flow

        // START: Review QR Flow
        if (!session && lower.includes('review')) {
            smsSessions.set(fromNumber, { awaitingNumber: true });
            return res.status(200).send(`<Response><Message>What number should we send the review QR code to?</Message></Response>`);
        }

        if (session?.awaitingNumber) {
            const cleaned = incomingMessage.replace(/\D/g, '');
            if (cleaned.length < 10) {
                return res.status(200).send(`<Response><Message>Please enter a valid 10-digit number.</Message></Response>`);
            }

            const sendTo = '+1' + cleaned;
            const reviewLink = `https://search.google.com/local/writereview?placeid=${user.google_place_id}`;
            const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(reviewLink)}`;

            await client.messages.create({
                messagingServiceSid,
                to: sendTo,
                body: `${user.name} would appreciate your review!\n${reviewLink}`,
                mediaUrl: [qrCodeUrl]
            });

            smsSessions.delete(fromNumber);

            return res.status(200).send(`<Response><Message>✅ Review link sent to ${sendTo}</Message></Response>`);
        }
        // END: Review QR Flow

        return res.status(200).send(`<Response><Message>Send "review" or "email" to begin.</Message></Response>`);
    } catch (err) {
        console.error('❌ Error handling incoming SMS:', err);
        res.status(500).send(`<Response><Message>Something went wrong. Please try again later.</Message></Response>`);
    }
};







