const express = require("express");
const authRoutes = require("./auth.route");
const elasticRoutes = require("./elastic.route");
const reasoningRoutes = require("./reasoning.route");
const importRoutes = require("./import.route");
// Config routes here

const router = express.Router();

// Sub-route
router.use("/auth", authRoutes);
router.use("/elastic", elasticRoutes);
router.use("/reasoning", reasoningRoutes);
router.use("/import", importRoutes);
//...

module.exports = router;
