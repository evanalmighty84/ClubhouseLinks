const express = require('express');
const router = express.Router();
const ScheduledWorkflowEvents = require('../controllers/workflowController');

// Route to fetch scheduled workflow events
router.get('/scheduled-workflows', ScheduledWorkflowEvents.getScheduledWorkflowEvents);

module.exports = router;
