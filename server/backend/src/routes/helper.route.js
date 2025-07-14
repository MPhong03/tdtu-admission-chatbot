const express = require('express');
const router = express.Router();
const helperController = require('../controllers/helpers/helper.controller');
const { isAdmin } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// ============= API HELPER ============= //
/**
 * Chuyển đổi tài liệu sang HTML
 * POST /helpers/convert-document-to-html
 * Body: { "file": File }
 */
router.post('/convert-document-to-html', upload.single("file"), helperController.convertDocumentToHtml);

module.exports = router;