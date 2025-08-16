const express = require('express');
const router = express.Router();
const nextDoorController = require('../controllers/nextDoorController');

// ✅ Test route to verify routing
router.get('/test', (req, res) => {
    res.send('✅ IonWave test route working');
});

// Your actual route
router.get('/leads/:userId', nextDoorController.getNextDoorLeads);

module.exports = router;
