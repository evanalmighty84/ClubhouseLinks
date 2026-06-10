const { decryptPassword } = require('./encryption');

const testSmtpDecryption = () => {
    const encryptedSmtpPassword = "5fb23dbe50f35dea847373636faa927c:d262fc1fa5be73de30fccb14efed2108";

    try {
        console.log('Testing decryption with input:', encryptedSmtpPassword);
        const decryptedPassword = decryptPassword(encryptedSmtpPassword);
        console.log('Decrypted SMTP Password:', decryptedPassword);
    } catch (error) {
        console.error('Error during decryption test:', error.message);
    }
};

testSmtpDecryption();
