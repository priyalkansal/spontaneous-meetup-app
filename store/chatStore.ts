import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockChats, mockMessages } from '@/constants/mockData';
import { ChatPreview, Message } from '@/types';

interface ChatState {
  chats: ChatPreview[];
  messages: Record<string, Message[]>;
  activeChat: string | null;
  
  // Actions
  setActiveChat: (chatId: string | null) => void;
  sendMessage: (chatId: string, text: string) => void;
  upsertChatPreview: (chat: ChatPreview) => void; // NEW: ensure chat exists in Messages list
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: mockChats,
      messages: mockMessages,
      activeChat: null,
  
  setActiveChat: (chatId) => set({ activeChat: chatId }),
  
  sendMessage: (chatId, text) => set((state) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = { ...state.messages };
    
    if (updatedMessages[chatId]) {
      updatedMessages[chatId] = [...updatedMessages[chatId], newMessage];
    } else {
      updatedMessages[chatId] = [newMessage];
    }
    
    const updatedChats = state.chats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          lastMessage: text,
          timestamp: newMessage.timestamp,
          unread: 0,
        };
      }
      return chat;
    });
    
    return {
      messages: updatedMessages,
      chats: updatedChats,
    };
  }),

  upsertChatPreview: (chat) => set((state) => {
    const exists = state.chats.some(c => c.id === chat.id);
    if (exists) {
      // Update name/avatar if changed
      return {
        chats: state.chats.map(c => c.id === chat.id ? { ...c, ...chat } : c)
      };
    }
    return {
      chats: [chat, ...state.chats],
    };
  }),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);