const express = require('express');
const router = express.Router();
const contactUsController = require('../controllers/contactUsController');


console.log('ContactUsRoutes initilized')
// Create a new campaign
router.post('/getInfo', contactUsController.createEmail);

module.exports = router; // Export the router