// sendContractorAppLaunch.js
//
// Put these files in the same directory:
//   sendContractorAppLaunch.js
//   contractorAppLaunchConfig.js
//   clubhouse-logo.png
//   requestpicture.png
//
// Then run:
//   node sendContractorAppLaunch.js

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const config = require("./contractorAppLaunchConfig");

// ---------------------------------------------------------
// IMAGE PATHS
// ---------------------------------------------------------

const CLUBHOUSE_LOGO_PATH = path.join(
    __dirname,
    "clubhouse-logo.png"
);

const REQUEST_PICTURE_PATH = path.join(
    __dirname,
    "requestpicture.png"
);

// ---------------------------------------------------------
// SMTP CONFIG
// Same ZeptoMail environment-variable pattern as the
// sender you already have working.
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// TRANSPORT
// ---------------------------------------------------------

const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

// ---------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------

function validateImageFiles() {
    const imageFiles = [
        CLUBHOUSE_LOGO_PATH,
        REQUEST_PICTURE_PATH
    ];

    for (const imagePath of imageFiles) {
        if (!fs.existsSync(imagePath)) {
            throw new Error(
                `Missing image file: ${imagePath}`
            );
        }
    }

    console.log("✅ Image files found:");
    console.log(`   ${CLUBHOUSE_LOGO_PATH}`);
    console.log(`   ${REQUEST_PICTURE_PATH}`);
}

function validateConfig() {
    if (!config.subject || !String(config.subject).trim()) {
        throw new Error("contractorAppLaunchConfig.js is missing subject.");
    }

    if (!Array.isArray(config.recipients) || config.recipients.length === 0) {
        throw new Error("contractorAppLaunchConfig.js has no recipients.");
    }

    if (typeof config.buildBodyHtml !== "function") {
        throw new Error("contractorAppLaunchConfig.js is missing buildBodyHtml().");
    }
}

function validateRecipient(recipient) {
    const requiredFields = [
        "email",
        "firstName",
        "companyName",
        "phone"
    ];

    for (const field of requiredFields) {
        if (!recipient[field] || !String(recipient[field]).trim()) {
            throw new Error(
                `Recipient is missing ${field}: ${JSON.stringify(recipient)}`
            );
        }
    }
}

// ---------------------------------------------------------
// SEND ONE RECIPIENT
// ---------------------------------------------------------

async function sendRecipient(recipient) {
    validateRecipient(recipient);

    const html = config.buildBodyHtml(recipient);

    const info = await transport.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: recipient.email,
        subject: config.subject,
        html,

        // IMPORTANT:
        // Attach the images directly here, exactly like the
        // working ZeptoMail sender pattern.
        attachments: [
            {
                filename: "clubhouse-logo.png",
                path: CLUBHOUSE_LOGO_PATH,
                cid: "clubhouse-logo"
            },
            {
                filename: "requestpicture.png",
                path: REQUEST_PICTURE_PATH,
                cid: "request-picture"
            }
        ]
    });

    return info;
}

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------

async function sendContractorAppLaunch() {
    try {
        validateConfig();
        validateImageFiles();

        await transport.verify();
        console.log("✅ Connected to ZeptoMail SMTP.");
        console.log(`Preparing to send ${config.recipients.length} email(s).`);

        for (let i = 0; i < config.recipients.length; i++) {
            const recipient = config.recipients[i];

            console.log("");
            console.log(
                `[${i + 1}/${config.recipients.length}] ` +
                `${recipient.companyName} <${recipient.email}>`
            );
            console.log(`   Phone: ${recipient.phone}`);

            try {
                const info = await sendRecipient(recipient);

                console.log(
                    `✅ Sent to ${recipient.companyName} <${recipient.email}>`
                );
                console.log(`   Message ID: ${info.messageId}`);
            } catch (error) {
                console.error(
                    `❌ Failed to send to ${recipient.companyName} <${recipient.email}>`
                );
                console.error(error.message || error);
            }
        }

        console.log("");
        console.log("✅ Contractor app launch email run complete.");
    } catch (error) {
        console.error("");
        console.error("❌ Contractor app launch failed:");
        console.error(error);
        process.exitCode = 1;
    }
}

sendContractorAppLaunch();
