// routes/aiGeneratedCampaignsAndTemplates.js
const express = require('express');
const router = express.Router();
const AiGeneratedCampaignsAndTemplates = require('../controllers/aiGeneratedCampaignsAndTemplatesController');

router.post('/create', AiGeneratedCampaignsAndTemplates.getAiResponse);

module.exports = router;
