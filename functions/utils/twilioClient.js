// /server/crm_function/utils/twilioClient.js

const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Original toll-free messaging service

const messagingServiceSid = process.env.TWILIO_TEXAS_MESSAGING_SERVICE_SID;

// NEW Texas local messaging service

const texasMessagingServiceSid =  process.env.TWILIO_MESSAGING_SERVICE_SID;

// Safety checks — these will show up in logs if something is missing
if (!accountSid) console.error("❌ Missing TWILIO_ACCOUNT_SID in environment variables");
if (!authToken) console.error("❌ Missing TWILIO_AUTH_TOKEN in environment variables");
if (!messagingServiceSid) console.error("❌ Missing TWILIO_MESSAGING_SERVICE_SID (toll-free)");
if (!texasMessagingServiceSid) console.error("❌ Missing TWILIO_TEXAS_MESSAGING_SERVICE_SID (local Texas)");

const client = twilio(accountSid, authToken);

module.exports = {
    client,
    messagingServiceSid,        // Existing toll-free service
    texasMessagingServiceSid    // New Texas local service
};
