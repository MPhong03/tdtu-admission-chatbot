const express = require("express");
const multer = require("multer");
const path = require("path");
const ImportController = require("../../controllers/v2/import.controller");
const { isAdmin } = require("../../middlewares/auth.middleware");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../../uploads") });

// MajorProgramme
router.post("/import/major-programmes", upload.single("file"), ImportController.importMajorProgrammes);
router.get("/export/major-programmes", ImportController.exportMajorProgrammes);

module.exports = router;
