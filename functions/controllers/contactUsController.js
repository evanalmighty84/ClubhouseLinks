const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const CONTACT_RECEIVER_EMAIL =
    process.env.CONTACT_RECEIVER_EMAIL || "evan.ligon@clubhouselinks.com";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

async function verifyTurnstile(token, ip) {
    if (!token) {
        return false;
    }

    const body = new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
    });

    if (ip) {
        body.append("remoteip", ip);
    }

    const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",
            body,
        }
    );

    const result = await response.json();

    return result.success === true;
}

const sendEmail = async (to, subject, htmlContent) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.zoho.com",
        port: 587,
        secure: false,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });

    return transporter.sendMail({
        from: `"Clubhouse Links Contact" <${EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
    });
};

exports.createContactRequest = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            message,

            // Honeypot
            website,

            // Turnstile
            turnstileToken,
        } = req.body;

        /*
         * BOT CHECK #1
         *
         * Humans never see/fill this field.
         * Bots frequently populate every input.
         *
         * Return success so the bot doesn't learn
         * that it was detected.
         */
        if (website) {
            return res.status(200).json({
                success: true,
                message: "Contact request sent successfully.",
            });
        }

        /*
         * BOT CHECK #2
         */
        const human = await verifyTurnstile(
            turnstileToken,
            req.ip
        );

        if (!human) {
            return res.status(403).json({
                error: "Human verification failed.",
            });
        }

        if (!name || !email || !message) {
            return res.status(400).json({
                error: "Name, email, and message are required.",
            });
        }

        /*
         * Prevent absurd bot payloads.
         */
        if (
            String(name).length > 100 ||
            String(email).length > 254 ||
            String(phone || "").length > 40 ||
            String(address || "").length > 300 ||
            String(message).length > 5000
        ) {
            return res.status(400).json({
                error: "Invalid form submission.",
            });
        }

        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error("Missing EMAIL_USER or EMAIL_PASS env vars");

            return res.status(500).json({
                error: "Email service is not configured.",
            });
        }

        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safePhone = escapeHtml(phone || "N/A");
        const safeAddress = escapeHtml(address || "N/A");
        const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>New Clubhouse Links Contact Form Submission</h2>

                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Phone:</strong> ${safePhone}</p>
                <p><strong>Address:</strong> ${safeAddress}</p>

                <hr />

                <p><strong>Message:</strong></p>
                <p>${safeMessage}</p>
            </div>
        `;

        await sendEmail(
            CONTACT_RECEIVER_EMAIL,
            `New Clubhouse Links Contact: ${safeName}`,
            htmlContent
        );

        return res.status(200).json({
            success: true,
            message: "Contact request sent successfully.",
        });
    } catch (error) {
        console.error("Contact form email failed:", error);

        return res.status(500).json({
            error: "Failed to send contact request.",
        });
    }
};