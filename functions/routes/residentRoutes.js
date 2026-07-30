// routes/hoaResidentRoutes.js
const express = require("express");

const router = express.Router();

const {
    validateInviteCode,
    signupResident,
    verifyResidentSms,
    getPendingResidents,
    approveResident,
    getResidentProfile,
    getVendors,
    deleteResidentAccount,
    registerResidentDevice,
    loginResident,
    getAddress,
    getAddressAutoComplete,
    getCompletedProjects,
    sendPhoneVerification,
    checkPhoneVerification,
    submitCompletedProject,
    updateResidentAddress
} = require(
    "../controllers/residentController"
);

const {
    submitServiceRequest,
    getResidentServiceRequests
} = require(
    "../controllers/serviceRequestController"
);

router.post(
    "/validate-invite-code",
    validateInviteCode
);

router.post(
    "/signup",
    signupResident
);

router.post(
    "/verify-sms",
    verifyResidentSms
);

router.get(
    "/pending",
    getPendingResidents
);

router.post(
    "/approve/:residentId",
    approveResident
);

router.get(
    "/profile/:residentId",
    getResidentProfile
);

router.get(
    "/vendors/:residentId",
    getVendors
);

router.post(
    "/login",
    loginResident
);

router.post(
    "/address-lookup",
    getAddress
);

router.post(
    "/address-autocomplete",
    getAddressAutoComplete
);

router.get(
    "/completed-projects/:residentId",
    getCompletedProjects
);

router.post(
    "/delete-account",
    deleteResidentAccount
);

router.post(
    "/completed-projects",
    submitCompletedProject
);

router.post(
    "/:residentId/devices",
    registerResidentDevice
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

/*
 * Resident service-request history.
 */
router.get(
    "/:residentId/service-requests",
    getResidentServiceRequests
);

/*
 * Resident service-request submission.
 */
router.post(
    "/:residentId/service-requests",
    submitServiceRequest
);

module.exports = router;
