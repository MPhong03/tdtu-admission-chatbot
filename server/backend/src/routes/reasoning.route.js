const express = require('express');
const router = express.Router();
const ReasoningController = require('../controllers/reasoning.controller');

// // ============= API RESONING ============= //
// // Truy ngành theo nhóm ngành
// router.get('/group/:id/majors', ReasoningController.getMajorsByGroup);

// // Truy hệ đào tạo theo ngành
// router.get('/major/:id/programmes', ReasoningController.getProgrammesByMajor);

// // Truy ngành-hệ theo hệ đào tạo
// router.get('/programme/:id/major-programme', ReasoningController.getMajorProgrammeByProgramme);

// // Truy ngược chuỗi từ hệ đào tạo
// router.get('/programme/:id/full-path', ReasoningController.getFullPathFromProgramme);

// // Truy ngược chuỗi từ ngành-hệ
// router.get('/major-programme/:id/full-path', ReasoningController.getFullPathFromMajorProgramme);

// // ============= API QUERY ============= //
// // Tìm kiếm node bằng vector embedding
// router.post('/query/node', ReasoningController.findSimilarByVectors);

module.exports = router;