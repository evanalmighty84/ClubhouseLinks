import React from "react";

/**
 * PrivacyPolicy.jsx
 * Drop this into your React app (e.g., /src/pages/PrivacyPolicy.jsx)
 * Then add a route like: /privacy-policy
 *
 * Not legal advice—this is a practical, Twilio/A2P-friendly privacy policy template.
 */

const PrivacyPolicy = () => {
    const lastUpdated = "June 10, 2026";

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>Privacy Policy</h1>
                <div style={styles.subtitle}>
                    <span>Clubhouse Links</span>
                    <span style={styles.dot}>•</span>
                    <span>Last updated: {lastUpdated}</span>
                </div>
            </div>

            <div style={styles.card}>
                <p style={styles.p}>
                    This Privacy Policy explains how <strong>Clubhouse Links</strong> (“we”, “us”, “our”) collects,
                    uses, discloses, and safeguards information when you visit our website, use our services, or
                    communicate with us by email, phone, or SMS/text message (the “Services”).
                </p>

                <div style={styles.notice}>
                    <div style={styles.noticeTitle}>SMS Privacy & Consent (A2P/10DLC)</div>
                    <p style={styles.p}>
                        If you provide your phone number and opt in to receive text messages, you consent to receive
                        SMS messages from Clubhouse Links related to our Services (including lead alerts, account
                        notifications, scheduling, and support). <strong>Message and data rates may apply.</strong>
                    </p>
                    <ul style={styles.ul}>
                        <li style={styles.li}>
                            <strong>Opt-out:</strong> Reply <strong>STOP</strong> to unsubscribe at any time.
                        </li>
                        <li style={styles.li}>
                            <strong>Help:</strong> Reply <strong>HELP</strong> for help or contact us using the details below.
                        </li>
                        <li style={styles.li}>
                            <strong>Consent:</strong> SMS consent is not a condition of purchase.
                        </li>
                    </ul>
                    <p style={styles.p}>
                        <strong>We do not sell or share your phone number with third parties for their marketing purposes.</strong>
                    </p>
                </div>

                <h2 style={styles.h2}>1) Information We Collect</h2>
                <p style={styles.p}>We may collect the following categories of information:</p>
                <ul style={styles.ul}>
                    <li style={styles.li}>
                        <strong>Contact information:</strong> name, email address, phone number, business/company name.
                    </li>
                    <li style={styles.li}>
                        <strong>Account information:</strong> login credentials and profile details you provide.
                    </li>
                    <li style={styles.li}>
                        <strong>Communication data:</strong> the content of messages you send us (including SMS messages),
                        and metadata such as timestamps and delivery status.
                    </li>
                    <li style={styles.li}>
                        <strong>Service/lead data:</strong> information related to leads you receive or manage in the platform
                        (e.g., city/area, service category, notes).
                    </li>
                    <li style={styles.li}>
                        <strong>Usage & device data:</strong> IP address, browser type, device identifiers, pages viewed, and
                        interactions with our site/app (as available).
                    </li>
                </ul>

                <h2 style={styles.h2}>2) How We Use Your Information</h2>
                <p style={styles.p}>We use information to:</p>
                <ul style={styles.ul}>
                    <li style={styles.li}>Provide, operate, and maintain the Services.</li>
                    <li style={styles.li}>Send service-related communications (including SMS, email, and phone calls).</li>
                    <li style={styles.li}>Deliver lead alerts, updates, reminders, and scheduling notifications.</li>
                    <li style={styles.li}>Respond to inquiries and provide customer support.</li>
                    <li style={styles.li}>Improve our Services, troubleshoot issues, and analyze performance.</li>
                    <li style={styles.li}>Prevent fraud, enforce our terms, and comply with legal obligations.</li>
                </ul>

                <h2 style={styles.h2}>3) SMS/Text Messaging Details</h2>
                <p style={styles.p}>
                    If you opt in to receive text messages from Clubhouse Links, we may send messages such as:
                    lead notifications (e.g., “You have a new lead in Plano, TX”), scheduling prompts (e.g., “Would 9:00 or
                    12:00 work best?”), account/security notices, and support responses.
                </p>
                <p style={styles.p}>
                    <strong>Opt-out at any time</strong> by replying <strong>STOP</strong>. After you opt out, you may receive
                    a final confirmation message. If you need assistance, reply <strong>HELP</strong>.
                </p>

                <h2 style={styles.h2}>4) Sharing and Disclosure of Information</h2>
                <p style={styles.p}>
                    We may share information in the following circumstances:
                </p>
                <ul style={styles.ul}>
                    <li style={styles.li}>
                        <strong>Service providers:</strong> We use trusted vendors to help operate the Services (e.g., SMS
                        delivery providers like Twilio, email delivery, hosting). These providers process information only
                        to perform services on our behalf.
                    </li>
                    <li style={styles.li}>
                        <strong>Legal requirements:</strong> If required by law or to protect rights, safety, and security.
                    </li>
                    <li style={styles.li}>
                        <strong>Business transfers:</strong> In connection with a merger, sale, or asset transfer.
                    </li>
                </ul>
                <p style={styles.p}>
                    <strong>We do not sell personal information.</strong> Specifically, we do not sell or share phone numbers
                    for third-party marketing.
                </p>

                <h2 style={styles.h2}>5) Cookies and Tracking</h2>
                <p style={styles.p}>
                    We may use cookies and similar technologies to remember preferences, understand usage, and improve the
                    Services. You can control cookies through your browser settings.
                </p>

                <h2 style={styles.h2}>6) Data Retention</h2>
                <p style={styles.p}>
                    We retain personal information only as long as necessary to provide the Services, comply with legal
                    obligations, resolve disputes, and enforce agreements. SMS logs and delivery metadata may be retained
                    for operational and compliance purposes.
                </p>

                <h2 style={styles.h2}>7) Data Security</h2>
                <p style={styles.p}>
                    We implement reasonable administrative, technical, and physical safeguards designed to protect your
                    information. However, no method of transmission or storage is 100% secure.
                </p>

                <h2 style={styles.h2}>8) Your Choices and Rights</h2>
                <ul style={styles.ul}>
                    <li style={styles.li}>
                        <strong>Opt out of SMS:</strong> Reply <strong>STOP</strong>.
                    </li>
                    <li style={styles.li}>
                        <strong>Update your information:</strong> Contact us to correct or update your account details.
                    </li>
                    <li style={styles.li}>
                        <strong>Access/Deletion requests:</strong> You may request access to or deletion of your personal
                        information, subject to legal and operational limitations.
                    </li>
                </ul>

                <h2 style={styles.h2}>9) Children’s Privacy</h2>
                <p style={styles.p}>
                    Our Services are not intended for children under 13, and we do not knowingly collect personal
                    information from children under 13.
                </p>

                <h2 style={styles.h2}>10) Changes to This Policy</h2>
                <p style={styles.p}>
                    We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised
                    “Last updated” date.
                </p>

                <h2 style={styles.h2}>11) Contact Us</h2>
                <div style={styles.contactBox}>
                    <p style={styles.p}>
                        If you have questions about this Privacy Policy or our privacy practices, contact us:
                    </p>
                    <ul style={styles.ul}>
                        <li style={styles.li}>
                            <strong>Company:</strong> Clubhouse Links
                        </li>
                        <li style={styles.li}>
                            <strong>Email:</strong> <a style={styles.link} href="mailto:evanligon7@gmail.com">evanligon7@gmail.com</a>
                        </li>
                        <li style={styles.li}>
                            <strong>Phone:</strong> <a style={styles.link} href="tel:+14699032836">+1 (469) 903-2836</a>
                        </li>
                        <li style={styles.li}>
                            <strong>Website:</strong> <span style={styles.muted}>https://www.clubhouselinks.com</span>
                        </li>
                    </ul>
                    <p style={styles.smallMuted}>
                        If you are reaching out about SMS, include your phone number and the word “SMS” so we can help faster.
                    </p>
                </div>
            </div>

            <div style={styles.footer}>
                <div style={styles.footerBar} />
                <div style={styles.footerText}>
                    © {new Date().getFullYear()} Clubhouse Links. All rights reserved.
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: {
        minHeight: "100vh",
        padding: "40px 16px",
        background: "linear-gradient(to right, black, steelblue, #ff0080, black)",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    },
    header: {
        maxWidth: 980,
        margin: "0 auto 18px",
        padding: "18px 18px",
        borderRadius: 16,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
    },
    title: {
        margin: 0,
        fontSize: 36,
        letterSpacing: 0.3,
    },
    subtitle: {
        marginTop: 8,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        color: "rgba(255,255,255,0.85)",
        fontSize: 14,
    },
    dot: { opacity: 0.6 },
    card: {
        maxWidth: 980,
        margin: "0 auto",
        padding: "22px 20px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.94)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
        border: "1px solid rgba(0,0,0,0.08)",
    },
    notice: {
        padding: "14px 14px",
        borderRadius: 14,
        background: "rgba(70,130,180,0.10)", // steelblue tint
        border: "1px solid rgba(70,130,180,0.25)",
        margin: "14px 0 18px",
    },
    noticeTitle: {
        fontWeight: 800,
        color: "#0b2540",
        marginBottom: 6,
    },
    h2: {
        marginTop: 18,
        marginBottom: 8,
        fontSize: 18,
        color: "#0b2540",
    },
    p: {
        margin: "10px 0",
        color: "#0f172a",
        lineHeight: 1.7,
        fontSize: 15,
    },
    ul: {
        margin: "10px 0 10px 20px",
        padding: 0,
        color: "#0f172a",
        lineHeight: 1.7,
        fontSize: 15,
    },
    li: { margin: "6px 0" },
    contactBox: {
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(255, 0, 128, 0.06)", // pink tint
        border: "1px solid rgba(255, 0, 128, 0.18)",
    },
    link: {
        color: "#0b5cab",
        textDecoration: "underline",
    },
    muted: {
        color: "rgba(15,23,42,0.75)",
    },
    smallMuted: {
        marginTop: 10,
        fontSize: 12,
        color: "rgba(15,23,42,0.7)",
        lineHeight: 1.6,
    },
    footer: {
        maxWidth: 980,
        margin: "16px auto 0",
        padding: "10px 6px",
    },
    footerBar: {
        height: 1,
        background: "rgba(255,255,255,0.25)",
        marginBottom: 10,
    },
    footerText: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 12,
        textAlign: "center",
    },
};

export default PrivacyPolicy;
