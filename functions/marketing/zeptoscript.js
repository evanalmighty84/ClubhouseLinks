const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const emailConfig = require("./emailConfig");
const leadReportHtml = require("./RooferLeadReportHtml");

const PAYMENT_URL =
    "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-45B07068GJ117120GNJRZ23A";



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
                                    border-radius:0;
                                    overflow:hidden;
                                    box-shadow:none;
                                "
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:20px 20px 14px;
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
                     
                                </tr>

                                <tr>
                                    <td
                                        style="
                                            padding:0;
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
                                      

                                        <table
                                            role="presentation"
                                            width="100%"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                width:100%;
                                                margin-top:0;
                                                border-collapse:collapse;
                                                border-spacing:0;
                                                background:#ffffff;
                                                border:0;
                                                border-radius:0;
                                            "
                                        >
                                            <tr>
                                                <td
                                                    style="
                                                        padding:18px 20px 24px;
                                                        color:#111827;
                                                        font-family:
                                                            Verdana,
                                                            Arial,
                                                            Helvetica,
                                                            sans-serif;
                                                        font-size:15px;
                                                        line-height:1.65;
                                                    "
                                                >
                                                    <p
                                                        style="
                                                            margin:0 0 18px 0;
                                                            color:#111827;
                                                        "
                                                    >
                                                        Hi ${safeRecipientName},
                                                    </p>

                                                    <div
                                                        style="
                                                            color:#111827;
                                                        "
                                                    >
                                                        ${config.bodyHtml}
                                                    </div>

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
                                                                background:#ff3bd4;
                                                                color:#ffffff;
                                                                text-decoration:none;
                                                                font-weight:700;
                                                                border:1px solid #25f4ff;
                                                                border-radius:7px;
                                                                box-shadow:
                                                                    0 0 16px rgba(255,59,212,0.35);
                                                            "
                                                        >
                                                            Get started for $200/Month
                                                        </a>
                                                    </p>

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
                                                                        border:2px solid #25f4ff;
                                                                        box-shadow:
                                                                            0 0 14px rgba(37,244,255,0.28);
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
                                                                <strong
                                                                    style="
                                                                        color:#111827;
                                                                        font-size:15px;
                                                                    "
                                                                >
                                                                    Evan Ligon
                                                                </strong>
                                                                <br>

                                                                <span style="color:#111827;">
                                                                    CEO / Web Developer
                                                                </span>
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
                                                                        font-weight:700;
                                                                    "
                                                                >
                                                                    214-548-9175
                                                                </a>
                                                                <br>

                                                            
                                                            </td>
                                                        </tr>
                                                    </table>
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

        console.log(
            "Connected to ZeptoMail SMTP."
        );

        const info = await transport.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
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
