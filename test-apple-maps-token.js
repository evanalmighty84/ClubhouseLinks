const jwt = require("jsonwebtoken");

const keyId = process.env.APPLE_MAPS_KEY_ID;
const teamId = process.env.APPLE_TEAM_ID;
const privateKeyRaw = process.env.APPLE_MAPS_PRIVATE_KEY;
const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

const token = jwt.sign(
    {},
    privateKey,
    {
        algorithm: "ES256",
        issuer: teamId,
        expiresIn: "1h",
        keyid: keyId,
        header: {
            typ: "JWT",
            kid: keyId
        }
    }
);

console.log(token);
