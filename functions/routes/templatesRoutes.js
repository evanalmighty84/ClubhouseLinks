const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templatesController');

// Route to create or update a template


router.post('/thankyou', templatesController.sendThankYouTemplate);
router.post('/send-thank-you-form-terri', templatesController.sendHardcodedFormThankYou);
router.post('/send-thank-you-form-john', templatesController.sendGoogleFormJohn);

router.post('/create', templatesController.createOrUpdateTemplate);

// Route to update a specific template by ID
router.get('/user/:userId', templatesController.getUserTemplates);

router.get('/', templatesController.getCategoryTemplate);

// Route to fetch all templates
router.get('/all', templatesController.getAllTemplates);

// Route to fetch a single template by ID
router.get('/:id', templatesController.getTemplateById);

module.exports = router;
