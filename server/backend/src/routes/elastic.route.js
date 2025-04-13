const express = require("express");
const ElasticController = require("../controllers/elastic.controller");

const router = express.Router();

// GET
router.get("/types", ElasticController.getAvailableTypes);
// BY TEXT
router.get("/index/:type/search", ElasticController.search);
// VECTORIZE
router.get("/index/:type/vector-search", ElasticController.searchByVector);
router.get("/index/:type/all", ElasticController.getAllData);

// POST
router.post("/index/:type", ElasticController.createIndex);
router.post("/index/:type/data", ElasticController.addData);

// FROM JSON
router.post("/index/:type/data/from-json", ElasticController.addDataFromJson);

// DELETE
router.delete("/index/:type", ElasticController.deleteIndex);

module.exports = router;
