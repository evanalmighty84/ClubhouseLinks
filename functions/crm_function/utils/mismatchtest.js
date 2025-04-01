const { decryptPassword } = require('./authEncryption');

const encryptedPassword = '718c4effc6bde3fd52d6c5a64cfd4c4f:19eade6c7d7318ab662de2379e9e863acf8d0b178ae69e5f4b2f884dd280e0f2';

const decrypted = decryptPassword(encryptedPassword);

console.log("Decrypted Password:", decrypted);
