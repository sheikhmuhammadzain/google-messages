import { create } from 'zustand';
import { Message, Conversation } from '../types';

interface MessagesState {
  conversations: Conversation[];
  messages: Map<string, Message[]>;
  activeConversation: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: new Map(),
  activeConversation: null,
  isLoading: false,
  error: null,

  setConversations: (conversations) => {
    set({ conversations: conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime) });
  },

  setMessages: (conversationId, messages) => {
    const messagesMap = new Map(get().messages);
    messagesMap.set(conversationId, messages.sort((a, b) => a.timestamp - b.timestamp));
    set({ messages: messagesMap });
  },

  addMessage: (message) => {
    const { messages, conversations } = get();
    const conversationId = message.conversationId;
    
    // Add to messages
    const messagesMap = new Map(messages);
    const currentMessages = messagesMap.get(conversationId) || [];
    
    // Check if message already exists
    if (!currentMessages.find(m => m.id === message.id)) {
      messagesMap.set(conversationId, [...currentMessages, message].sort((a, b) => a.timestamp - b.timestamp));
    }
    
    // Update conversation
    const conversationIndex = conversations.findIndex(c => c.id === conversationId);
    let updatedConversations = [...conversations];
    
    if (conversationIndex >= 0) {
      updatedConversations[conversationIndex] = {
        ...updatedConversations[conversationIndex],
        lastMessage: message.body,
        lastMessageTime: message.timestamp,
        unreadCount: message.type === 'received' ? updatedConversations[conversationIndex].unreadCount + 1 : updatedConversations[conversationIndex].unreadCount,
      };
    } else {
      // Create new conversation
      updatedConversations.push({
        id: conversationId,
        phoneNumber: message.phoneNumber,
        lastMessage: message.body,
        lastMessageTime: message.timestamp,
        unreadCount: message.type === 'received' ? 1 : 0,
      });
    }
    
    set({ 
      messages: messagesMap,
      conversations: updatedConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime),
    });
  },

  updateMessageStatus: (messageId, status) => {
    const { messages } = get();
    const messagesMap = new Map(messages);
    
    messagesMap.forEach((msgs, conversationId) => {
      const updated = msgs.map(msg => 
        msg.id === messageId ? { ...msg, status: status as any } : msg
      );
      messagesMap.set(conversationId, updated);
    });
    
    set({ messages: messagesMap });
  },

  setActiveConversation: (conversationId) => {
    set({ activeConversation: conversationId });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  clearMessages: () => {
    set({ conversations: [], messages: new Map(), activeConversation: null });
  },
}));
