const express = require('express');
const router = express.Router();
const appointmentSalesCallsController = require('../controllers/AppointmentSalesCallsController');

// Create a new campaign
router.post('/create', appointmentSalesCallsController.createAppointmentSalesCall );