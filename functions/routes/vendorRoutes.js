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
    getVendorCompletedProjects
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
module.exports = router;
