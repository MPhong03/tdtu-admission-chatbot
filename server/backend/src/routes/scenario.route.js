const express = require('express');
const ScenarioController = require('../controllers/chatbotconfigs/scenario.controller');
const { apiLock } = require('../middlewares/auth.middleware');
const router = express.Router();

// GET
router.get('/', apiLock, ScenarioController.getScenarios);

// POST
router.post('/', apiLock, ScenarioController.createScenario);

// PUT
router.put('/:id', apiLock, ScenarioController.updateScenario);

// DELETE
router.delete('/:id', apiLock, ScenarioController.deleteScenario);

module.exports = router;
