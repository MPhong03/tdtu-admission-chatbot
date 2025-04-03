const express = require("express");
const ElasticController = require("../controllers/elastic.controller");

const router = express.Router();

// GET
router.get("/types", ElasticController.getAvailableTypes);
router.get("/index/:type/search", ElasticController.search);
router.get("/index/:type/all", ElasticController.getAllData);

// POST
router.post("/index/:type", ElasticController.createIndex);
router.post("/index/:type/data", ElasticController.addData);

// DELETE
router.delete("/index/:type", ElasticController.deleteIndex);

module.exports = router;
