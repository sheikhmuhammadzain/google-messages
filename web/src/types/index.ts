export interface Message {
  id: string;
  conversationId: string;
  phoneNumber: string;
  body: string;
  timestamp: number;
  type: 'sent' | 'received';
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  read: boolean;
}

export interface Conversation {
  id: string;
  phoneNumber: string;
  contactName?: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface QRData {
  qrData: string;
  token: string;
  expiresIn: number;
}
