const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const emailConfig = require("./alreadySignedUpEmailConfig");

const APP_STORE_URL =
    "https://apps.apple.com/us/app/id6790003233";

const CLUBHOUSE_LOGO_PATH = path.join(__dirname, "clubhouse-logo.png");
const HEADSHOT_PATH = path.join(__dirname, "headshot.png");

const SMTP_USER =
    process.env.ZEPTOMAIL_SMTP_USER ||
    process.env.ZEPTOMAIL_SMTP_USERNAME ||
    process.env.ZEPTOMAIL_USER ||
    process.env.ZEPTO_SMTP_USER ||
    process.env.ZEPTO_USER ||
    process.env.SMTP_USER;

const SMTP_PASS =
    process.env.ZEPTOMAIL_SMTP_PASS ||
    process.env.ZEPTOMAIL_SMTP_PASSWORD ||
    process.env.ZEPTOMAIL_PASSWORD ||
    process.env.ZEPTO_SMTP_PASS ||
    process.env.ZEPTO_PASSWORD ||
    process.env.SMTP_PASS;

const SMTP_HOST =
    process.env.ZEPTOMAIL_SMTP_HOST ||
    "smtp.zeptomail.com";

const SMTP_PORT =
    Number(process.env.ZEPTOMAIL_SMTP_PORT) ||
    587;

const FROM_EMAIL =
    process.env.ZEPTOMAIL_FROM_EMAIL ||
    "evan.ligon@clubhouselinks.com";

const FROM_NAME =
    process.env.ZEPTOMAIL_FROM_NAME ||
    "Evan Ligon";

if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
        "Missing ZeptoMail SMTP credentials. Check your environment variables."
    );
}

const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function validateEmailConfig(config) {
    const requiredFields = [
        "recipientEmail",
        "recipientName",
        "subject",
        "bodyHtml"
    ];

    for (const field of requiredFields) {
        if (!config[field] || !String(config[field]).trim()) {
            throw new Error(
                `brettWelcomeEmailConfig.js is missing: ${field}`
            );
        }
    }
}

