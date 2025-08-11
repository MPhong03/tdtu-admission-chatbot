const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const RetrieverService = require("../services/chatbots/retriever.service");
const HistoryService = require("../services/users/history.service");
const HttpResponse = require("../data/responses/http.response");
const BotService = require("../services/v2/bots/bot.service");

function initSocketHandler(io) {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // ĐÃ DÙNG API VÌ CHƯA CẦN THIẾT ĐỂ NHẮN REALTIME, SOCKET CHỈ DÙNG ĐỂ NHẬN TÍN HIỆU
        socket.on("chat:send", async (payload) => {
            const { question, chatId, token, visitorId } = payload || {};
            if (!question) {
                return socket.emit("chat:error", HttpResponse.error("Thiếu thông tin câu hỏi"));
            }

            let userId = null;
            let isVisitor = false;
            let newVisitorId = null;

            if (token) {
                try {
                    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
                    userId = decoded?.id;
                    if (!userId) throw new Error("Không xác định được người dùng");
                } catch (err) {
                    return socket.emit("chat:error", HttpResponse.error("Token không hợp lệ hoặc hết hạn"));
                }
            } else if (visitorId) {
                userId = visitorId;
                isVisitor = true;
            } else {
                // Tạo visitorId mới cho người dùng vãng lai
                newVisitorId = uuidv4();
                userId = newVisitorId;
                isVisitor = true;
            }

            try {
                // Xử lý chatbot với progress tracking
                const { answer, prompt, contextNodes, cypher, isError } = await BotService.generateAnswer(question, null, [], socket);

                // Lưu lịch sử
                const saveResult = await HistoryService.saveChat({
                    userId,
                    chatId,
                    question,
                    answer,
                    cypher,
                    contextNodes,
                    isError
                });

                const newHistoryId = saveResult?.Data?.history?._id || null;

                // Phản hồi cho client, trả visitorId nếu vừa tạo mới
                socket.emit("chat:response", HttpResponse.success("Chat thành công", {
                    historyId: newHistoryId,
                    answer,
                    prompt,
                    contextNodes,
                    chatId: saveResult?.Data?.chatId || chatId,
                    visitorId: newVisitorId || visitorId || null
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
