"use strict";

const nodemailer =
    require("nodemailer");

const path =
    require("path");

const fs =
    require("fs");

const emailConfig =
    require("./hoaBoardWelcomeEmailConfig");


/* --------------------------------------------------
 * Embedded email images
 * --------------------------------------------------
 */

const CLUBHOUSE_LOGO_PATH =
    path.join(
        __dirname,
        "clubhouse-logo.png"
    );

const HEADSHOT_PATH =
    path.join(
        __dirname,
        "headshot.png"
    );


/* --------------------------------------------------
 * ZeptoMail SMTP
 * --------------------------------------------------
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
    Number(
        process.env.ZEPTOMAIL_SMTP_PORT
    ) || 587;

const FROM_EMAIL =
    process.env.ZEPTOMAIL_FROM_EMAIL ||
    "evan.ligon@clubhouselinks.com";

const FROM_NAME =
    process.env.ZEPTOMAIL_FROM_NAME ||
    "Evan Ligon";


if (
    !SMTP_USER ||
    !SMTP_PASS
) {

    throw new Error(
        "Missing ZeptoMail SMTP credentials."
    );
}


const transport =
    nodemailer.createTransport({
        host:
        SMTP_HOST,

        port:
        SMTP_PORT,

        secure:
            SMTP_PORT === 465,

        auth: {
            user:
            SMTP_USER,

            pass:
            SMTP_PASS
        }
    });


/* --------------------------------------------------
 * Helpers
 * --------------------------------------------------
 */

function escapeHtml(
    value = ""
) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function validateConfig() {

    if (
        !Array.isArray(
            emailConfig.recipients
        ) ||
        emailConfig.recipients.length === 0
    ) {

        throw new Error(
            "No recipients configured."
        );
    }


    for (
        const recipient
        of emailConfig.recipients
        ) {

        const required = [
            "recipientEmail",
            "recipientName",
            "neighborhood",
            "inviteCode"
        ];


        for (
            const field
            of required
            ) {

            if (
                !recipient[field] ||
                !String(
                    recipient[field]
                ).trim()
            ) {

                throw new Error(
                    `Missing ${field} for a recipient.`
                );
            }
        }
    }
}


function validateImageFiles() {

    const requiredImages = [
        CLUBHOUSE_LOGO_PATH,
        HEADSHOT_PATH
    ];


    for (
        const imagePath
        of requiredImages
        ) {

        if (
            !fs.existsSync(
                imagePath
            )
        ) {

            throw new Error(
                `Missing image file: ${imagePath}`
            );
        }
    }
}


/* --------------------------------------------------
 * Build individual email
 * --------------------------------------------------
 */

