const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route for uploading images
router.post('/update-settings', userController.updateUserSettings);
router.get('/industries', userController.getIndustries);
router.get('/:id/industries', userController.getUserIndustries);


module.exports = router;
