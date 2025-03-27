const pool = require('../db/db');
const { encryptPassword, decryptPassword } = require('../utils/authEncryption'); // Import the encryption utilities

// Create or update SMTP settings
exports.createOrUpdateSMTPSettings = async (req, res) => {
    const { userId, smtp_host, smtp_port, smtp_username, smtp_password, tls_enabled } = req.body;

    try {
        // Encrypt the password before storing it
        const encryptedPassword = encryptPassword(smtp_password);  // Use the utility function

        // Check if the user already has SMTP settings
        const existingSettings = await pool.query('SELECT * FROM user_smtp_settings WHERE user_id = $1', [userId]);

        if (existingSettings.rows.length > 0) {
            // Update existing settings
            await pool.query(
                `UPDATE user_smtp_settings 
                 SET smtp_host = $1, smtp_port = $2, smtp_username = $3, smtp_password = $4, tls_enabled = $5, updated_at = NOW()
                 WHERE user_id = $6`,
                [smtp_host, smtp_port, smtp_username, encryptedPassword, tls_enabled, userId]
            );
            res.status(200).json({ message: 'SMTP settings updated' });
        } else {
            // Insert new settings
            await pool.query(
                `INSERT INTO user_smtp_settings (user_id, smtp_host, smtp_port, smtp_username, smtp_password, tls_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, smtp_host, smtp_port, smtp_username, encryptedPassword, tls_enabled]
            );
            res.status(201).json({ message: 'SMTP settings created' });
        }
    } catch (error) {
        console.error('Error managing SMTP settings:', error);
        res.status(500).json({ error: 'Failed to manage SMTP settings' });
    }
};

// Get SMTP settings for a user
exports.getSMTPSettingsByUserId = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query('SELECT * FROM user_smtp_settings WHERE user_id = $1', [userId]);

        if (result.rows.length > 0) {
            const smtpSettings = result.rows[0];
            smtpSettings.smtp_password = decryptPassword(smtpSettings.smtp_password);  // Use the utility function

            res.status(200).json(smtpSettings);
        } else {
            res.status(404).json({ message: 'No SMTP settings found for this user' });
        }
    } catch (error) {
        console.error('Error fetching SMTP settings:', error);
        res.status(500).json({ error: 'Failed to fetch SMTP settings' });
    }
};
