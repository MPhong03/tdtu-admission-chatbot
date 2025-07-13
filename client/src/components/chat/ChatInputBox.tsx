import { useState, useRef, ChangeEvent, KeyboardEvent, useEffect } from "react";
import { TbSend } from "react-icons/tb";
import { FaMicrophone, FaPlus } from "react-icons/fa6";
import { RiLoader4Line } from "react-icons/ri";

interface ChatInputBoxProps {
  chatId?: string;
  onSend: (question: string, chatId?: string) => Promise<void>;
  isDisabled?: boolean;
  isBotTyping?: boolean;
  placeholder?: string; // Custom placeholder
  mode?: 'home' | 'chat'; // Phân biệt context sử dụng
  loading?: boolean; // External loading state
}

const ChatInputBox = ({
  onSend,
  isDisabled,
  isBotTyping,
  placeholder,
  mode = 'chat',
  loading = false
}: ChatInputBoxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const clampedHeight = Math.min(scrollHeight, 168); // max 7 dòng
      textarea.style.height = `${clampedHeight}px`;
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSend = async () => {
    if (input.trim() && !isDisabled && !isSending && !loading) {
      setIsSending(true);
      try {
        await onSend(input);
        setInput("");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim() && !isDisabled && !isSending && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const canSend = input.trim() && !isDisabled && !isSending && !loading;
  const isProcessing = isSending || loading;

  // Dynamic placeholder based on mode and state
  const getPlaceholder = () => {
    if (placeholder) return placeholder;

    if (mode === 'home') {
      return loading ? "Đang tạo cuộc trò chuyện..." : "Đặt câu hỏi để bắt đầu trò chuyện...";
    }

    if (isBotTyping) return "Vui lòng chờ AI phản hồi...";
    return "Nhập câu hỏi của bạn... (Enter để gửi, Shift+Enter để xuống dòng)";
  };

  return (
    <div className="relative">
      <div className={`p-4 rounded-2xl flex flex-col gap-3 border-2 transition-all duration-200 w-full h-fit ${isDisabled || isBotTyping || loading
          ? "border-gray-300 bg-gray-50"
          : "border-gray-300 bg-white hover:border-blue-400 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-100"
        }`}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isDisabled || isBotTyping || loading}
            className={`outline-none px-0 py-2 resize-none overflow-y-auto w-full bg-transparent placeholder:text-gray-400 transition-all duration-200 ${isDisabled || isBotTyping || loading ? "cursor-not-allowed text-gray-500" : "text-gray-900"
              }`}
            style={{ lineHeight: "1.5rem", maxHeight: "10.5rem" }}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isDisabled || isBotTyping || loading}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isDisabled || isBotTyping || loading
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}
              title="Đính kèm file"
            >
              <FaPlus size={16} />
            </button>

            <button
              type="button"
              disabled={isDisabled || isBotTyping || loading}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isDisabled || isBotTyping || loading
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}
              title="Ghi âm"
            >
              <FaMicrophone size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${canSend
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:scale-105"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            title={canSend ? (mode === 'home' ? "Bắt đầu trò chuyện" : "Gửi tin nhắn") : "Nhập nội dung để gửi"}
          >
            {isProcessing ? (
              <RiLoader4Line size={18} className="animate-spin" />
            ) : (
              <TbSend size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputBox;
