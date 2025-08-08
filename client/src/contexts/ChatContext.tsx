import { createContext, useContext, useState, ReactNode, useRef } from "react";

export interface ChatContextType {
    refreshChats: () => void;
    setChatListRef: (ref: { reload: () => void } | null) => void;
    notifyNewChat: (chatData: any) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const chatListRefStore = useRef<{ reload: () => void } | null>(null);

    const setChatListRef = (ref: { reload: () => void } | null) => {
        chatListRefStore.current = ref;
    };

    const refreshChats = () => {
        if (chatListRefStore.current) {
            console.log("[ChatContext] Refreshing chat list...");
            chatListRefStore.current.reload();
        } else {
            console.warn("[ChatContext] ChatList ref not available");
        }
    };

    const notifyNewChat = (chatData: any) => {
        console.log("[ChatContext] New chat created:", chatData);
        // Delay a bit để đảm bảo API đã xử lý xong
        setTimeout(() => {
            refreshChats();
        }, 100);
    };

    return (
        <ChatContext.Provider value={{
            refreshChats,
            setChatListRef,
            notifyNewChat
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within ChatProvider");
    }
    return context;
};