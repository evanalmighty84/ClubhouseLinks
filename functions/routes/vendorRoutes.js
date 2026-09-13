const express = require('express');
const router = express.Router();

const {
    loginVendor,
    getVendorProfile,
    registerVendorDevice,
    unregisterVendorDevice,
    getVendorServiceRequests,
    getVendorServiceRequest,
    markVendorServiceRequestViewed,
    updateVendorServiceRequestStatus,
    getVendorCompletedProjects,
    updateVendorLogo,
    switchSupportResident,
    clearSupportResident,
    searchSupportResidents
} = require('../controllers/vendorController');

/*
 * This router is intended to be mounted at:
 *
 * /server/resident_function/api/vendors
 */

router.post(
    '/login',
    loginVendor
);

router.get(
    '/:vendorId/profile',
    getVendorProfile
);

router.post(
    '/:vendorId/devices',
    registerVendorDevice
);
router.post(
    "/:vendorId/support-residents/search",
    searchSupportResidents
);
router.post(
    "/:vendorId/support-resident",
    switchSupportResident
);

router.delete(
    "/:vendorId/support-resident",
    clearSupportResident
);

router.delete(
    '/:vendorId/devices',
    unregisterVendorDevice
);

router.get(
    '/:vendorId/service-requests',
    getVendorServiceRequests
);

router.get(
    '/:vendorId/service-requests/:requestId',
    getVendorServiceRequest
);

router.patch(
    '/:vendorId/service-requests/:requestId/viewed',
    markVendorServiceRequestViewed
);

router.patch(
    '/:vendorId/service-requests/:requestId/status',
    updateVendorServiceRequestStatus
);


router.get(
    "/:vendorId/completed-projects",
    getVendorCompletedProjects
);
router.patch(
    "/:vendorId/logo",
    updateVendorLogo
);
module.exports = router;
