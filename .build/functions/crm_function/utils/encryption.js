const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env
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

// I have two encryption keys, the .env one is for my first users, the Encryption fallback is for newer users

const ENCRYPTION_KEY_FALLBACK = Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex'); // 64 hex characters (32 bytes)

const decryptPassword = (encryptedData) => {
    const tryDecrypt = (encryptionKey) => {
        try {
            console.log('Attempting decryption with key length:', encryptionKey.length);

            if (encryptionKey.length !== 32) {
                throw new Error('Invalid key length. ENCRYPTION_KEY must be 32 bytes.');
            }

            const [ivHex, encryptedText] = encryptedData.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const encryptedBuffer = Buffer.from(encryptedText, 'hex');

            console.log('IV Hex:', ivHex);
            console.log('Encrypted Text:', encryptedText);
            console.log('IV Buffer Length:', iv.length);
            console.log('Encrypted Buffer Length:', encryptedBuffer.length);

            const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
            let decrypted = decipher.update(encryptedBuffer);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            console.log('Decryption successful:', decrypted.toString());
            return decrypted.toString();
        } catch (error) {
            console.error('Decryption failed with this key:', error.message);
            return null; // Return null if decryption fails
        }
    };

    // Try decryption with the primary key
    let encryptionKeyPrimary = null;
    if (process.env.ENCRYPTION_KEY) {
        encryptionKeyPrimary = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
    }

    let decryptedPassword = encryptionKeyPrimary ? tryDecrypt(encryptionKeyPrimary) : null;

    // If primary decryption fails, try fallback key
    if (!decryptedPassword) {
        decryptedPassword = tryDecrypt(ENCRYPTION_KEY_FALLBACK);
    }

    if (!decryptedPassword) {
        throw new Error('Failed to decrypt password with both keys.');
    }

    return decryptedPassword;
};

module.exports = decryptPassword;









module.exports = {
    encryptPassword,
    decryptPassword
};
