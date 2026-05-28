const express = require("express");
const router = express.Router();

const hoaController = require("../controllers/hoaController");

router.get("/parties", hoaController.getHOAParties);
router.post("/guest-signup", hoaController.createGuestSignup);
router.post("/provider-signup", hoaController.createProviderSignup);
router.post("/create-provider-checkout", hoaController.createProviderCheckout);
router.get("/parties/:partyId/reserved-categories", hoaController.getReservedCategories);

module.exports = router;