function validateImageFiles() {
    const imageFiles = [
        CLUBHOUSE_LOGO_PATH,
        HEADSHOT_PATH
    ];

    for (const imagePath of imageFiles) {
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Missing image file: ${imagePath}`);
        }
    }
}

function buildEmail(config) {
    validateEmailConfig(config);

    const safeRecipientName = escapeHtml(config.recipientName);
    const safeSubject = escapeHtml(config.subject);
    const safeAppStoreUrl = escapeHtml(APP_STORE_URL);

    const html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${safeSubject}</title>
            </head>

            <body style="margin:0;padding:0;background:#ffffff;">
                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="width:100%;background:#ffffff;"
                >
                    <tr>
                        <td align="center" style="padding:0;background:#ffffff;">
                            <table
                                role="presentation"
                                width="900"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%;
                                    max-width:900px;
                                    background:#ffffff;
                                    border:0;
                                "
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:22px 20px 14px;
                                            background:#ffffff;
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

                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:8px 20px 24px;
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
                                                max-width:760px;
                                                background:#f8fafc;
                                                border:2px solid #009899;
                                                border-radius:14px;
                                                box-shadow:0 0 18px rgba(0,152,153,0.16);
                                            "
                                        >
                                            <tr>
                                                <td
                                                    align="center"
                                                    style="
                                                        padding:30px 24px;
                                                        font-family:Verdana,Arial,Helvetica,sans-serif;
                                                        color:#000000;
                                                    "
                                                >
                                                    <div
                                                        style="
                                                            margin:0 0 8px 0;
                                                            font-size:13px;
                                                            font-weight:700;
                                                            letter-spacing:1.2px;
                                                            text-transform:uppercase;
                                                            color:#009899;
                                                        "
                                                    >
                                                        Welcome to Clubhouse Links
                                                    </div>

                                                    <div
                                                        style="
                                                            margin:0 0 12px 0;
                                                            font-size:25px;
                                                            line-height:1.3;
                                                            font-weight:700;
                                                            color:#000000;
                                                        "
                                                    >
                                                        Your lead service is active
                                                    </div>

                                                    <p
                                                        style="
                                                            max-width:650px;
                                                            margin:0 auto 22px;
                                                            font-size:15px;
                                                            line-height:1.65;
                                                            color:#000000;
                                                        "
                                                    >
                                                        Download the Clubhouse Links app and sign in
                                                        with the mobile number connected to your account.
                                                        Your matching homeowner opportunities will be
                                                        delivered directly to the app.
                                                    </p>

                                                    <a
                                                        href="${safeAppStoreUrl}"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style="
                                                            display:inline-block;
                                                            padding:15px 26px;
                                                            background:#ff3bd4;
                                                            color:#ffffff;
                                                            text-decoration:none;
                                                            font-size:16px;
                                                            font-weight:700;
                                                            border:2px solid #25f4ff;
                                                            border-radius:8px;
                                                            box-shadow:0 0 16px rgba(255,59,212,0.35);
                                                        "
                                                    >
                                                        Download the Clubhouse Links App
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td
                                        style="
                                            padding:10px 24px 28px;
                                            color:#000000;
                                            font-family:Verdana,Arial,Helvetica,sans-serif;
                                            font-size:15px;
                                            line-height:1.65;
                                            background:#ffffff;
                                        "
                                    >
                                        <p style="margin:0 0 18px 0;color:#000000;">
                                            Hey ${safeRecipientName},
                                        </p>

                                        <div style="color:#000000;">
                                            ${config.bodyHtml}
                                        </div>

                                        <table
                                            role="presentation"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                margin-top:30px;
                                                border-collapse:collapse;
                                            "
                                        >
                                            <tr>
                                                <td
                                                    valign="top"
                                                    style="padding-right:14px;"
                                                >
                                                    <img
                                                        src="cid:evan-headshot"
                                                        alt="Evan Ligon"
                                                        width="75"
                                                        style="
                                                            display:block;
                                                            width:75px;
                                                            height:75px;
                                                            object-fit:cover;
                                                            border-radius:50%;
                                                            border:2px solid #25f4ff;
                                                            box-shadow:0 0 14px rgba(37,244,255,0.28);
                                                        "
                                                    >
                                                </td>

                                                <td
                                                    valign="middle"
                                                    style="
                                                        font-family:Verdana,Arial,Helvetica,sans-serif;
                                                        font-size:14px;
                                                        line-height:1.5;
                                                        color:#000000;
                                                    "
                                                >
                                                    <strong style="color:#000000;font-size:15px;">
                                                        Evan Ligon
                                                    </strong><br>

                                                    <span style="color:#000000;">
                                                        CEO / Web Developer
                                                    </span><br>

                                                    <a
                                                        href="https://www.clubhouselinks.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style="
                                                            color:#009899;
                                                            text-decoration:none;
                                                            font-weight:600;
                                                        "
                                                    >
                                                        www.ClubhouseLinks.com
                                                    </a><br>

                                                    <a
                                                        href="mailto:Evan.Ligon@ClubhouseLinks.com"
                                                        style="
                                                            color:#009899;
                                                            text-decoration:none;
                                                        "
                                                    >
                                                        Evan.Ligon@ClubhouseLinks.com
                                                    </a><br>

                                                    <a
                                                        href="mailto:Evanligon7@gmail.com"
                                                        style="
                                                            color:#009899;
                                                            text-decoration:none;
                                                        "
                                                    >
                                                        Evanligon7@gmail.com
                                                    </a><br>

                                                    <a
                                                        href="tel:+12145489175"
                                                        style="
                                                            color:#009899;
                                                            text-decoration:none;
                                                            font-weight:700;
                                                        "
                                                    >
                                                        214-548-9175
                                                    </a><br>

                                               
                                                </td>
                                            </tr>
                                        </table>
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
        html
    };
}

async function sendEmail() {
    try {
        validateImageFiles();

        const email = buildEmail(emailConfig);

        await transport.verify();
        console.log("Connected to ZeptoMail SMTP.");

        const info = await transport.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email.to,
            subject: email.subject,
            html: email.html,
            attachments: [
                {
                    filename: "clubhouse-logo.png",
                    path: CLUBHOUSE_LOGO_PATH,
                    cid: "clubhouse-logo",
                    contentType: "image/png",
                    contentDisposition: "inline"
                },
                {
                    filename: "headshot.png",
                    path: HEADSHOT_PATH,
                    cid: "evan-headshot",
                    contentType: "image/png",
                    contentDisposition: "inline"
                }
            ]
        });

        console.log(
            "ZeptoMail welcome message sent:",
            info.messageId
        );
    } catch (error) {
        console.error(
            "ZeptoMail welcome message failed:",
            error
        );
        process.exitCode = 1;
    }
}

sendEmail();
