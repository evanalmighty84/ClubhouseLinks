const express = require('express');

const router = express.Router();

const nextDoorController =
    require('../controllers/nextDoorController');


// ============================================================
// TEST
// ============================================================

router.get(
    '/test',
    (req, res) => {
        res.send(
            '✅ Nextdoor routes working'
        );
    }
);


// ============================================================
// EXISTING NEXTDOOR LEADS
// ============================================================

router.get(
    '/leads/:userId',
    nextDoorController.getNextDoorLeads
);


// ============================================================
// NEXTDOOR SEARCH CARRYOVER / RESUME QUEUE
// ============================================================

/*
 * Get unfinished terms for a particular scraper.
 *
 * Example:
 *
 * GET /nextdoor/search-queue/specialty
 *
 * GET /nextdoor/search-queue/combined
 *
 * GET /nextdoor/search-queue/general_contracting
 */

router.get(
    '/search-queue/:scraperKey',
    nextDoorController.getNextdoorSearchQueue
);


/*
 * Save the remaining execution plan when a scraper
 * encounters a confirmed Nextdoor throttle.
 *
 * POST /nextdoor/search-queue/throttled
 */

router.post(
    '/search-queue/throttled',
    nextDoorController.saveNextdoorThrottleQueue
);


/*
 * Clear carryover after the scraper successfully
 * finishes the ENTIRE execution plan.
 *
 * POST /nextdoor/search-queue/completed
 */

router.post(
    '/search-queue/completed',
    nextDoorController.completeNextdoorSearchQueue
);


module.exports = router;