function buildPromptWithContext(question, contextNodes) {
    const contextStrings = contextNodes.map((node, idx) => {
        const lines = [`#${idx + 1}. ${node.label}: ${node.name}`];
        if (node.description) lines.push(`Mô tả: ${node.description}`);
        for (const [key, value] of Object.entries(node.content || {})) {
            lines.push(`${key}: ${value}`);
        }
        return lines.join("\n");
    });

    return `
        Bạn là chatbot tuyển sinh của Trường Đại học Tôn Đức Thắng (TDTU).
        
        Dưới đây là các ngữ cảnh về ngành học, chương trình đào tạo:
        
        ${contextStrings.join("\n\n")}
        
        Câu hỏi:
        ${question}
        
        Trả lời:
    `.trim();
}

module.exports = { buildPromptWithContext };
