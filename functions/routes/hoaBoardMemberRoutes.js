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


module.exports = router;