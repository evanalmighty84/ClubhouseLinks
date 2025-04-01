const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route for uploading images
router.post('/update-settings', userController.updateUserSettings);

module.exports = router;