function buildEmail(
    recipient
) {

    const name =
        escapeHtml(
            recipient.recipientName
        );

    const neighborhood =
        escapeHtml(
            recipient.neighborhood
        );

    const inviteCode =
        escapeHtml(
            recipient.inviteCode
        );

    const subject =
        emailConfig.subject;


    const html = `
<!doctype html>

<html>

<head>

    <meta charset="utf-8">

    <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
    >

    <title>
        ${escapeHtml(subject)}
    </title>

</head>


<body
    style="
        margin:0;
        padding:0;
        background:#ffffff;
    "
>

    <div
        style="
            max-width:680px;
            margin:0 auto;
            padding:28px 22px;

            font-family:
                Verdana,
                Arial,
                Helvetica,
                sans-serif;

            font-size:15px;
            line-height:1.65;
            color:#000000;
        "
    >


        <!-- Clubhouse Links logo -->

        <div
            style="
                margin:0 0 26px 0;
            "
        >

            <img
                src="cid:clubhouse-logo"
                alt="Clubhouse Links"
                width="140"
                style="
                    display:block;
                    width:140px;
                    max-width:100%;
                    height:auto;
                    border:0;
                "
            >

        </div>


        <!-- Greeting -->

        <p
            style="
                margin:0 0 18px 0;
                color:#000000;
            "
        >
            ${name},
        </p>


        <!-- Introduction -->

        <p
            style="
                margin:0 0 18px 0;
                color:#000000;
            "
        >

            I have your

            <strong>
                ${neighborhood}
            </strong>

            HOA board access set up in the new
            Clubhouse Links test version.

            I would like you to help test both the
            HOA board and resident experience before
            we roll these features out more broadly.

        </p>


        <!-- TestFlight instructions -->

        <div
            style="
                margin:0 0 24px 0;
                padding:18px;
                background:#f5f8ff;
                border:1px solid #dbe5ff;
                border-radius:12px;
                color:#000000;
            "
        >

            <div
                style="
                    font-size:17px;
                    font-weight:700;
                    margin-bottom:10px;
                    color:#000000;
                "
            >
                Your TestFlight invitation has been sent
            </div>


            <p
                style="
                    margin:0 0 12px 0;
                    color:#000000;
                "
            >

                You should also have received a
                <strong>
                    separate email from Apple
                </strong>
                inviting you to test Clubhouse Links
                through TestFlight.

            </p>


            <p
                style="
                    margin:0 0 12px 0;
                    color:#000000;
                "
            >

                Open that Apple email on your iPhone
                and tap

                <strong>
                    View in TestFlight
                </strong>.

            </p>


            <p
                style="
                    margin:0;
                    color:#000000;
                "
            >

                If you do not already have Apple's
                <strong>
                    TestFlight
                </strong>
                app installed, Apple will walk you
                through installing it first.

                Once TestFlight is installed, use the
                invitation to install the Clubhouse
                Links test version.

            </p>

        </div>


        <!-- Signup -->

        <p
            style="
                margin:0 0 18px 0;
                color:#000000;
            "
        >

            Once the Clubhouse Links test version is
            installed through TestFlight, open it and
            create your resident account using your
            mobile number and the neighborhood invite
            code below.

        </p>


        <!-- Invite code -->

        <div
            style="
                margin:0 0 24px 0;
                padding:16px 18px;
                border:2px solid #111827;
                border-radius:12px;
                color:#000000;
            "
        >

            <div
                style="
                    font-size:12px;
                    font-weight:700;
                    margin-bottom:5px;
                    color:#000000;
                "
            >
                ${neighborhood} Invite Code
            </div>


            <div
                style="
                    font-size:22px;
                    font-weight:800;
                    letter-spacing:1px;
                    color:#000000;
                "
            >
                ${inviteCode}
            </div>

        </div>


        <p
            style="
                margin:0 0 24px 0;
                color:#000000;
            "
        >

            After signup, you should be able to use
            Clubhouse Links normally as a resident of

            <strong>
                ${neighborhood}
            </strong>

            while also having access to the
            HOA Board Events view.

        </p>


        <!-- Events testing -->

        <div
            style="
                margin:0 0 24px 0;
                padding:18px;
                border:1px solid #e5e7eb;
                border-radius:12px;
                color:#000000;
            "
        >

            <div
                style="
                    font-size:18px;
                    font-weight:700;
                    margin-bottom:12px;
                    color:#000000;
                "
            >
                1. Test HOA Events
            </div>


            <p
                style="
                    margin:0 0 14px 0;
                    color:#000000;
                "
            >

                The main thing I would like you to test
                is creating an HOA event and then seeing
                that same event from the resident side.

            </p>


            <ol
                style="
                    margin:0 0 0 22px;
                    padding:0;
                    color:#000000;
                "
            >

                <li
                    style="
                        margin-bottom:10px;
                    "
                >
                    Open Events and switch to the
                    <strong>
                        HOA Board
                    </strong>
                    view.
                </li>


                <li
                    style="
                        margin-bottom:10px;
                    "
                >
                    Create and publish a test event for
                    <strong>
                        ${neighborhood}
                    </strong>.
                </li>


                <li
                    style="
                        margin-bottom:10px;
                    "
                >
                    Switch from
                    <strong>
                        HOA Board
                    </strong>
                    back to the normal
                    <strong>
                        Resident
                    </strong>
                    Events view.
                </li>


                <li
                    style="
                        margin-bottom:0;
                    "
                >
                    Make sure the event you just created
                    appears correctly when you are viewing
                    Events as a resident.
                </li>

            </ol>

        </div>


        <!-- Service request testing -->

        <div
            style="
                margin:0 0 24px 0;
                padding:18px;
                border:1px solid #e5e7eb;
                border-radius:12px;
                color:#000000;
            "
        >

            <div
                style="
                    font-size:18px;
                    font-weight:700;
                    margin-bottom:12px;
                    color:#000000;
                "
            >
                2. Test a Service Request
            </div>


            <p
                style="
                    margin:0 0 14px 0;
                    color:#000000;
                "
            >

                I would also like you to try the
                resident Service Request feature.

            </p>


            <ol
                style="
                    margin:0 0 0 22px;
                    padding:0;
                    color:#000000;
                "
            >

                <li
                    style="
                        margin-bottom:10px;
                    "
                >
                    Go to
                    <strong>
                        Service Requests
                    </strong>.
                </li>


                <li
                    style="
                        margin-bottom:10px;
                    "
                >
                    Select
                    <strong>
                        HOA
                    </strong>
                    as the service.
                </li>


                <li
                    style="
                        margin-bottom:10px;
                    "
                >
                    Select
                    <strong>
                        ${neighborhood} HOA
                    </strong>
                    as the vendor.
                </li>


                <li
                    style="
                        margin-bottom:0;
                    "
                >
                    Send a simple test request so that
                    we can verify the resident-to-HOA
                    request flow.
                </li>

            </ol>

        </div>


        <!-- Feedback -->

        <p
            style="
                margin:0 0 18px 0;
                color:#000000;
            "
        >

            If anything looks confusing, does not work,
            or does not behave the way you would expect,
            send me a screenshot and a quick note about
            what happened.

        </p>


        <!-- Signature -->

        <p
            style="
                margin:28px 0 0 0;
                color:#000000;
            "
        >
            Thanks,
        </p>


        <div
            style="
                margin-top:18px;
                padding-top:22px;
                border-top:1px solid #e5e7eb;
            "
        >

            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
            >

                <tr>

                    <td
                        style="
                            vertical-align:top;
                            padding-right:16px;
                        "
                    >

                        <img
                            src="cid:evan-headshot"
                            alt="Evan Ligon"
                            width="80"
                            height="80"
                            style="
                                display:block;
                                width:80px;
                                height:80px;
                                border-radius:50%;
                                border:0;
                            "
                        >

                    </td>


                    <td
                        style="
                            vertical-align:middle;
                            color:#000000;
                            font-size:14px;
                            line-height:1.55;
                        "
                    >

                        <strong
                            style="
                                color:#000000;
                                font-size:16px;
                            "
                        >
                            Evan Ligon
                        </strong>

                        <br>


                        <span
                            style="
                                color:#000000;
                            "
                        >
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
                            href="mailto:evan.ligon@clubhouselinks.com"
                            style="
                                color:#009899;
                                text-decoration:none;
                            "
                        >
                            evan.ligon@clubhouselinks.com
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

        </div>


    </div>

</body>

</html>
    `;


    /* --------------------------------------------------
     * Plain text fallback
     * --------------------------------------------------
     */

    const text = `
${recipient.recipientName},

I have your ${recipient.neighborhood} HOA board access set up in the new Clubhouse Links test version.

I would like you to help test both the HOA board and resident experience before we roll these features out more broadly.

TESTFLIGHT

You should also have received a separate email from Apple inviting you to test Clubhouse Links through TestFlight.

Open that Apple email on your iPhone and tap "View in TestFlight."

If you do not already have Apple's TestFlight app installed, Apple will walk you through installing it first.

Once TestFlight is installed, use the invitation to install the Clubhouse Links test version.

Once the test version is installed, open Clubhouse Links and create your resident account using your mobile number.

Your ${recipient.neighborhood} invite code is:

${recipient.inviteCode}


1. TEST HOA EVENTS

- Open Events and switch to the HOA Board view.
- Create and publish a test event for ${recipient.neighborhood}.
- Switch from HOA Board back to the normal Resident Events view.
- Make sure the event you created appears correctly when viewing Events as a resident.


2. TEST A SERVICE REQUEST

- Go to Service Requests.
- Select HOA as the service.
- Select ${recipient.neighborhood} HOA as the vendor.
- Send a simple test request so we can verify the resident-to-HOA request flow.


If anything looks confusing, does not work, or does not behave the way you would expect, send me a screenshot and a quick note about what happened.

Thanks,

Evan Ligon
CEO / Web Developer
Clubhouse Links
www.ClubhouseLinks.com
evan.ligon@clubhouselinks.com
214-548-9175
    `.trim();


    return {
        to:
        recipient.recipientEmail,

        subject,

        html,

        text
    };
}


