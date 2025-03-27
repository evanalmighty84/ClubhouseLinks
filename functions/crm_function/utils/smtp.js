const pool = require('../db/db');

// Function to get user's SMTP settings from the database
const getUserSMTPSettings = async (userId) => {
    try {
        const result = await pool.query('SELECT * FROM user_smtp_settings WHERE user_id = $1', [userId]);

        if (result.rows.length === 0) {
            console.log(`No SMTP settings found for user ID ${userId}`);
            return null; // Return null if no SMTP settings are found
        }

        return result.rows[0];  // Return the SMTP settings object
    } catch (error) {
        console.error('Error retrieving SMTP settings:', error);
        throw new Error('Error retrieving SMTP settings');
    }
};

module.exports = {
    getUserSMTPSettings
};
