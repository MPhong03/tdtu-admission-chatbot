const express = require("express");
const multer = require("multer");
const Neo4jController = require("../controllers/neo4j.controller");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Import data từ json crawl về
router.post(
  "/",
  upload.fields([
    { name: "tdtu_majors", maxCount: 1 },
    { name: "details", maxCount: 1000 },
  ]),
  Neo4jController.importFromFiles
);

module.exports = router;
