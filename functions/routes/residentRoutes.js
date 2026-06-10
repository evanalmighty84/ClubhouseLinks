// routes/hoaResidentRoutes.js
const express = require('express');
const router = express.Router();

const {
    validateInviteCode,
    signupResident,
    verifyResidentSms,
    getPendingResidents,
    approveResident,
    getResidentProfile
} = require('../controllers/residentController');

router.post('/validate-invite-code', validateInviteCode);
router.post('/signup', signupResident);
router.post('/verify-sms', verifyResidentSms);
router.get('/pending', getPendingResidents);
router.post('/approve/:residentId', approveResident);
router.get('/profile/:residentId', getResidentProfile);

module.exports = router;