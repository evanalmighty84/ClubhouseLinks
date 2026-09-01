// sendMayorEmail.js

require("dotenv").config();

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const emailConfig = require("./sendMayorEmailConfig");

// ---------------------------------------------------------
// EMAIL SETTINGS
// ---------------------------------------------------------




// ---------------------------------------------------------
// EMAIL SETTINGS
// ---------------------------------------------------------

const FROM_EMAIL =
    process.env.ZEPTOMAIL_FROM_EMAIL ||
    "evan.ligon@clubhouselinks.com";

const FROM_NAME =
    process.env.ZEPTOMAIL_FROM_NAME ||
    "Evan Ligon";

const SMTP_HOST =
    process.env.ZEPTOMAIL_SMTP_HOST ||
    "smtp.zeptomail.com";

const SMTP_PORT =
    Number(
        process.env.ZEPTOMAIL_SMTP_PORT ||
        587
    );

const SMTP_USER =
    process.env.ZEPTOMAIL_SMTP_USER;

const SMTP_PASSWORD =
    process.env.ZEPTOMAIL_SMTP_PASSWORD;

console.log("ZeptoMail config:", {
    fromEmail: FROM_EMAIL,
    fromName: FROM_NAME,
    host: SMTP_HOST,
    port: SMTP_PORT,
    userSet: Boolean(SMTP_USER),
    passwordSet: Boolean(SMTP_PASSWORD),
});

// ---------------------------------------------------------
// IMAGE PATHS
// ---------------------------------------------------------

const CLUBHOUSE_LOGO_PATH =
    path.join(__dirname, "clubhouse-logo.png");

const APP_SCREENSHOT_PATH =
    path.join(__dirname, "app-screenshot.jpg");

const COMMUNITY_EVENT_PATH =
    path.join(__dirname, "community-event.jpg");
const STREET_FAIR_PATH =
    path.join(__dirname, "streetfair.png");

// ---------------------------------------------------------
// TRANSPORT
// ---------------------------------------------------------

const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,

    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
    },
});

// ---------------------------------------------------------
// BUILD ATTACHMENTS
// ---------------------------------------------------------
function validateFile(filePath, label) {
    if (!fs.existsSync(filePath)) {
        console.warn(
            `⚠️ ${label} not found: ${filePath}`
        );

        return false;
    }

    return true;
}
const attachments = [];

if (
    validateFile(
        CLUBHOUSE_LOGO_PATH,
        "Clubhouse logo"
    )
) {
    attachments.push({
        filename: "clubhouse-logo.png",
        path: CLUBHOUSE_LOGO_PATH,
        cid: "clubhouse-logo",
    });
}
if (
    validateFile(
        STREET_FAIR_PATH,
        "Street Fair image"
    )
) {
    attachments.push({
        filename: "street-fair.png",
        path: STREET_FAIR_PATH,
        cid: "street-fair",
    });
}

if (
    validateFile(
        APP_SCREENSHOT_PATH,
        "App screenshot"
    )
) {
    attachments.push({
        filename: "app-screenshot.png",
        path: APP_SCREENSHOT_PATH,
        cid: "app-screenshot",
    });
}

if (
    validateFile(
        COMMUNITY_EVENT_PATH,
        "Community event image"
    )
) {
    attachments.push({
        filename: "community-event.png",
        path: COMMUNITY_EVENT_PATH,
        cid: "community-event",
    });
}

// ---------------------------------------------------------
// SEND
// ---------------------------------------------------------

async function sendEmail() {
    try {
        console.log(
            `📧 Sending email to ${emailConfig.recipientEmail}...`
        );

        await transport.verify();

        console.log(
            "✅ ZeptoMail SMTP connection verified."
        );

        const info = await transport.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,

            to: emailConfig.recipientEmail,

            subject: emailConfig.subject,

            html: emailConfig.bodyHtml,

            attachments,
        });

        console.log(
            "✅ Email sent successfully."
        );

        console.log(
            "Message ID:",
            info.messageId
        );

        return info;

    } catch (error) {
        console.error(
            "❌ ZeptoMail send failed:",
            error
        );

        throw error;
    }
}

sendEmail()
    .then(() => {
        process.exit(0);
    })
    .catch(() => {
        process.exit(1);
    });