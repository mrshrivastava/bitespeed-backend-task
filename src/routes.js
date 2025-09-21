const express = require("express");
const router = express.Router();
const { identify } = require("./controllers/contactController");

router.post("/identify", identify);

module.exports = router;
