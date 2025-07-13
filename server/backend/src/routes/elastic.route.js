const express = require("express");
const elasticController = require("../controllers/elastic.controller");
const { apiLock } = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * Khởi tạo index mới (nếu chưa có sẽ tạo mới, có rồi thì bỏ qua)
 * POST /elastics/init?index=<tên_index_tùy_chọn>
 * Query param: index (optional, mặc định: "documents")
 * Không cần body
 */
// router.post("/init", apiLock, elasticController.createIndex);

/**
 * Lưu một tài liệu mới, tự động chunk theo câu
 * POST /elastics?index=<tên_index_tùy_chọn>
 * Body: { "title": String, "content": String, "docId": String (optional) }
 *    - docId là optional, nếu không truyền sẽ tự sinh
 * Query param: index (optional, mặc định: "documents")
 */
// router.post("/", apiLock, elasticController.saveDocument);

/**
 * Lấy toàn bộ các chunk của một tài liệu theo docId
 * GET /elastics/detail/:docId?index=<tên_index_tùy_chọn>
 * Route param: docId (bắt buộc)
 * Query param: index (optional, mặc định: "documents")
 * Không cần body
 */
// router.get("/detail/:docId", apiLock, elasticController.getDocument);

/**
 * Lấy toàn bộ dữ liệu của một index (tối đa 1000 documents/chunks)
 * GET /elastics/all?index=<tên_index_tùy_chọn>&size=<số_lượng>
 * Query param: 
 *    - index (optional, mặc định: "documents")
 *    - size (optional, mặc định: 1000)
 * Không cần body
 */
// router.get("/all", apiLock, elasticController.getAllDocuments);

/**
 * Lấy danh sách tất cả index hiện có trong Elasticsearch
 * GET /elastics/indices
 * Không cần body hoặc query param
 */
// router.get("/indices", apiLock, elasticController.listIndices);

/**
 * Cập nhật tài liệu (xóa chunk cũ, lưu chunk mới)
 * PUT /elastics/:docId?index=<tên_index_tùy_chọn>
 * Route param: docId (bắt buộc)
 * Body: { "title": String, "content": String }
 * Query param: index (optional, mặc định: "documents")
 */
// router.put("/:docId", apiLock, elasticController.updateDocument);

/**
 * Xóa toàn bộ chunk của một tài liệu theo docId
 * DELETE /elastics/:docId?index=<tên_index_tùy_chọn>
 * Route param: docId (bắt buộc)
 * Query param: index (optional, mặc định: "documents")
 * Không cần body
 */
// router.delete("/:docId", apiLock, elasticController.deleteDocument);

/**
 * Tìm kiếm tài liệu (theo từ khoá, semantic, hybrid, cosine)
 * GET /elastics?query=<từ_khoá>&searchType=<loại_tìm_kiếm>&size=<số_lượng>&index=<tên_index_tùy_chọn>
 * Query param:
 *    - query: String (bắt buộc)
 *    - searchType: String [keyword, semantic, hybrid, custom_cosine]
 *    - size: Number (tùy chọn, mặc định: 5)
 *    - index: String (tùy chọn, mặc định: "documents")
 * Không cần body
 */
// router.get("/", apiLock, elasticController.searchDocuments);

module.exports = router;
