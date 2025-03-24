const express = require("express");
const authRoutes = require("./auth.route");
const elasticRoutes = require("./elastic.route");
// Config routes here

const router = express.Router();

// Sub-route
router.use("/auth", authRoutes);
router.use("/elastic", elasticRoutes);
//...

module.exports = router;
