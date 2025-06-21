const express = require("express");
const router = express.Router();
const ImportController = require('../../controllers/v2/import.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Import majors, programmes, major_programmes, years
 * POST /import/majors-programmes-years
 */
router.post('/majors-programmes-years', verifyToken, isAdmin, ImportController.importMajorsProgrammesAndYears);

/**
 * Import programmes
 * POST /import/programmes
 */
router.post('/programmes', verifyToken, isAdmin, ImportController.importProgrammes);

/**
 * Import years
 * POST /import/years
 */
router.post('/years', verifyToken, isAdmin, ImportController.importYears);

/**
 * Import tuitions, programmes, years
 * POST /import/tuitions
 */
router.post('/tuitions', verifyToken, isAdmin, ImportController.importTuitions);

/**
 * Import scholarships, years
 * POST /import/scholarships
 */
router.post('/scholarships', verifyToken, isAdmin, ImportController.importScholarships);

/**
 * Import documents, years
 * POST /import/documents
 */
router.post('/documents', verifyToken, isAdmin, ImportController.importDocuments);

module.exports = router;