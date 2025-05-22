const { decryptPassword } = require('./encryption');

const testSmtpDecryption = () => {
    const encryptedSmtpPassword = "32d2c1a80c87bcce8a5c981ad90028a5:2a37ea2d5612d1593c7a918a4c1decf4";

    try {
        console.log('Testing decryption with input:', encryptedSmtpPassword);
        const decryptedPassword = decryptPassword(encryptedSmtpPassword);
        console.log('Decrypted SMTP Password:', decryptedPassword);
    } catch (error) {
        console.error('Error during decryption test:', error.message);
    }
};

testSmtpDecryption();
