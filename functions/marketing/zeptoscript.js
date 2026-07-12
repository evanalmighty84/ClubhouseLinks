const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const emailConfig = require("./emailConfig");

const PAYMENT_URL =
    "https://checkout.clubhouselinks.com/b/cNi14o3Tj7Qs9Mpgs70VO1m";

/*
 * These images should be in the same folder as zeptoscript.js.
 */
const CLUBHOUSE_LOGO_PATH = path.join(
    __dirname,
    "clubhouse-logo.png"
);

const LEAD_PREVIEW_PATH = path.join(
    __dirname,
    "lead-preview.png"
);

const HEADSHOT_PATH = path.join(
    __dirname,
    "headshot.png"
);

/*
 * Supports several common environment-variable names.
 * Your existing working variables should be picked up automatically.
 */
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

if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
        "Missing ZeptoMail SMTP credentials. Check your environment variables."
    );
}

const transport = nodemailer.createTransport({
    host: "smtp.zeptomail.com",
    port: 587,
    secure: false,
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
                `emailConfig.js is missing: ${field}`
            );
        }
    }
}

function validateImageFiles() {
    const imageFiles = [
        CLUBHOUSE_LOGO_PATH,
        LEAD_PREVIEW_PATH,
        HEADSHOT_PATH
    ];

    for (const imagePath of imageFiles) {
        if (!fs.existsSync(imagePath)) {
            throw new Error(
                `Missing image file: ${imagePath}`
            );
        }
    }
}

function buildEmail(config) {
    validateEmailConfig(config);

    const safeRecipientName = escapeHtml(
        config.recipientName
    );

    const safeSubject = escapeHtml(
        config.subject
    );

    const safePaymentUrl = escapeHtml(
        PAYMENT_URL
    );

    const html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >
                <title>${safeSubject}</title>
            </head>

            <body
                style="
                    margin:0;
                    padding:0;
                    background:#f4f7f8;
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
                        background:#f4f7f8;
                    "
                >
                    <tr>
                        <td
                            align="center"
                            style="padding:24px 12px;"
                        >
                            <table
                                role="presentation"
                                width="680"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width:100%;
                                    max-width:680px;
                                    background:#ffffff;
                                    border-radius:10px;
                                    overflow:hidden;
                                "
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:28px 24px 18px;
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
                                            padding:0 24px 24px;
                                        "
                                    >
                                        <img
                                            src="cid:new-lead-preview"
                                            alt="New homeowner lead preview"
                                            style="
                                                display:block;
                                                width:100%;
                                                max-width:620px;
                                                height:auto;
                                                border:0;
                                                border-radius:10px;
                                            "
                                        >
                                    </td>
                                </tr>

                                <tr>
                                    <td
                                        style="
                                            padding:0 32px 32px;
                                            font-family:
                                                Verdana,
                                                Arial,
                                                Helvetica,
                                                sans-serif;
                                            font-size:15px;
                                            line-height:1.65;
                                            color:#111827;
                                        "
                                    >
                                        <p
                                            style="
                                                margin:0 0 18px 0;
                                            "
                                        >
                                            Hi ${safeRecipientName},
                                        </p>

                                        ${config.bodyHtml}

                                        <p
                                            style="
                                                margin:26px 0;
                                            "
                                        >
                                            <a
                                                href="${safePaymentUrl}"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style="
                                                    display:inline-block;
                                                    padding:13px 22px;
                                                    background:#009899;
                                                    color:#ffffff;
                                                    text-decoration:none;
                                                    font-weight:700;
                                                    border-radius:6px;
                                                "
                                            >
                                                Get started for $200
                                            </a>
                                        </p>

                                        <table
                                            role="presentation"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                margin-top:30px;
                                            "
                                        >
                                            <tr>
                                                <td
                                                    valign="top"
                                                    style="
                                                        padding-right:14px;
                                                    "
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
                                                            border:0;
                                                        "
                                                    >
                                                </td>

                                                <td
                                                    valign="middle"
                                                    style="
                                                        font-family:
                                                            Verdana,
                                                            Arial,
                                                            Helvetica,
                                                            sans-serif;
                                                        font-size:14px;
                                                        line-height:1.5;
                                                        color:#111827;
                                                    "
                                                >
                                       <strong>
    Evan Ligon
</strong>
<br>

CEO / Web Developer
<br>

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
</a>
<br>

<a
    href="mailto:Evan.Ligon@ClubhouseLinks.com"
    style="
        color:#009899;
        text-decoration:none;
    "
>
    Evan.Ligon@ClubhouseLinks.com
</a>
<br>

<a
    href="tel:+12145489175"
    style="
        color:#009899;
        text-decoration:none;
    "
>
    214-548-9175
</a>
<br>

Fellow LeTip Member — Dallas
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

        console.log(
            "Connected to ZeptoMail SMTP."
        );

        const info = await transport.sendMail({
            from:
                '"Evan Ligon" <evan.ligon@clubhouselinks.com>',

            to: email.to,

            subject: email.subject,

            html: email.html,

            attachments: [
                {
                    filename: "clubhouse-logo.png",
                    path: CLUBHOUSE_LOGO_PATH,
                    cid: "clubhouse-logo"
                },
                {
                    filename: "new-lead-preview.png",
                    path: LEAD_PREVIEW_PATH,
                    cid: "new-lead-preview"
                },
                {
                    filename: "headshot.png",
                    path: HEADSHOT_PATH,
                    cid: "evan-headshot"
                }
            ]
        });

        console.log(
            "ZeptoMail message sent:",
            info.messageId
        );
    } catch (error) {
        console.error(
            "ZeptoMail message failed:",
            error
        );

        process.exitCode = 1;
    }
}

sendEmail();