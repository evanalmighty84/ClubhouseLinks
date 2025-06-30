const express = require('express');
const router = express.Router();
const ionController = require('../controllers/ionController');

// ✅ Test route to verify routing
router.get('/test', (req, res) => {
    res.send('✅ IonWave test route working');
});

// Your actual route
router.get('/bids', ionController.getIonWaveBids);

module.exports = router;
