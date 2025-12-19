const crypto = require("crypto");

// MUST MATCH YOUR AUTH FILE
const ENCRYPTION_KEY = Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex'
);

const IV_LENGTH = 16;

function encryptPassword(password) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

const password = "WashBroz24!";
const encryptedValue = encryptPassword(password);

console.log(encryptedValue);
