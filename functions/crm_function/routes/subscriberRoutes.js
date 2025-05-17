const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');

// Get all subscribers for a specific user
router.get('/user/:userId', subscriberController.getSubscribersByUserId);

// Get a single subscriber by ID
router.get('/:id', subscriberController.getSubscriberById);

// Create a new subscriber
router.post('/create', subscriberController.createSubscriber);

// Update a subscriber
router.put('/:id', subscriberController.updateSubscriber);

// Delete a subscriber
router.delete('/:id', subscriberController.deleteSubscriber);

// Route to get lists for a specific subscriber
router.get('/:id/lists', subscriberController.getSubscriberLists);

router.post('/schedule', subscriberController.scheduleSubscribers);

router.put('/:id/unschedule', subscriberController.unscheduleEvent);

router.put( '/:id/notes',subscriberController.editNotes);




router.get('/:subscriberId/queued-emails', subscriberController.getQueuedEmailsForSubscriber);



module.exports = router;
