// routes/hoaResidentRoutes.js
const express = require('express');
const router = express.Router();

const {
    validateInviteCode,
    signupResident,
    verifyResidentSms,
    getPendingResidents,
    approveResident,
    getResidentProfile,
    getVendors,
    loginResident, getAddress,getAddressAutoComplete,getCompletedProjects,sendPhoneVerification,checkPhoneVerification
} = require('../controllers/residentController');

router.post('/validate-invite-code', validateInviteCode);
router.post('/signup', signupResident);
router.post('/verify-sms', verifyResidentSms);
router.get('/pending', getPendingResidents);
router.post('/approve/:residentId', approveResident);
router.get('/profile/:residentId', getResidentProfile);
router.get( '/vendors/:residentId',getVendors);
router.post('/login', loginResident);
router.post("/address-lookup", getAddress);
router.post("/address-autocomplete", getAddressAutoComplete);
router.get("/completed-projects/:residentId", getCompletedProjects);
router.post(
    "/residents/send-verification",
    sendPhoneVerification
);

router.post(
    "/residents/check-verification",
    checkPhoneVerification
);

    module.exports = router;