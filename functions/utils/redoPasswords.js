const pool = require('../db/db');
const { encryptPassword, decryptPassword } = require('./encryption');


// Connect to the PostgreSQL database


async function reencryptPasswords() {
    try {
        // Fetch all users and their password hashes
        const users = await pool.query('SELECT id, password_hash FROM users');

        for (const user of users.rows) {
            const { id, password_hash } = user;

            // Check if password_hash already has an IV (AES format "iv:encryptedText")
            if (password_hash.includes(':')) {
                console.log(`User ID ${id} already has AES-encrypted password. Skipping.`);
                continue;
            }

            console.log(`Re-encrypting password for User ID ${id}...`);

            // Step 1.1: Assume password is bcrypt hashed. Here, you could decrypt if needed.
            // For bcrypt, decryption isn't possible, so skip to Step 1.2 below if necessary.

            // Step 1.2: Re-encrypt using AES
            const newEncryptedPassword = encryptPassword(password_hash);

            // Update the database with the new AES-encrypted password
            await pool.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                [newEncryptedPassword, id]
            );

            console.log(`User ID ${id} password re-encrypted successfully.`);
        }

        console.log('Password re-encryption complete.');
    } catch (error) {
        console.error('Error re-encrypting passwords:', error);
    } finally {
        pool.end();
    }
}

reencryptPasswords();
