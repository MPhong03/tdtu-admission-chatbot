const express = require('express');
const ScenarioController = require('../controllers/chatbotconfigs/scenario.controller');
const router = express.Router();

// GET
router.get('/', ScenarioController.getScenarios);

// POST
router.post('/', ScenarioController.createScenario);

// PUT
router.put('/:id', ScenarioController.updateScenario);

// DELETE
router.delete('/:id', ScenarioController.deleteScenario);

module.exports = router;
