const crypto = require('crypto');

// Define a static encryption key (32 bytes for AES-256). Example here uses a 32-byte hexadecimal string.
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'); // 64 hex characters
// 32 bytes (256-bit key)

// Validate the key length to ensure it's correct
console.log("ENCRYPTION_KEY length:", ENCRYPTION_KEY.length);  // Should log 32 for AES-256

const IV_LENGTH = 16; // AES block size for initialization vector

// Encrypt function with random IV
const encryptPassword = (password) => {
    const iv = crypto.randomBytes(IV_LENGTH); // Random IV for each encryption
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Store IV and encrypted password together
};

// Decrypt function


const decryptPassword = (encryptedPassword) => {
    try {
        // Split the encrypted password into IV and encrypted text
        const [ivHex, encryptedTextHex] = encryptedPassword.split(':');
        if (!ivHex || !encryptedTextHex) throw new Error("Invalid encrypted password format");

        // Convert IV from hex to buffer
        const iv = Buffer.from(ivHex, 'hex');
        console.log('IV Hex:', ivHex);
        console.log('Encrypted Text:', encryptedTextHex);
        console.log('IV Buffer Length:', iv.length); // Should be 16 for AES-256-CBC

        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

        // Perform decryption directly using encryptedTextHex
        let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        console.log('Decrypted Text:', decrypted); // Log the decrypted text
        return decrypted; // Return the decrypted text
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return null; // Return null or handle the error as needed
    }
};



module.exports = {
    encryptPassword,
    decryptPassword
};
