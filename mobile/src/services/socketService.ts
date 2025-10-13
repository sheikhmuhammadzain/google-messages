import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, APP_CONFIG } from '../config/constants';
import { Message, Conversation, DeviceInfo } from '../types';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();

  /**
   * Initialize socket connection
   */
  initialize(deviceInfo: DeviceInfo): void {
    this.deviceInfo = deviceInfo;
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
      this.registerDevice();
      this.emit('connected', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.isConnected = false;
      this.emit('disconnected', { connected: false });
      this.scheduleReconnect();
    });

    this.socket.on('authenticated', (data: any) => {
      console.log('✅ Device authenticated');
      this.emit('authenticated', data);
    });

    this.socket.on('qr:paired', (data: any) => {
      console.log('✅ QR code paired');
      this.emit('qr:paired', data);
    });

    this.socket.on('send:message', (data: { phoneNumber: string; message: string; tempId: string }) => {
      console.log('📤 Send message request from web');
      this.emit('send:message', data);
    });

    this.socket.on('mark:read', (data: { conversationId: string }) => {
      console.log('👁️ Mark as read request from web');
      this.emit('mark:read', data);
    });

    this.socket.on('request:sync', () => {
      console.log('🔄 Sync request from web');
      this.emit('request:sync', {});
    });

    this.socket.on('error', (data: any) => {
      console.error('❌ Socket error:', data);
      this.emit('error', data);
    });
  }

  /**
   * Register device with server
   */
  private registerDevice(): void {
    if (!this.socket || !this.deviceInfo) return;

    this.socket.emit('mobile:register', {
      deviceId: this.deviceInfo.deviceId,
      deviceName: this.deviceInfo.deviceName,
      deviceModel: this.deviceInfo.deviceModel,
    });
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
   * Scan QR code
   */
  scanQR(qrData: string): void {
    if (!this.socket || !this.deviceInfo) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('mobile:scan-qr', {
      qrData,
      deviceId: this.deviceInfo.deviceId,
    });
  }

  /**
   * Sync messages to server
   */
  syncMessages(messages: Message[]): void {
    if (!this.socket) return;
    this.socket.emit('mobile:messages', { messages });
  }

  /**
   * Sync conversations to server
   */
  syncConversations(conversations: Conversation[]): void {
    if (!this.socket) return;
    this.socket.emit('mobile:conversations', { conversations });
  }

  /**
   * Send message status update
   */
  updateMessageStatus(messageId: string, status: string): void {
    if (!this.socket) return;
    this.socket.emit('mobile:message-status', { messageId, status });
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
