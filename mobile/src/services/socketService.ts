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
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly baseReconnectDelay: number = 1000;
  private readonly maxReconnectDelay: number = 30000;
  private connectionError: string | null = null;
  private lastConnectionAttempt: number = 0;

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

    // Check if we've exceeded max reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Maximum reconnection attempts reached. Stopping reconnection.');
      this.connectionError = 'Maximum reconnection attempts exceeded. Please check your internet connection.';
      this.emit('connection:failed', { error: this.connectionError, attempts: this.reconnectAttempts });
      return;
    }

    // Prevent too frequent connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    const minInterval = 500; // Minimum 500ms between attempts
    
    if (timeSinceLastAttempt < minInterval) {
      console.log('🔄 Connection attempt too soon, scheduling...');
      setTimeout(() => this.connect(), minInterval - timeSinceLastAttempt);
      return;
    }

    this.lastConnectionAttempt = now;
    this.reconnectAttempts++;
    
    console.log(`🔌 Connecting to socket server... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false, // We'll handle reconnection manually
      timeout: 10000, // 10 second timeout
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset on successful connection
      this.connectionError = null;
      this.registerDevice();
      this.emit('connected', { connected: true, attempts: this.reconnectAttempts });
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

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error.message || error);
      this.connectionError = error.message || 'Connection failed';
      this.isConnected = false;
      this.emit('connection:error', { error: this.connectionError, attempts: this.reconnectAttempts });
      this.scheduleReconnect();
    });

    this.socket.on('error', (data: any) => {
      console.error('❌ Socket error:', data);
      this.connectionError = data.message || 'Socket error occurred';
      this.emit('error', { error: data, attempts: this.reconnectAttempts });
    });

    // Handle connection timeout
    this.socket.on('connect_timeout', () => {
      console.error('⏱️ Socket connection timeout');
      this.connectionError = 'Connection timeout';
      this.emit('connection:timeout', { attempts: this.reconnectAttempts });
      this.scheduleReconnect();
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
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Don't schedule if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Maximum reconnection attempts reached');
      return;
    }

    // Calculate delay using exponential backoff with jitter
    const backoffDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    
    // Add jitter to prevent thundering herd problem
    const jitter = Math.random() * 0.3 * backoffDelay;
    const delay = backoffDelay + jitter;

    console.log(`🔄 Scheduling reconnection in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        console.log('🔄 Attempting to reconnect...');
        this.connect();
      }
    }, delay);
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
   * Emit event to server
   */
  emitToServer(event: string, data: any): void {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status information
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      connectionError: this.connectionError,
      canRetry: this.reconnectAttempts < this.maxReconnectAttempts,
    };
  }

  /**
   * Manually retry connection (resets attempt counter)
   */
  retryConnection(): void {
    console.log('🔄 Manual connection retry requested');
    this.reconnectAttempts = 0;
    this.connectionError = null;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (!this.isConnected) {
      this.connect();
    }
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
