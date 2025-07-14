const fs = require("fs");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

// Interface parser
class BaseParser {
    supports(mimeType) {
        throw new Error("supports() chưa được implement.");
    }

    async parse(filePath) {
        throw new Error("parse() chưa được implement.");
    }
}

// DOCX Parser
class DocxParser extends BaseParser {
    supports(mimeType) {
        return mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    async parse(filePath) {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.convertToHtml({ buffer });
        return result.value || "";
    }
}

// HTML Parser
class HtmlParser extends BaseParser {
    supports(mimeType) {
        return mimeType === "text/html";
    }

    async parse(filePath) {
        return fs.readFileSync(filePath, "utf-8");
    }
}

// PDF Parser
class PdfParser extends BaseParser {
    supports(mimeType) {
        return mimeType === "application/pdf";
    }

    async parse(filePath) {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return `<div>${data.text.replace(/\n/g, "<br/>")}</div>`;
    }
}

module.exports = {
    BaseParser,
    DocxParser,
    HtmlParser,
    PdfParser,
};
