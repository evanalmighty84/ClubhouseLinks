const sendCampaignEmail = async (to, subject, html, campaignId, subscriberId, userId) => {
    console.log('Sending campaign email using user-specific SMTP settings...');

    // Fetch user's SMTP settingOs
    const smtpSettings = await pool.query('SELECT * FROM user_smtp_settings WHERE user_id = $1', [userId]);
    if (smtpSettings.rows.length === 0) {
        throw new Error('No SMTP settings found for user');
    }

    const { smtp_host, smtp_port, smtp_username, smtp_password, tls_enabled } = smtpSettings.rows[0];

    const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: tls_enabled,  // Use TLS if enabled
        auth: {
            user: smtp_username,
            pass: smtp_password  // Store encrypted in DB, decrypt before use
        }
    });

    // Email content with tracking and unsubscribe logic
    const htmlWithTracking = `${html} ...`;  // Same logic for tracking pixel and unsubscribe link

    const mailOptions = {
        from: smtp_username,
        to,
        subject,
        html: htmlWithTracking,
        headers: {
            'X-Custom-Tracking-ID': `campaign-${campaignId}-subscriber-${subscriberId}`,
        }
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Campaign email sent successfully');
    } catch (error) {
        console.error('Error sending campaign email:', error);
        if (error.responseCode === 550 || error.responseCode === 554) {
            await logBounceEvent(campaignId, subscriberId, to, error.response);
        }
        throw new Error('Could not send campaign email');
    }
};
