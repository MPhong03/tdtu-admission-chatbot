const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = "uploads/documents";

// Tạo thư mục nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

module.exports = upload;
