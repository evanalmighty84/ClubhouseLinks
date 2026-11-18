// routes/hoaBoardMemberRoutes.js

"use strict";

const express = require("express");

const router = express.Router();

const {
    getEvents,
    createEvent
} = require(
    "../controllers/hoaBoardMemberController"
);


/*
 * HOA BOARD MEMBER EVENTS
 *
 * These routes are intentionally separate from
 * normal resident event routes because these
 * endpoints allow privileged HOA actions.
 *
 * The controller is responsible for verifying:
 *
 * hoa_residents.id = :residentId
 * AND
 * board_of_directors = TRUE
 *
 * The neighborhood must always be derived from
 * the authorized resident's neighborhood_id.
 */


/*
 * GET
 * /api/hoa-members/:residentId/events
 *
 * Returns events belonging to the HOA board
 * member's neighborhood.
 */
router.get(
    "/:residentId/events",
    getEvents
);


/*
 * POST
 * /api/hoa-members/:residentId/events
 *
 * Creates and publishes a neighborhood event.
 *
 * Expected body:
 *
 * {
 *     title,
 *     description,
 *     address,
 *     starts_at,
 *     ends_at,
 *     image_base64,
 *     publish
 * }
 */
router.post(
    "/:residentId/events",
    createEvent
);


// Privileged roster operations require a fresh SMS-verified board session.
// A board ID in the URL is NOT authorization; middleware validates bearer token,
// board role, and neighborhood at request time.
const roster = require('../controllers/hoaResidentManagementController');
const {rateLimit} = require('express-rate-limit');
const otpThrottle = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 5,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: {error: 'Too many verification requests. Try later.'}
});
router.post('/:boardId/resident-roster/session/start', otpThrottle, roster.beginSession);
router.post('/:boardId/resident-roster/session/verify', otpThrottle, roster.verifySession);
router.get('/:boardId/resident-roster', roster.requireBoardSession, roster.listResidents);
router.post('/:boardId/resident-roster', roster.requireBoardSession, roster.createResident);
router.post('/:boardId/resident-roster/extract', roster.requireBoardSession, roster.extractDirectory);
router.post('/:boardId/resident-roster/import', roster.requireBoardSession, roster.importDirectory);
router.patch('/:boardId/resident-roster/:targetId',
    roster.requireBoardSession, roster.updateResident);

module.exports = router;