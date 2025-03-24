const express = require("express");
const ElasticController = require("../controllers/elastic.controller");

const router = express.Router();

// GET
router.get("/templates", ElasticController.getTemplates);
router.get("/index/:type/search", ElasticController.search);
router.get("/index/:indexName/all", ElasticController.getAllData);

// POST
router.post("/index/:type", ElasticController.createIndex);
router.post("/index/:type/data", ElasticController.addData);

// DELETE
router.delete("/index/:type", ElasticController.deleteIndex);

module.exports = router;
