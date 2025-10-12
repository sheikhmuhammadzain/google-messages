import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, APP_CONFIG } from '../config/constants';
import { Message, Conversation } from '../types';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private sessionToken: string | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();

  /**
   * Initialize socket connection with session token
   */
  initialize(sessionToken: string): void {
    this.sessionToken = sessionToken;
    this.connect();
  }

  /**
   * Connect to socket server
   */
  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    console.log('🔌 Connecting to socket server...');

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: APP_CONFIG.SOCKET_RECONNECT_DELAY,
      reconnectionAttempts: Infinity,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.isConnected = true;
      this.authenticate();
      this.emit('connected', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.isConnected = false;
      this.emit('disconnected', { connected: false });
      this.scheduleReconnect();
    });

    this.socket.on('authenticated', (data: any) => {
      console.log('✅ Web client authenticated');
      this.emit('authenticated', data);
      
      // Request initial sync
      this.requestSync();
    });

    this.socket.on('messages:sync', (data: { messages: Message[] }) => {
      console.log('📥 Messages synced:', data.messages.length);
      this.emit('messages:sync', data);
    });

    this.socket.on('conversations:sync', (data: { conversations: Conversation[] }) => {
      console.log('📥 Conversations synced:', data.conversations.length);
      this.emit('conversations:sync', data);
    });

    this.socket.on('message:new', (data: Message) => {
      console.log('📨 New message received');
      this.emit('message:new', data);
    });

    this.socket.on('message:status', (data: { messageId: string; status: string }) => {
      console.log('📊 Message status update');
      this.emit('message:status', data);
    });

    this.socket.on('mobile:disconnected', () => {
      console.log('📱 Mobile device disconnected');
      this.emit('mobile:disconnected', {});
    });

    this.socket.on('error', (data: any) => {
      console.error('❌ Socket error:', data);
      this.emit('error', data);
    });
  }

  /**
   * Authenticate with session token
   */
  private authenticate(): void {
    if (!this.socket || !this.sessionToken) return;

    this.socket.emit('web:authenticate', {
      sessionToken: this.sessionToken,
    });
  }

  /**
   * Request sync from mobile
   */
  requestSync(): void {
    if (!this.socket) return;
    this.socket.emit('web:request-sync');
  }

  /**
   * Send message
   */
  sendMessage(phoneNumber: string, message: string, tempId: string): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('web:send-message', {
      phoneNumber,
      message,
      tempId,
    });
  }

  /**
   * Mark conversation as read
   */
  markAsRead(conversationId: string): void {
    if (!this.socket) return;
    this.socket.emit('web:mark-read', { conversationId });
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        console.log('🔄 Attempting to reconnect...');
        this.connect();
      }
    }, APP_CONFIG.SOCKET_RECONNECT_DELAY);
  }

  /**
   * Subscribe to socket event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from socket event
   */
  off(event: string, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((callback) => callback(data));
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
  }
}

export default new SocketService();
