const express = require("express");
const authRoutes = require("./auth.route");
const elasticRoutes = require("./elastic.route");
const reasoningRoutes = require("./reasoning.route");
// const importRoutes = require("./import.route");
const chatbotRoutes = require("./chatbot.route");
const chatRoutes = require("./chat.route");
const folderRoutes = require("./folder.route");
const historyRoutes = require("./history.route");
const statisticRoutes = require("./statistic.route");
const userRoutes = require("./user.route");
const commonRoutes = require("./common.route");

// V2
const majorRoutes = require("./v2/major.route");
const programmeRoutes = require("./v2/programme.route");
const yearRoutes = require("./v2/year.route");
const tuitionRoutes = require("./v2/tuition.route");
const scholarshipRoutes = require("./v2/scholarship.route");
const documentRoutes = require("./v2/document.route");
const importRoutes = require("./v2/import.route");
const botRoutes = require("./v2/bot.route");

// Config routes here

const router = express.Router();

// Sub-route
router.use("/auth", authRoutes);
// router.use("/elastics", elasticRoutes);
// router.use("/reasoning", reasoningRoutes);
// router.use("/import", importRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/chats", chatRoutes);
router.use("/folders", folderRoutes);
router.use("/histories", historyRoutes);
router.use("/statistics", statisticRoutes);
router.use("/users", userRoutes);
router.use("/systemconfigs", commonRoutes);
//...

// V2
router.use("/v2/majors", majorRoutes);
router.use("/v2/programmes", programmeRoutes);
router.use("/v2/years", yearRoutes);
router.use("/v2/tuitions", tuitionRoutes);
router.use("/v2/scholarships", scholarshipRoutes);
router.use("/v2/documents", documentRoutes);
router.use("/v2/import", importRoutes);
router.use("/v2/bots", botRoutes);

module.exports = router;
