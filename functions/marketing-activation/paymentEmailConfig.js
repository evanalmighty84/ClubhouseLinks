
const path = require("path");

module.exports = {
    recipientEmail: "amdrdallas@gmail.com", // Add Antonio's email
    recipientName: "Antonio",
    companyName: "Antonio's Mobile Dent Repair",
    leadCategory: "auto_body",

    subject: "Antonio's Mobile Dent Repair — Clubhouse Links A.I. Activation",

    bodyHtml: `
        <div style="
            font-family:Arial,Helvetica,sans-serif;
            color:#000000;
            font-size:15px;
            line-height:1.7;
            max-width:650px;
        ">

        

            <p style="color:#000000;">
                It was great connecting with you about
                <strong>Antonio's Mobile Dent Repair</strong>.
                I'm excited to help grow your business through
                Clubhouse Links' A.I.-powered lead generation
                and customer engagement services.
            </p>

            <p style="color:#000000;">
                Once activated, we'll begin identifying
                customer opportunities for services including
                mobile dent repair, paintless dent removal,
                hail damage repair, bumper repair, minor
                collision damage, and other automotive
                bodywork.
            </p>

            <h3 style="color:#000000;">
                Monthly A.I. Coverage Pricing
            </h3>

            <p style="color:#000000;">
                Your service begins at a
                <strong>$100 monthly minimum</strong>,
                with an additional performance-based adjustment
                equal to <strong>10% of monthly earnings
                generated through the service</strong>.
                Your total monthly charge will
                <strong>never exceed $200</strong>,
                regardless of how much business is generated.
            </p>

            <p style="color:#000000;">
                This structure ensures predictable costs
                while aligning our compensation with the
                results delivered to your business.
            </p>

            <div style="
                border:1px solid #dddddd;
                border-radius:8px;
                padding:24px;
                margin:24px 0;
                text-align:center;
                background-color:#ffffff;
            ">

                <h3 style="
                    margin:0 0 12px;
                    color:#000000;
                ">
                    Activate Your A.I. Coverage
                </h3>

                <p style="color:#000000;">
                    Choose your preferred payment method below
                    to complete your activation.
                </p>

                <p style="
                    font-weight:bold;
                    color:#000000;
                    margin:20px 0 12px;
                ">
                    Option 1: PayPal
                </p>

                <a
                    href="https://www.paypal.com/invoice/p/#INV2-G4WR-DZW6-SYVC-U9LG"
                    style="
                        display:inline-block;
                        padding:14px 28px;
                        background-color:#000000;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:6px;
                        font-weight:bold;
                    "
                >
                    View & Pay Activation Invoice
                </a>

                <p style="
                    color:#000000;
                    margin:25px 0;
                    font-weight:bold;
                ">
                    OR
                </p>

                <p style="
                    font-weight:bold;
                    color:#000000;
                    margin:0 0 12px;
                ">
                    Option 2: Zelle
                </p>

                <p style="color:#000000;">
                    Open your banking app and scan the
                    QR code below to send your payment
                    directly to Clubhouse Links.
                </p>

                <img
                    src="cid:clubhouse-zelle"
                    alt="Clubhouse Links Zelle Payment QR Code"
                    width="280"
                    style="
                        display:block;
                        width:280px;
                        max-width:100%;
                        height:auto;
                        margin:16px auto;
                        border:0;
                    "
                />

                <p style="
                    font-size:13px;
                    color:#000000;
                    margin:12px 0 0;
                ">
                    Zelle Recipient:
                    <strong>CLUBHOUSE LINKS</strong>
                </p>

                <p style="
                    font-size:13px;
                    color:#000000;
                    margin:4px 0 0;
                ">
                    Zelle Tag:
                    <strong>clubhouse-links</strong>
                </p>

                <p style="
                    font-size:12px;
                    color:#000000;
                    margin:18px 0 0;
                ">
                    Please include your company name
                    in the payment memo.
                </p>

            </div>

            <p style="color:#000000;">
                Once payment is received, I'll finalize
                your account activation, configure your
                automotive service categories, and begin
                identifying relevant customer opportunities
                for Antonio's Mobile Dent Repair.
            </p>

            <p style="color:#000000;">
                Looking forward to working together!
            </p>

            <p style="color:#000000;">
                Best regards,<br>
                <strong>Evan Ligon</strong><br>
                Clubhouse Links<br>
                (214) 548-9175<br>
                <a
                    href="mailto:evan.ligon@clubhouselinks.com"
                    style="color:#000000;"
                >
                    evan.ligon@clubhouselinks.com
                </a><br>
                <a
                    href="https://www.clubhouselinks.com"
                    style="color:#000000;"
                >
                    www.clubhouselinks.com
                </a>
            </p>

        </div>
    `,

    attachments: [
        {
            filename: "zelle.png",
            path: path.join(__dirname, "zelle.png"),
            cid: "clubhouse-zelle",
            contentType: "image/png",
            contentDisposition: "inline"
        }
    ]
};
