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
    getVendors,deleteResidentAccount,
    loginResident, getAddress,getAddressAutoComplete,getCompletedProjects,sendPhoneVerification,checkPhoneVerification,submitCompletedProject,updateResidentAddress
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
    "/residents/delete-account",
    deleteResidentAccount
);
router.post(
    "/completed-projects",
    submitCompletedProject
);
router.patch(
    "/profile/:residentId/address",
    updateResidentAddress
);
router.post(
    "/send-verification",
    sendPhoneVerification
);

router.post(
    "/check-verification",
    checkPhoneVerification
);

    module.exports = router;