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
// FILE PATHS
// ---------------------------------------------------------

const CLUBHOUSE_LOGO_PATH =
    path.join(
        __dirname,
        "clubhouse-logo.png"
    );
const CROWLEY_PARK_FLYER_PATH =
    path.join(
        __dirname,
        "crowley-park-flyer.png"
    );

// Existing street fair image used by older configs
const STREET_FAIR_PATH =
    path.join(
        __dirname,
        "streetfair.png"
    );
const INHOUSE_PATH =
    path.join(
        __dirname,
        "streetfairinhouse.png"
    );

// New Glen Eagles postcard front
const STREET_FAIR_FRONT_PATH =
    path.join(
        __dirname,
        "frontredone.png"
    );

// Rename the second uploaded image to this
const STREET_FAIR_BACK_PATH =
    path.join(
        __dirname,
        "streetfair-back.jpeg"
    );

const HEADSHOT_PATH =
    path.join(
        __dirname,
        "headshot.png"
    );

// CSV containing Glen Eagles mailing recipients
const MAILING_LIST_PATH =
    path.join(
        __dirname,
        "glen-eagles-mailing-list.csv"
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

    const safeRecipientName =
        escapeHtml(config.recipientName);

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

                                    <p
                                        style="
                                            margin:0 0 18px 0;
                                            color:#000000;
                                        "
                                    >
                                        Hi ${safeRecipientName},
                                    </p>

                                  ${config.bodyHtml}

<!-- EVAN LIGON EMAIL SIGNATURE -->  
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
        bcc: Array.isArray(config.bcc)
            ? config.bcc
            : [],
        subject: config.subject,
        html
    };

}

// ---------------------------------------------------------
// BUILD ATTACHMENTS
// ---------------------------------------------------------

function buildAttachments(config) {
    const attachments = [];

    // Logo is always used by the outer email shell.
    validateFile(
        CLUBHOUSE_LOGO_PATH,
        "Clubhouse logo"
    );

    attachments.push({
        filename: "clubhouse-logo.png",
        path: CLUBHOUSE_LOGO_PATH,
        cid: "clubhouse-logo",
        contentDisposition: "inline",
    });

    // -----------------------------------------------------
    // OLD STREET FAIR IMAGE
    // cid:street-fair
    // -----------------------------------------------------

// -----------------------------------------------------
// EVAN HEADSHOT
// Always attached because the email shell uses it
// -----------------------------------------------------

    validateFile(
        HEADSHOT_PATH,
        "Evan headshot"
    );

    attachments.push({
        filename: "headshot.png",
        path: HEADSHOT_PATH,
        cid: "evan-headshot",
        contentDisposition: "inline",
    });

    // -----------------------------------------------------
// CROWLEY PARK FLYER
// cid:crowley-park-flyer
// -----------------------------------------------------

    if (
        config.bodyHtml.includes(
            "cid:crowley-park-flyer"
        )
    ) {
        validateFile(
            CROWLEY_PARK_FLYER_PATH,
            "Crowley Park flyer"
        );

        attachments.push({
            filename: "crowley-park-flyer.png",
            path: CROWLEY_PARK_FLYER_PATH,
            cid: "crowley-park-flyer",
            contentDisposition: "inline",
        });
    }
// -----------------------------------------------------
// STREET FAIR IMAGE
// cid:street-fair
// -----------------------------------------------------

    if (
        config.bodyHtml.includes(
            "cid:street-fair"
        )
    ) {
        validateFile(
            STREET_FAIR_PATH,
            "Street Fair image"
        );

        attachments.push({
            filename: "streetfair.png",
            path: STREET_FAIR_PATH,
            cid: "street-fair",
            contentDisposition: "inline",
        });
    }

    if (
        config.bodyHtml.includes(
            "cid:inhouse"
        )
    ) {
        validateFile(
            INHOUSE_PATH,
            "Street Fair InHouse image"
        );

        attachments.push({
            filename: "streetfairinhouse.png",
            path: INHOUSE_PATH,
            cid: "inhouse",
            contentDisposition: "inline",
        });
    }
    // -----------------------------------------------------
    // NEW POSTCARD FRONT
    // cid:streetfair-front
    // -----------------------------------------------------

    if (
        config.bodyHtml.includes(
            "cid:streetfair-front"
        )
    ) {
        validateFile(
            STREET_FAIR_FRONT_PATH,
            "Street Fair front image"
        );

        attachments.push({
            filename: "frontredone.png",
            path: STREET_FAIR_FRONT_PATH,
            cid: "streetfair-front",
            contentDisposition: "inline",
        });
    }

    // -----------------------------------------------------
    // NEW POSTCARD BACK
    // cid:streetfair-back
    // -----------------------------------------------------

    if (
        config.bodyHtml.includes(
            "cid:streetfair-back"
        )
    ) {
        validateFile(
            STREET_FAIR_BACK_PATH,
            "Street Fair back image"
        );

        attachments.push({
            filename: "streetfair-back.jpeg",
            path: STREET_FAIR_BACK_PATH,
            cid: "streetfair-back",
            contentDisposition: "inline",
        });
    }

    // -----------------------------------------------------
    // EVAN HEADSHOT
    // cid:evan-headshot
    // -----------------------------------------------------

    if (
        config.bodyHtml.includes(
            "cid:evan-headshot"
        )
    ) {
        validateFile(
            HEADSHOT_PATH,
            "Evan headshot"
        );

        attachments.push({
            filename: "headshot.png",
            path: HEADSHOT_PATH,
            cid: "evan-headshot",
            contentDisposition: "inline",
        });
    }

    // -----------------------------------------------------
    // GLEN EAGLES CSV MAILING LIST
    // Actual downloadable attachment
    // -----------------------------------------------------

    if (
        config.attachMailingList === true
    ) {
        validateFile(
            MAILING_LIST_PATH,
            "Glen Eagles mailing list"
        );

        attachments.push({
            filename:
                config.mailingListFilename ||
                "glen-eagles-mailing-list.csv",

            path:
            MAILING_LIST_PATH,

            contentType:
                "text/csv",

            contentDisposition:
                "attachment",
        });
    }


    // -----------------------------------------------------
    // CONFIG-DEFINED ATTACHMENTS
    // PDFs, documents, spreadsheets, etc.
    // -----------------------------------------------------

    if (Array.isArray(config.attachments)) {
        for (const attachment of config.attachments) {

            const attachmentPath =
                path.isAbsolute(attachment.path)
                    ? attachment.path
                    : path.resolve(
                        __dirname,
                        attachment.path
                    );

            validateFile(
                attachmentPath,
                attachment.filename || "Email attachment"
            );

            attachments.push({
                filename:
                    attachment.filename ||
                    path.basename(attachmentPath),

                path: attachmentPath,

                contentType:
                    attachment.contentType ||
                    undefined,

                contentDisposition: "attachment"
            });
        }
    }

    return attachments;
}


// ---------------------------------------------------------
// SEND
// ---------------------------------------------------------

async function sendEmail() {
    try {
        const email =
            buildEmail(emailConfig);

        const attachments =
            buildAttachments(emailConfig);

        console.log(
            `📧 Sending email to ${email.to}...`
        );

        console.log(
            "Attachments:",
            attachments.map(
                attachment => ({
                    filename:
                    attachment.filename,

                    cid:
                        attachment.cid || null,

                    disposition:
                    attachment.contentDisposition,
                })
            )
        );

        await transport.verify();

        console.log(
            "✅ ZeptoMail SMTP connection verified."
        );


        const info = await transport.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email.to,
            bcc: email.bcc,
            subject: email.subject,
            html: email.html,
            attachments
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