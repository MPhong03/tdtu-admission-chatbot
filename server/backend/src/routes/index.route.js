const express = require("express");
const authRoutes = require("./auth.route");
const elasticRoutes = require("./elastic.route");
const reasoningRoutes = require("./reasoning.route");
const importRoutes = require("./import.route");
const chatbotRoutes = require("./chatbot.route");
const chatRoutes = require("./chat.route");
const folderRoutes = require("./folder.route");
// Config routes here

const router = express.Router();

// Sub-route
router.use("/auth", authRoutes);
router.use("/elastic", elasticRoutes);
router.use("/reasoning", reasoningRoutes);
router.use("/import", importRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/chats", chatRoutes);
router.use("/folders", folderRoutes);
//...

module.exports = router;
