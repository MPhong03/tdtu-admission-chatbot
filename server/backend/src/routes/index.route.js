const express = require("express");
const authRoutes = require("./auth.route");
const elasticRoutes = require("./elastic.route");
const reasoningRoutes = require("./reasoning.route");
const importRoutes = require("./import.route");
const chatbotRoutes = require("./chatbot.route");
const chatRoutes = require("./chat.route");
const folderRoutes = require("./folder.route");
const historyRoutes = require("./history.route");
const statisticRoutes = require("./statistic.route");
const userRoutes = require("./user.route");
const commonRoutes = require("./common.route");
// Config routes here

const router = express.Router();

// Sub-route
router.use("/auth", authRoutes);
router.use("/elastics", elasticRoutes);
// router.use("/reasoning", reasoningRoutes);
router.use("/import", importRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/chats", chatRoutes);
router.use("/folders", folderRoutes);
router.use("/histories", historyRoutes);
router.use("/statistics", statisticRoutes);
router.use("/users", userRoutes);
router.use("/systemconfigs", commonRoutes);
//...

module.exports = router;
