// /server/crm_function/utils/twilioClient.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID; // Optional if using Messaging Service

const client = twilio(accountSid, authToken);

module.exports = client;
