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

export interface Device {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  pairingToken?: string;
  pairingTokenExpiry?: number;
  connectedAt: number;
  lastSeen: number;
  socketId?: string;
}

export interface WebSession {
  id: string;
  deviceId: string;
  sessionToken: string;
  connectedAt: number;
  lastSeen: number;
  socketId?: string;
}

export interface QRPayload {
  token: string;
  timestamp: number;
  expiresIn: number;
}

export interface SocketEvents {
  // Mobile events
  'mobile:register': (data: { deviceId: string; deviceName: string; deviceModel: string }) => void;
  'mobile:scan-qr': (data: { qrData: string; deviceId: string }) => void;
  'mobile:messages': (data: { messages: Message[] }) => void;
  'mobile:conversations': (data: { conversations: Conversation[] }) => void;
  'mobile:message-status': (data: { messageId: string; status: string }) => void;
  
  // Web events
  'web:authenticate': (data: { sessionToken: string }) => void;
  'web:send-message': (data: { phoneNumber: string; message: string }) => void;
  'web:mark-read': (data: { conversationId: string }) => void;
  
  // Bidirectional events
  'message:new': (data: Message) => void;
  'message:sent': (data: Message) => void;
  'conversation:update': (data: Conversation) => void;
  
  // System events
  'authenticated': () => void;
  'error': (data: { message: string }) => void;
  'disconnect': () => void;
}
