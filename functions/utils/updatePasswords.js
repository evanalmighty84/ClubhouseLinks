const { Pool } = require('pg');
const { encryptPassword } = require('./encryption'); // Update with the correct path to your encryption file
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
    user: process.env.DB_USER || 'u33njb102j0u34',  // Replace with your Heroku PostgreSQL username
    host: process.env.DB_HOST || 'cd27da2sn4hj7h.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',  // Replace with your Heroku PostgreSQL host
    database: process.env.DB_NAME || 'd65u30168cmrfd',  // Replace with your Heroku PostgreSQL database name
    password: process.env.DB_PASSWORD || 'p5b557ec255a19888a4da1ae53d1408d0167f02c01e289c9f74f54af2515419e8',  // Replace with your Heroku PostgreSQL password
    port: process.env.DB_PORT || 5432,  // PostgreSQL default port
    ssl: {
        rejectUnauthorized: false  // Important for Heroku SSL connections
    }
});

const updatePasswordForUser971 = async () => {
    try {
        const userId = 971;

        // Encrypt the new password
        const plainTextPassword = 'Godlovesme24!';
        const encryptedPassword = encryptPassword(plainTextPassword);
        console.log('Encrypted Password:', encryptedPassword);

        // Update ONLY user 974
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [encryptedPassword, userId]
        );

        if (result.rowCount === 0) {
            console.log('❌ No user found with id 974.');
        } else {
            console.log('✅ Password updated for user 974.');
        }

    } catch (error) {
        console.error('Error updating password for user 974:', error);
    } finally {
        await pool.end();
        console.log('Database connection closed.');
    }
};

// Run the script
updatePasswordForUser971();
