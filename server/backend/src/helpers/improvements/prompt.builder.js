class PromptBuilder {
    /**
     * Xây dựng prompt chuẩn cho LLM (Gemini) từ câu hỏi và node ngữ cảnh
     * @param {string} question
     * @param {Array} contextNodes
     * @returns {string}
     */
    build(question, contextNodes) {
        const lines = [];

        // Section 1: Câu hỏi người dùng
        lines.push("## 📌 Câu hỏi người dùng:");
        lines.push(question.trim());
        lines.push("");

        // Section 2: Tri thức hệ thống truy xuất được
        lines.push("## 📚 Dữ liệu liên quan:");
        for (const node of contextNodes) {
            lines.push(this.formatNodeBlock(node));
        }

        // Section 3: Hướng dẫn Gemini trả lời
        lines.push("");
        lines.push("## ✍️ Hướng dẫn:");
        lines.push(`Bạn là một chatbot tư vấn tuyển sinh của Trường Đại học Tôn Đức Thắng (TDTU).`);
        lines.push(`Dựa vào dữ liệu trên, hãy trả lời đúng trọng tâm câu hỏi của người dùng.`);
        lines.push(`Trả lời bằng giọng văn thân thiện, rõ ràng, không bịa đặt nếu thiếu thông tin.`);

        return lines.join("\n");
    }

    /**
     * Biến 1 node thành markdown dạng đẹp
     * @param {*} node
     * @returns {string}
     */
    formatNodeBlock(node) {
        const header = `### 🔹 ${node.label}: ${node.name}`;
        const desc = node.description ? `> ${node.description.trim()}` : "";
        const tab = node.tab ? `- Hệ đào tạo: ${node.tab}` : "";

        const fields = Object.entries(node.content || {})
            .map(([key, val]) => `- ${key}: ${val}`)
            .join("\n");

        return [header, desc, tab, fields].filter(Boolean).join("\n");
    }
}

module.exports = new PromptBuilder();
