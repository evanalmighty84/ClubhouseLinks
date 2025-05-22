const { encryptPassword, decryptPassword } = require('../utils/encryption');
const pool = require('../db/db');

exports.updateUserSettings = async (req, res) => {
    const { userId, industry, currentPassword, newPassword } = req.body;

    try {
        // Fetch the user from the database
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify if the provided current password matches the decrypted password
        const decryptedCurrentPassword = decryptPassword(user.password_hash);
        if (decryptedCurrentPassword !== currentPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Encrypt the new password if provided
        let passwordHash = user.password_hash;
        if (newPassword && newPassword.trim()) {
            passwordHash = encryptPassword(newPassword); // Encrypt the new password with AES
        }

        // Log values before updating
        console.log('Updating user with ID:', userId);
        console.log('New industry:', industry);
        console.log('New encrypted password hash:', passwordHash);

        // Update the industry and password in the database
        const updateResult = await pool.query(
            `UPDATE users SET industry = $1, password_hash = $2 WHERE id = $3 RETURNING industry`,
            [industry, passwordHash, userId]
        );

        // Check the update result to verify the change
        console.log('Update result:', updateResult.rows[0]);

        res.status(200).json({ message: 'User settings updated successfully!' });
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
