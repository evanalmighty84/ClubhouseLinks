// routes/hoaResidentRoutes.js
const express = require('express');
const router = express.Router();

const {
    submitServiceRequest
} = require(
    '../controllers/serviceRequestController'
);

router.post(
    '/:residentId/service-requests',
    submitServiceRequest
);
