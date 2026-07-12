const nodemailer = require("nodemailer");

const zeptoTransport = nodemailer.createTransport({
    host: process.env.ZEPTOMAIL_SMTP_HOST,
    port: Number(process.env.ZEPTOMAIL_SMTP_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.ZEPTOMAIL_SMTP_USER,
        pass: process.env.ZEPTOMAIL_SMTP_PASSWORD,
    },
    tls: {
        minVersion: "TLSv1.2",
    },
});

module.exports = zeptoTransport;