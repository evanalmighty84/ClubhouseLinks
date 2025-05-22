const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// Route for uploading images
router.post('/', uploadController.uploadImage);

module.exports = router;
