// /server/crm_function/routes/smsRoutes.js
const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

router.post('/send', smsController.sendSMS);

module.exports = router;
