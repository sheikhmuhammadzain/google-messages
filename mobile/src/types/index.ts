export interface Message {
  id: string;
  conversationId: string;
  phoneNumber: string;
  body: string;
  timestamp: number;
  type: 'sent' | 'received';
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  read: boolean;
  subscriptionId?: number; // For dual SIM support
}

export interface Conversation {
  id: string;
  phoneNumber: string;
  contactName?: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceModel: string;
}

export interface SimCard {
  subscriptionId: number;
  slotIndex: number;
  displayName: string;
  carrierName: string;
  phoneNumber: string;
  countryIso: string;
  isDefaultSms?: boolean;
}

export interface SimPreference {
  phoneNumber: string;
  subscriptionId: number;
  lastUsed: number;
}
