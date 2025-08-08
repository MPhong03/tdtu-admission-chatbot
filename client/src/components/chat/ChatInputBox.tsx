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
  maxLength?: number; // Giới hạn ký tự
}

const ChatInputBox = ({
  onSend,
  isDisabled,
  isBotTyping,
  placeholder,
  mode = 'chat',
  loading = false,
  maxLength = 500
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
    const value = e.target.value;

    // Giới hạn ký tự
    if (value.length <= maxLength) {
      setInput(value);
    }
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
  const currentLength = input.length;
  const remainingChars = maxLength - currentLength;

  // Dynamic placeholder based on mode and state
  const getPlaceholder = () => {
    if (placeholder) return placeholder;

    if (mode === 'home') {
      return loading ? "Đang tạo cuộc trò chuyện..." : "Hỏi về tuyển sinh, chương trình đào tạo, thủ tục nhập học...";
    }

    if (isBotTyping) return "Vui lòng chờ tư vấn viên AI phản hồi...";
    return "Đặt câu hỏi về tuyển sinh... (Enter để gửi, Shift+Enter để xuống dòng)";
  };

  // Xác định màu sắc cho character counter
  const getCounterColor = () => {
    if (remainingChars < 50) return "text-red-500";
    if (remainingChars < 100) return "text-orange-500";
    return "text-gray-500";
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
            maxLength={maxLength}
            className={`outline-none px-0 py-2 resize-none overflow-y-auto w-full bg-transparent placeholder:text-gray-400 transition-all duration-200 ${isDisabled || isBotTyping || loading ? "cursor-not-allowed text-gray-500" : "text-gray-900"
              }`}
            style={{ lineHeight: "1.5rem", maxHeight: "10.5rem" }}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isDisabled || isBotTyping || loading}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isDisabled || isBotTyping || loading
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                title="Đính kèm tài liệu"
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
                title="Ghi âm câu hỏi"
              >
                <FaMicrophone size={16} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${canSend
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:scale-105"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            title={canSend ? (mode === 'home' ? "Bắt đầu tư vấn" : "Gửi câu hỏi") : "Nhập nội dung để gửi"}
          >
            {isProcessing ? (
              <RiLoader4Line size={18} className="animate-spin" />
            ) : (
              <TbSend size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Warning message khi gần đạt giới hạn */}
      {remainingChars < 20 && remainingChars > 0 && (
        <div className="absolute -bottom-6 left-0 text-xs text-orange-600 font-medium">
          Sắp đạt giới hạn {maxLength} ký tự
        </div>
      )}

      {/* Error message khi đạt giới hạn */}
      {remainingChars === 0 && (
        <div className="absolute -bottom-6 left-0 text-xs text-red-600 font-medium">
          Đã đạt giới hạn {maxLength} ký tự. Vui lòng rút gọn câu hỏi.
        </div>
      )}
    </div>
  );
};

export default ChatInputBox;
