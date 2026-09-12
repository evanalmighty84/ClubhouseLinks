// sendMayorEmail.js

require("dotenv").config();

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const emailConfig = require("./sendMayorEmailConfig");

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
    process.env.ZEPTOMAIL_SMTP_USER ||
    process.env.ZEPTOMAIL_SMTP_USERNAME ||
    process.env.ZEPTOMAIL_USER ||
    process.env.ZEPTO_SMTP_USER ||
    process.env.ZEPTO_USER ||
    process.env.SMTP_USER;

const SMTP_PASSWORD =
    process.env.ZEPTOMAIL_SMTP_PASS ||
    process.env.ZEPTOMAIL_SMTP_PASSWORD ||
    process.env.ZEPTOMAIL_PASSWORD ||
    process.env.ZEPTO_SMTP_PASS ||
    process.env.ZEPTO_PASSWORD ||
    process.env.SMTP_PASS;

console.log("ZeptoMail config:", {
    fromEmail: FROM_EMAIL,
    fromName: FROM_NAME,
    host: SMTP_HOST,
    port: SMTP_PORT,
    userSet: Boolean(SMTP_USER),
    passwordSet: Boolean(SMTP_PASSWORD),
});

if (!SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
        "Missing ZeptoMail SMTP credentials."
    );
}

// ---------------------------------------------------------
// IMAGE PATHS
// ---------------------------------------------------------

const CLUBHOUSE_LOGO_PATH =
    path.join(
        __dirname,
        "clubhouse-logo.png"
    );

const STREET_FAIR_PATH =
    path.join(
        __dirname,
        "streetfair.png"
    );
const HEADSHOT_PATH =
    path.join(
        __dirname,
        "headshot.png"
    );

// ---------------------------------------------------------
// TRANSPORT
// ---------------------------------------------------------

const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,

    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
    },
});

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function validateFile(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `${label} not found: ${filePath}`
        );
    }
}

function validateEmailConfig(config) {
    const requiredFields = [
        "recipientEmail",
        "recipientName",
        "subject",
        "bodyHtml",
    ];

    for (const field of requiredFields) {
        if (
            !config[field] ||
            !String(config[field]).trim()
        ) {
            throw new Error(
                `sendMayorEmailConfig.js is missing: ${field}`
            );
        }
    }
}

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------
// BUILD EMAIL
// ---------------------------------------------------------

function buildEmail(config) {
    validateEmailConfig(config);

    const safeSubject =
        escapeHtml(config.subject);

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>
                ${safeSubject}
            </title>
        </head>

        <body
            style="
                margin:0;
                padding:0;
                background:#ffffff;
            "
        >

            <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                    width:100%;
                    background:#ffffff;
                "
            >
                <tr>
                    <td
                        align="center"
                        style="
                            padding:0;
                            background:#ffffff;
                        "
                    >

                        <table
                            role="presentation"
                            width="1100"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                                width:100%;
                                max-width:1100px;
                                background:#ffffff;
                                border:0;
                            "
                        >

                            <!-- LOGO -->
                            <tr>
                                <td
                                    align="center"
                                    style="
                                        padding:
                                            28px
                                            20px
                                            20px;
                                    "
                                >
                                    <img
                                        src="cid:clubhouse-logo"
                                        alt="Clubhouse Links"
                                        style="
                                            display:block;
                                            width:220px;
                                            max-width:75%;
                                            height:auto;
                                            border:0;
                                        "
                                    >
                                </td>
                            </tr>

                            <!-- EMAIL BODY -->
                            <tr>
                                <td
                                    style="
                                        padding:
                                            20px
                                            36px
                                            36px;

                                        font-family:
                                            Verdana,
                                            Arial,
                                            Helvetica,
                                            sans-serif;

                                        font-size:15px;
                                        line-height:1.65;
                                        color:#111827;
                                        background:#ffffff;
                                    "
                                >

                                    ${config.bodyHtml}

                                </td>
                            </tr>

                        </table>

                    </td>
                </tr>
            </table>

        </body>
        </html>
    `;

    return {
        to: config.recipientEmail,
        subject: config.subject,
        html,
    };
}

// ---------------------------------------------------------
// SEND
// ---------------------------------------------------------

async function sendEmail() {
    try {
        validateFile(
            CLUBHOUSE_LOGO_PATH,
            "Clubhouse logo"
        );

        validateFile(
            STREET_FAIR_PATH,
            "Street Fair image"
        );
        validateFile(
            HEADSHOT_PATH,
            "Evan headshot"
        );
        const email =
            buildEmail(emailConfig);

        console.log(
            `📧 Sending email to ${email.to}...`
        );

        console.log(
            "Street fair image:",
            STREET_FAIR_PATH
        );

        await transport.verify();

        console.log(
            "✅ ZeptoMail SMTP connection verified."
        );

        const info =
            await transport.sendMail({
                from:
                    `"${FROM_NAME}" <${FROM_EMAIL}>`,

                to:
                email.to,

                subject:
                email.subject,

                html:
                email.html,

                attachments: [


                    {
                        filename: "clubhouse-logo.png",
                        path: CLUBHOUSE_LOGO_PATH,
                        cid: "clubhouse-logo",
                    },

                    {
                        filename:
                            "streetfair.png",

                        path:
                        STREET_FAIR_PATH,

                        cid:
                            "street-fair",
                    },
                    {
                        filename: "headshot.png",
                        path: HEADSHOT_PATH,
                        cid: "evan-headshot",
                    },
                ],
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