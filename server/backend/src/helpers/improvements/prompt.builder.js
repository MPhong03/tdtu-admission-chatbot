const logger = require("../../utils/logger.util");

class PromptBuilder {
  /**
   * Xây dựng prompt cho LLM dựa trên câu hỏi và ngữ cảnh.
   * @param {string} question - Câu hỏi của người dùng.
   * @param {Array} contextNodes - Mảng các node ngữ cảnh.
   * @param {Object} [options] - Cấu hình tùy chọn.
   * @param {string} [options.instructionTemplate] - Mẫu hướng dẫn tùy chỉnh cho LLM.
   * @param {string} [options.role] - Vai trò của chatbot.
   * @returns {string} - Prompt đã được định dạng.
   */
  build(question, contextNodes, options = {}) {
    // Lấy cấu hình tùy chọn hoặc sử dụng mặc định
    const {
      instructionTemplate = this.defaultInstructionTemplate(),
      role = "chatbot tư vấn tuyển sinh của Trường Đại học Tôn Đức Thắng (TDTU)",
    } = options;

    const lines = [];

    // Phần 1: Thêm câu hỏi người dùng
    lines.push("### Câu hỏi người dùng");
    lines.push(question?.trim() || "[Không có câu hỏi]");
    lines.push("");

    // Phần 2: Thêm dữ liệu ngữ cảnh
    lines.push("### Dữ liệu ngữ cảnh");
    if (!contextNodes || contextNodes.length === 0) {
      lines.push("Không có dữ liệu ngữ cảnh.");
      // Ghi log cảnh báo nếu không có node ngữ cảnh
      logger.warn("Không có node ngữ cảnh nào được cung cấp", { module: "PromptBuilder" });
    } else {
      for (const node of contextNodes) {
        lines.push(this.formatNodeBlock(node));
      }
    }

    // Phần 3: Thêm hướng dẫn cho LLM
    lines.push("");
    lines.push("### Hướng dẫn");
    lines.push(instructionTemplate.replace("{role}", role));

    // Kết hợp các dòng thành prompt hoàn chỉnh
    return lines.join("\n");
  }

  /**
   * Cung cấp mẫu hướng dẫn mặc định cho LLM.
   * @returns {string} - Mẫu hướng dẫn mặc định.
   */
  defaultInstructionTemplate() {
    // Mẫu hướng dẫn mặc định với vai trò có thể thay thế
    return `Bạn là {role}. Dựa vào dữ liệu ngữ cảnh, trả lời câu hỏi của người dùng một cách chính xác, trọng tâm. Sử dụng giọng văn thân thiện, rõ ràng, và không suy diễn nếu thiếu thông tin.`;
  }

  /**
   * Định dạng node ngữ cảnh thành khối markdown có cấu trúc.
   * @param {Object} node - Node ngữ cảnh (loại graph hoặc document).
   * @returns {string} - Chuỗi markdown đã định dạng.
   */
  formatNodeBlock(node) {
    try {
      if (node?.label) {
        // Xử lý node dạng graph
        const header = `#### ${node.label}: ${node.name || "Không xác định"}`;
        const desc = node.description ? `> ${node.description.trim()}` : "";
        const tab = node.tab ? `- Hệ đào tạo: ${node.tab}` : "";
        const fields = Object.entries(node.content || {})
          .map(([key, value]) => `- ${key}: ${value || "Không có dữ liệu"}`)
          .join("\n");

        return [header, desc, tab, fields].filter(Boolean).join("\n");
      } else {
        // Xử lý node dạng tài liệu (từ Elasticsearch)
        const header = `#### Tài liệu: ${node.name || "Không có tiêu đề"}`;
        const source = node.content ? `- Nội dung: ${node.content}` : "- Nội dung: Không có dữ liệu";

        return [header, source].filter(Boolean).join("\n");
      }
    } catch (error) {
      // Ghi log lỗi nếu định dạng node thất bại
      logger.error("Lỗi khi định dạng node ngữ cảnh", {
        error: error.message,
        stack: error.stack,
        module: "PromptBuilder",
        node: JSON.stringify(node),
      });
      return "#### Lỗi: Không thể định dạng dữ liệu ngữ cảnh";
    }
  }
}

module.exports = new PromptBuilder();