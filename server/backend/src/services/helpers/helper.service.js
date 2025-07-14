const fs = require("fs");
const { DocxParser, HtmlParser, PdfParser } = require("./parsers/base.parser");

class HelperService {
    constructor() {
        this.parsers = [new DocxParser(), new HtmlParser(), new PdfParser()];
    }

    /**
     * Chuyển đổi tài liệu sang HTML
     * @param {{ path: string, mimetype: string }} file
     * @returns {Promise<string>} HTML string
     */
    async convertDocumentToHtml(file) {
        if (!file || !fs.existsSync(file.path)) {
            throw new Error("File không tồn tại hoặc không hợp lệ.");
        }

        const parser = this.parsers.find(p => p.supports(file.mimetype));
        if (!parser) {
            throw new Error(`Không hỗ trợ định dạng file: ${file.mimetype}`);
        }

        return await parser.parse(file.path);
    }
}

module.exports = new HelperService();