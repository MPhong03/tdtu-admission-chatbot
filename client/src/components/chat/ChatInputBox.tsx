import { useState, useRef, ChangeEvent, KeyboardEvent, useEffect } from "react";
import { TbLocationFilled } from "react-icons/tb";
import { FaMicrophone, FaPlus } from "react-icons/fa6";

interface ChatInputBoxProps {
  chatId?: string; // có thể truyền hoặc không
  onSend: (question: string, chatId?: string) => Promise<void>;
}

const ChatInputBox = ({ onSend }: ChatInputBoxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState<string>("");

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

  const handleSend = () => {
    if (input.trim()) {
      onSend(input); // Gọi onSend khi nhấn gửi
      setInput(""); // Xóa input sau khi gửi
    }
  };

  // Gửi tin bằng Enter nếu có nội dung
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault(); // Không xuống dòng
      handleSend();
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  return (
    <div className="p-3 rounded-xl flex flex-col gap-2 border border-gray-600 w-full h-fit">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Nhập câu hỏi của bạn..."
        className="outline-none px-2 resize-none overflow-y-auto w-full"
        style={{ lineHeight: "1.5rem", maxHeight: "10.5rem" }}
      />

      <div className="flex justify-between items-center">
        <button className="icon-hover text-main-blue hover:bg-teal-100">
          <FaPlus size={18} />
        </button>

        <div className="flex gap-2">
          <button className="icon-hover text-main-blue hover:bg-teal-100">
            <FaMicrophone size={18} />
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`w-8 h-8 p-2 flex justify-center items-center rounded-full transition
              ${
                input.trim()
                  ? "text-main-blue hover:bg-teal-100 cursor-pointer"
                  : "text-gray-400 bg-transparent"
              }
            `}
          >
            <TbLocationFilled size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputBox;
