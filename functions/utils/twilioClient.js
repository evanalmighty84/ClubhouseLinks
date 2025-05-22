// /server/crm_function/utils/twilioClient.js
const twilio = require('twilio');
require('dotenv').config(); // Ensure this is called if it's not already in your main app

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SID;

const client = twilio(accountSid, authToken);

module.exports = { client, messagingServiceSid };
