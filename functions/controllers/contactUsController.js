const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const CONTACT_RECEIVER_EMAIL =
    process.env.CONTACT_RECEIVER_EMAIL || "evan.ligon@clubhouselinks.com";

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
        const { name, email, phone, address, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                error: "Name, email, and message are required.",
            });
        }

        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error("Missing EMAIL_USER or EMAIL_PASS env vars");
            return res.status(500).json({
                error: "Email service is not configured.",
            });
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>New Clubhouse Links Contact Form Submission</h2>

                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || "N/A"}</p>
                <p><strong>Address:</strong> ${address || "N/A"}</p>

                <hr />

                <p><strong>Message:</strong></p>
                <p>${String(message).replace(/\n/g, "<br />")}</p>
            </div>
        `;

        await sendEmail(
            CONTACT_RECEIVER_EMAIL,
            `New Clubhouse Links Contact: ${name}`,
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