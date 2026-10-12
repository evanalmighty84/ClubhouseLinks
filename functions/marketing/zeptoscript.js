const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const emailConfig = require("./emailConfig");

/*
|--------------------------------------------------------------------------
| OPTIONAL CTA SETTINGS
|--------------------------------------------------------------------------
|
| Individual email configs can use:
|
|     showCta: false
|
| Or they can select a button with:
|
|     ctaType: "sponsor"
|     ctaType: "lead-gen"
|
*/

const DEFAULT_CTA_TYPE = "sponsor";

const CTA_OPTIONS = {
    sponsor: {
        url: "https://www.paypal.com/donate?campaign_id=PM5CT5BHJ42SJ",
        text: "Become a Sponsor"
    },

    "lead-gen": {
        url: "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-45B07068GJ117120GNJRZ23A",
        text: "Get leads starting at $200/Month"
    }
};

/*
|--------------------------------------------------------------------------
| FILE PATHS
|--------------------------------------------------------------------------
*/

const CLUBHOUSE_LOGO_PATH = path.join(
    __dirname,
    "clubhouse-logo.png"
);

const HEADSHOT_PATH = path.join(
    __dirname,
    "headshot.png"
);

const CROWLEY_PARK_SPONSOR_TICKET_PATH = path.join(
    __dirname,
    "crowley-park-sponsor-ticket.png"
);

/*
|--------------------------------------------------------------------------
| SMTP CONFIG
|--------------------------------------------------------------------------
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

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

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

function resolveAttachmentPath(filePath) {
    if (path.isAbsolute(filePath)) {
        return filePath;
    }

    return path.join(__dirname, filePath);
}

function usesCrowleyParkSponsorTicket(config) {
    return String(config.bodyHtml || "").includes(
        "cid:crowley-park-sponsor-ticket"
    );
}

function validateAttachmentFiles(config) {
    const attachmentFiles = [
        CLUBHOUSE_LOGO_PATH,
        HEADSHOT_PATH
    ];

    if (usesCrowleyParkSponsorTicket(config)) {
        attachmentFiles.push(
            CROWLEY_PARK_SPONSOR_TICKET_PATH
        );
    }

    for (const attachment of config.attachments || []) {
        if (!attachment.filePath) {
            throw new Error(
                "An email attachment is missing filePath."
            );
        }

        attachmentFiles.push(
            resolveAttachmentPath(
                attachment.filePath
            )
        );
    }

    for (const attachmentPath of attachmentFiles) {
        if (!fs.existsSync(attachmentPath)) {
            throw new Error(
                `Missing attachment file: ${attachmentPath}`
            );
        }
    }
}

/*
|--------------------------------------------------------------------------
| CTA
|--------------------------------------------------------------------------
*/

function getCta(config) {
    if (config.showCta === false) {
        return null;
    }

    const ctaType =
        config.ctaType ||
        DEFAULT_CTA_TYPE;

    const cta = CTA_OPTIONS[ctaType];

    if (!cta) {
        throw new Error(
            `Unknown CTA type: ${ctaType}`
        );
    }

    return cta;
}

function buildCtaHtml(config) {
    const cta = getCta(config);

    if (!cta) {
        return "";
    }

    return `
        <table
            role="presentation"
            cellspacing="0"
            cellpadding="0"
            border="0"
            align="center"
            style="margin:28px auto;"
        >
            <tr>
                <td
                    align="center"
                    style="
                        border-radius:8px;
                        background:#ff3bd4;
                        border:1px solid #25f4ff;
                        box-shadow:0 0 16px rgba(255,59,212,0.35);
                    "
                >
                    <a
                        href="${escapeHtml(cta.url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                            display:inline-block;
                            padding:15px 34px;
                            color:#ffffff;
                            text-decoration:none;
                            font-family:Verdana,Arial,Helvetica,sans-serif;
                            font-size:16px;
                            font-weight:700;
                            line-height:1.2;
                        "
                    >
                        ${escapeHtml(cta.text)}
                    </a>
                </td>
            </tr>
        </table>
    `;
}

/*
|--------------------------------------------------------------------------
| BUILD EMAIL
|--------------------------------------------------------------------------
*/

function buildEmail(config) {
    validateEmailConfig(config);

    const safeSubject = escapeHtml(config.subject);
    const ctaHtml = buildCtaHtml(config);

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
                                    <td
                                        style="
                                            padding:0;
                                            font-family:Verdana,Arial,Helvetica,sans-serif;
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
                                            "
                                        >
                                            <tr>
                                                <td
                                                    style="
                                                        padding:18px 20px 24px;
                                                        color:#111827;
                                                        font-family:Verdana,Arial,Helvetica,sans-serif;
                                                        font-size:15px;
                                                        line-height:1.65;
                                                    "
                                                >
                                                    <div style="color:#111827;">
                                                        ${config.bodyHtml}
                                                    </div>

                                                    ${ctaHtml}

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
                                                                    height="75"
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

/*
|--------------------------------------------------------------------------
| ATTACHMENTS
|--------------------------------------------------------------------------
*/

function buildAttachments(config) {
    const attachments = [
        {
            filename: "clubhouse-logo.png",
            path: CLUBHOUSE_LOGO_PATH,
            cid: "clubhouse-logo",
            contentDisposition: "inline"
        },
        {
            filename: "headshot.png",
            path: HEADSHOT_PATH,
            cid: "evan-headshot",
            contentDisposition: "inline"
        }
    ];

    if (usesCrowleyParkSponsorTicket(config)) {
        attachments.push({
            filename: "crowley-park-sponsor-ticket.png",
            path: CROWLEY_PARK_SPONSOR_TICKET_PATH,
            cid: "crowley-park-sponsor-ticket",
            contentDisposition: "inline"
        });
    }

    for (const attachment of config.attachments || []) {
        attachments.push({
            filename:
                attachment.fileName ||
                path.basename(attachment.filePath),

            path:
                resolveAttachmentPath(
                    attachment.filePath
                ),

            contentType:
                attachment.contentType ||
                "application/octet-stream",

            contentDisposition: "attachment"
        });
    }

    return attachments;
}

/*
|--------------------------------------------------------------------------
| SEND EMAIL
|--------------------------------------------------------------------------
*/

async function sendEmail() {
    try {
        validateEmailConfig(emailConfig);
        validateAttachmentFiles(emailConfig);

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
            attachments: buildAttachments(emailConfig)
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