/* --------------------------------------------------
 * Send one recipient
 * --------------------------------------------------
 */

async function sendEmail(
    recipient
) {

    const email =
        buildEmail(
            recipient
        );


    /*
     * These Content-IDs must match the cid:
     * references in the HTML above.
     */
    const attachments = [
        {
            filename:
                "clubhouse-logo.png",

            path:
            CLUBHOUSE_LOGO_PATH,

            cid:
                "clubhouse-logo"
        },

        {
            filename:
                "headshot.png",

            path:
            HEADSHOT_PATH,

            cid:
                "evan-headshot"
        }
    ];


    const info =
        await transport.sendMail({
            from:
                `"${FROM_NAME}" <${FROM_EMAIL}>`,

            to:
            email.to,

            subject:
            email.subject,

            text:
            email.text,

            html:
            email.html,

            attachments
        });


    console.log(
        "✅ HOA board TestFlight email sent:",
        {
            recipient:
            recipient.recipientName,

            neighborhood:
            recipient.neighborhood,

            email:
            recipient.recipientEmail,

            messageId:
            info.messageId
        }
    );
}


/* --------------------------------------------------
 * Run
 * --------------------------------------------------
 */

async function run() {

    try {

        validateConfig();

        validateImageFiles();


        console.log(
            "Images found:",
            {
                clubhouseLogo:
                CLUBHOUSE_LOGO_PATH,

                headshot:
                HEADSHOT_PATH
            }
        );


        await transport.verify();


        console.log(
            "Connected to ZeptoMail SMTP."
        );


        /*
         * Send each recipient a completely
         * independent email.
         *
         * Stacy will not see Chip's address
         * and Chip will not see Stacy's.
         */
        for (
            const recipient
            of emailConfig.recipients
            ) {

            await sendEmail(
                recipient
            );
        }


        console.log(
            "✅ All HOA board TestFlight emails sent."
        );

    } catch (
        error
        ) {

        console.error(
            "❌ HOA board TestFlight email send failed:",
            error
        );

        process.exitCode =
            1;
    }
}


run();