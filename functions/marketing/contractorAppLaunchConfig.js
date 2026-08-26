// contractorAppLaunchConfig.js

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getInviteCode(companyName = "") {
    return `${String(companyName)
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()}26`;
}

module.exports = {
    subject: "⚡ Your Clubhouse Links Profile Is Ready",

    appStoreUrl:
        "https://apps.apple.com/us/app/clubhouse-links/id6790003233",

    // CONTRACTOR APP LAUNCH RECIPIENTS
    recipients: [
        {
            email: "dinorduronio@gmail.com",
            firstName: "Dino",
            companyName: "DD Ledgers",
            phone: "4692358431"
        }
    ],

    buildBodyHtml: ({ firstName, companyName, phone }) => {
        const safeFirstName = escapeHtml(firstName);
        const safeCompanyName = escapeHtml(companyName);
        const safePhone = escapeHtml(phone);
        const inviteCode = getInviteCode(companyName);

        return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clubhouse Links</title>
</head>
<body style="margin:0;padding:0;background:#050914;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#050914;margin:0;padding:0;">
<tr>
<td align="center" style="padding:26px 12px 40px 12px;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#080e1d;border:1px solid #123c54;border-radius:26px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
            <td align="center" style="padding:34px 28px 28px 28px;background:#06121e;border-bottom:1px solid #124961;">
                <img
                    src="cid:clubhouse-logo"
                    alt="Clubhouse Links"
                    width="150"
                    style="display:block;width:150px;max-width:70%;height:auto;margin:0 auto 20px auto;border:0;"
                >

                <div style="color:#16dbff;font-size:12px;line-height:18px;font-weight:800;letter-spacing:3px;margin-bottom:10px;">
                    CONTRACTOR NETWORK // ONLINE
                </div>

                <div style="color:#ffffff;font-size:36px;line-height:44px;font-weight:900;">
                    Your Clubhouse Links<br>Profile Is Ready
                </div>

                <div style="width:110px;height:3px;background:#17d9ff;margin:22px auto 0 auto;"></div>
            </td>
        </tr>

        <!-- INTRO -->
        <tr>
            <td style="padding:34px 36px 12px 36px;">
                <p style="margin:0 0 22px 0;color:#ffffff;font-size:18px;line-height:29px;">
                    Hey ${safeFirstName},
                </p>

                <p style="margin:0 0 26px 0;color:#d7e0ea;font-size:17px;line-height:29px;">
                    We've been continuing to build out the <strong style="color:#ffffff;">Clubhouse Links</strong>
                    app, and <strong style="color:#17d9ff;">${safeCompanyName}</strong> is already set up inside the system.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#0c2132;border:1px solid #17d9ff;border-radius:20px;">
                    <tr>
                        <td style="padding:25px;">
                            <div style="color:#17d9ff;font-size:12px;font-weight:800;letter-spacing:2px;margin-bottom:10px;">
                                ⚡ PROFILE LINKED
                            </div>

                            <div style="color:#ffffff;font-size:17px;line-height:29px;">
                                <strong>You do not need to create a new contractor account.</strong>
                                Your phone number,
                                <strong style="color:#17d9ff;">${safePhone}</strong>,
                                is already programmed into your Clubhouse Links vendor profile.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- DOWNLOAD -->
        <tr>
            <td style="padding:30px 36px 10px 36px;">
                <div style="color:#ffffff;font-size:27px;line-height:35px;font-weight:900;margin-bottom:14px;">
                    📲 First: Download the App
                </div>

                <p style="color:#d7e0ea;font-size:17px;line-height:29px;margin:0 0 24px 0;">
                    Download Clubhouse Links from the App Store and sign in using the phone number already associated with your business.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td align="center" bgcolor="#18d8ff" style="border-radius:14px;">
                            <a
                                href="https://apps.apple.com/us/app/clubhouse-links/id6790003233"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="display:block;padding:18px 22px;color:#04101a;text-decoration:none;font-size:18px;font-weight:900;border-radius:14px;"
                            >
                                ⚡ DOWNLOAD CLUBHOUSE LINKS
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- NOTIFICATIONS -->
        <tr>
            <td style="padding:32px 36px 12px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#17122d;border:1px solid #7549d5;border-radius:20px;">
                    <tr>
                        <td style="padding:26px;">
                            <div style="color:#ffffff;font-size:24px;line-height:31px;font-weight:900;margin-bottom:14px;">
                                🔔 Turn On Notifications
                            </div>

                            <div style="color:#ddd9ea;font-size:17px;line-height:29px;">
                                When you sign in, please <strong style="color:#ffffff;">allow notifications.</strong>
                                This gives Clubhouse Links the ability to send new leads and service requests directly through the app instead of relying only on text messages.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- LEAD EXAMPLE -->
        <tr>
            <td style="padding:34px 36px 12px 36px;">
                <div style="color:#ffffff;font-size:27px;line-height:36px;font-weight:900;margin-bottom:15px;">
                    ⚡ Leads Now Show Up in the App
                </div>

                <p style="color:#d7e0ea;font-size:17px;line-height:29px;margin:0 0 24px 0;">
                    When a homeowner has a matching service request, you'll be able to view the request, see their contact information, read what they need, and accept or decline it directly from Clubhouse Links.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#030914;border:1px solid #16bfe8;border-radius:22px;">
                    <tr>
                        <td align="center" style="padding:18px;">
                            <img
                                src="cid:request-picture"
                                alt="Example Clubhouse Links service request"
                                width="390"
                                style="display:block;width:100%;max-width:390px;height:auto;margin:0 auto;border:0;border-radius:18px;"
                            >
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- INVITE CODE -->
        <tr>
            <td style="padding:38px 36px 12px 36px;">
                <div style="color:#ffffff;font-size:27px;line-height:36px;font-weight:900;margin-bottom:15px;">
                    👥 Get Your Customers on the App
                </div>

                <p style="color:#d7e0ea;font-size:17px;line-height:29px;margin:0 0 20px 0;">
                    Customers you've already completed work for can join Clubhouse Links and connect directly with <strong style="color:#ffffff;">${safeCompanyName}</strong>.
                </p>

                <p style="color:#d7e0ea;font-size:17px;line-height:29px;margin:0 0 24px 0;">
                    Just give them your company invite code:
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#081d2b;border:2px solid #17d9ff;border-radius:19px;">
                    <tr>
                        <td align="center" style="padding:28px 20px;">
                            <div style="color:#91a7b6;font-size:11px;font-weight:800;letter-spacing:3px;margin-bottom:9px;">
                                YOUR CUSTOMER INVITE CODE
                            </div>

                            <div style="color:#17d9ff;font-size:28px;line-height:36px;font-weight:900;letter-spacing:1px;">
                                ${inviteCode}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- $5 VENDOR REWARD -->
        <tr>
            <td style="padding:26px 36px 12px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#21113c;border:1px solid #9a5dff;border-radius:20px;">
                    <tr>
                        <td style="padding:26px;">
                            <div style="color:#cdafff;font-size:12px;line-height:18px;letter-spacing:2px;font-weight:800;margin-bottom:8px;">
                                💵 CONTRACTOR REWARD
                            </div>

                            <div style="color:#ffffff;font-size:25px;line-height:33px;font-weight:900;margin-bottom:13px;">
                                Earn $5 for Every Customer You Bring In
                            </div>

                            <div style="color:#e5dcf5;font-size:17px;line-height:29px;">
                                Every customer who downloads Clubhouse Links and signs up using
                                <strong style="color:#17d9ff;">${inviteCode}</strong>
                                earns <strong style="color:#ffffff;">${safeCompanyName} $5.</strong>
                            </div>

                            <div style="color:#e5dcf5;font-size:17px;line-height:29px;margin-top:15px;">
                                If 10 of your existing customers join using your code, that's
                                <strong style="color:#17d9ff;font-size:20px;">$50 for your company.</strong>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- BENEFITS -->
        <tr>
            <td style="padding:38px 36px 12px 36px;">
                <div style="color:#ffffff;font-size:27px;line-height:35px;font-weight:900;margin-bottom:22px;">
                    What You Can Expect
                </div>

                <p style="margin:0 0 20px 0;color:#d7e0ea;font-size:17px;line-height:29px;">
                    ⭐ <strong style="color:#ffffff;">More visibility with homeowners.</strong>
                    Customer activity helps establish your business as a contractor homeowners in the area are actually using.
                </p>

                <p style="margin:0 0 20px 0;color:#d7e0ea;font-size:17px;line-height:29px;">
                    📸 <strong style="color:#ffffff;">Completed work promotes your business.</strong>
                    Homeowners can submit finished project photos so other residents can see real examples of your work.
                </p>

                <p style="margin:0 0 20px 0;color:#d7e0ea;font-size:17px;line-height:29px;">
                    📲 <strong style="color:#ffffff;">App notifications.</strong>
                    Receive new opportunities and service requests directly through Clubhouse Links.
                </p>

                <p style="margin:0 0 20px 0;color:#d7e0ea;font-size:17px;line-height:29px;">
                    🏠 <strong style="color:#ffffff;">Direct homeowner requests.</strong>
                    Residents can choose your company and contact you directly from the app.
                </p>

                <p style="margin:0;color:#d7e0ea;font-size:17px;line-height:29px;">
                    📅 <strong style="color:#ffffff;">Local events.</strong>
                    Clubhouse Links events give you opportunities to meet homeowners face-to-face and discuss upcoming projects.
                </p>
            </td>
        </tr>

        <!-- ACTIONS -->
        <tr>
            <td style="padding:40px 36px 10px 36px;">
                <div style="color:#ffffff;font-size:27px;line-height:35px;font-weight:900;margin-bottom:23px;">
                    ⚡ What We'd Like You to Do
                </div>

                <p style="color:#d7e0ea;font-size:17px;line-height:30px;margin:0 0 11px 0;">
                    <strong style="color:#17d9ff;">01 //</strong> Download Clubhouse Links.
                </p>

                <p style="color:#d7e0ea;font-size:17px;line-height:30px;margin:0 0 11px 0;">
                    <strong style="color:#17d9ff;">02 //</strong> Sign in using <strong style="color:#ffffff;">${safePhone}</strong>.
                </p>

                <p style="color:#d7e0ea;font-size:17px;line-height:30px;margin:0 0 11px 0;">
                    <strong style="color:#17d9ff;">03 //</strong> Allow notifications when prompted.
                </p>

                <p style="color:#d7e0ea;font-size:17px;line-height:30px;margin:0;">
                    <strong style="color:#17d9ff;">04 //</strong>
                    Send <strong style="color:#ffffff;">${inviteCode}</strong> to customers you've already completed work for and
                    <strong style="color:#17d9ff;">earn $5 every time one joins Clubhouse Links.</strong>
                </p>
            </td>
        </tr>

        <!-- FINAL CTA -->
        <tr>
            <td style="padding:40px 36px 20px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td align="center" bgcolor="#18d8ff" style="border-radius:14px;">
                            <a
                                href="https://apps.apple.com/us/app/clubhouse-links/id6790003233"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="display:block;padding:19px 22px;color:#04101a;text-decoration:none;font-size:18px;font-weight:900;border-radius:14px;"
                            >
                                📲 OPEN CLUBHOUSE LINKS
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- SIGNATURE -->
        <tr>
            <td style="padding:26px 36px 42px 36px;color:#9eafbe;font-size:16px;line-height:27px;">
                <p style="margin:0 0 25px 0;">
                    If you have any trouble getting signed in, just reply to this email and I'll help you get set up.
                </p>

                <p style="margin:0;">
                    Thanks,<br>
                    <strong style="color:#ffffff;font-size:18px;">Evan Ligon</strong><br>
                    <span style="color:#17d9ff;">Clubhouse Links</span>
                </p>
            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td align="center" style="padding:20px;background:#030711;border-top:1px solid #123c54;color:#526a7a;font-size:11px;line-height:18px;letter-spacing:1px;">
                CLUBHOUSE LINKS // LOCAL HOME SERVICE NETWORK
            </td>
        </tr>

    </table>

</td>
</tr>
</table>

</body>
</html>
        `;
    }
};
