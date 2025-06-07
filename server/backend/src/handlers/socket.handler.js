const jwt = require("jsonwebtoken");
const RetrieverService = require("../services/chatbots/retriever.service");
const HistoryService = require("../services/users/history.service");
const HttpResponse = require("../data/responses/http.response");

function initSocketHandler(io) {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("chat:send", async (payload) => {
            const { question, chatId, token } = payload || {};
            if (!question || !token) {
                return socket.emit("chat:error", HttpResponse.error("Thiếu thông tin câu hỏi hoặc token"));
            }

            let userId = null;
            try {
                const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
                userId = decoded?.id;
                if (!userId) throw new Error("Không xác định được người dùng");
            } catch (err) {
                return socket.emit("chat:error", HttpResponse.error("Token không hợp lệ hoặc hết hạn"));
            }

            try {
                // Xử lý chatbot
                const { answer, prompt, contextNodes, isError } = await RetrieverService.chatWithBot(question);

                // Lưu lịch sử
                const saveResult = await HistoryService.saveChat({
                    userId,
                    chatId,
                    question,
                    answer,
                    isError
                });

                // Phản hồi cho client
                socket.emit("chat:response", HttpResponse.success("Chat thành công", {
                    answer,
                    prompt,
                    contextNodes,
                    chatId: saveResult?.Data?.chatId || chatId,
                }));
            } catch (error) {
                console.error("Socket Chat Error:", error);
                socket.emit("chat:error", HttpResponse.error("Có lỗi xảy ra khi chat", -1, error.message));
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
}

module.exports = initSocketHandler;
