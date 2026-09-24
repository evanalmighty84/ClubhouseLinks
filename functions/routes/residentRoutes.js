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
    updateResidentAddress,
    getResidentHomeMode,
    getStreetFairVendors,
    getResidentEvents,
    createNeighborContactRequest,
    getNeighborContactRequests,
    respondToNeighborContactRequest
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
    "/events/:residentId",
    getResidentEvents
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

router.get(
    "/profile/:residentId/home-mode",
    getResidentHomeMode
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
router.get(
    "/:residentId/street-fair/vendors",
    getStreetFairVendors
);
/*
 * Neighbor-to-neighbor vendor reference requests.
 *
 * Example:
 *
 * POST
 * /api/residents/925/neighbor-contact-requests
 *
 * GET
 * /api/residents/925/neighbor-contact-requests
 *
 * PATCH
 * /api/residents/960/neighbor-contact-requests/12/respond
 */


router.post(
    "/:residentId/neighbor-contact-requests",
    createNeighborContactRequest
);


router.get(
    "/:residentId/neighbor-contact-requests",
    getNeighborContactRequests
);


router.patch(
    "/:residentId/neighbor-contact-requests/:requestId/respond",
    respondToNeighborContactRequest
);




module.exports = router;
