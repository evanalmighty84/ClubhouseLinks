const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');

// Create a new list
router.post('/create', listController.createList);

// Get all lists
router.get('/', listController.getAllLists);

router.get('/scheduled-subscribers', listController.getScheduledSubscribers);
// Get list by ID
router.get('/:id', listController.getListById);
// Get lists by user ID
router.get('/user/:userId', listController.getListsByUserId);

// Update a list
router.put('/:id', listController.updateList);

// Delete a list
router.delete('/:id', listController.deleteList);

router.get('/:id/subscribers', listController.getSubscribersForList);




module.exports = router;
