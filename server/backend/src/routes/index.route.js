const express = require("express");
const authRoutes = require("./auth.route");
// Config routes here

const router = express.Router();

// Sub-route
router.use("/auth", authRoutes);
//...

module.exports = router;
