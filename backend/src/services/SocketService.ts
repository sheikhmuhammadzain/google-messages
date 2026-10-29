import { Server, Socket } from 'socket.io';
import { Message, Conversation } from '../types';
import AuthService from './AuthService';

class SocketService {
  private io: Server | null = null;
  
  // Store active connections
  private mobileDevices = new Map<string, Socket>(); // deviceId -> socket
  private webSessions = new Map<string, Socket>(); // sessionToken -> socket
  private deviceToSessions = new Map<string, Set<string>>(); // deviceId -> Set<sessionTokens>
  private pendingQRPairings = new Map<string, { resolve: (sessionToken: string) => void }>(); // token -> resolver

  initialize(io: Server): void {
    this.io = io;
    this.setupSocketHandlers();
    console.log('✅ Socket service initialized');
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 New connection: ${socket.id}`);

      // Handle mobile device registration
      socket.on('mobile:register', async (data: { deviceId: string; deviceName: string; deviceModel: string }) => {
        await this.handleMobileRegister(socket, data);
      });

      // Handle mobile QR scan
      socket.on('mobile:scan-qr', async (data: { qrData: string; deviceId: string }) => {
        await this.handleQRScan(socket, data);
      });

      // Handle mobile messages sync
      socket.on('mobile:messages', (data: { messages: Message[] }) => {
        this.handleMobileMessages(socket, data);
      });

      // Handle mobile conversations sync
      socket.on('mobile:conversations', (data: { conversations: Conversation[] }) => {
        this.handleMobileConversations(socket, data);
      });

      // Handle message status updates
      socket.on('mobile:message-status', (data: { messageId: string; status: string }) => {
        this.handleMessageStatus(socket, data);
      });

      // Handle web authentication
      socket.on('web:authenticate', async (data: { sessionToken: string }) => {
        await this.handleWebAuthenticate(socket, data);
      });

      // Handle web send message request
      socket.on('web:send-message', (data: { phoneNumber: string; message: string; tempId: string }) => {
        this.handleWebSendMessage(socket, data);
      });

      // Handle web mark as read
      socket.on('web:mark-read', (data: { conversationId: string }) => {
        this.handleWebMarkRead(socket, data);
      });

      // Handle web request for initial data
      socket.on('web:request-sync', () => {
        this.handleWebRequestSync(socket);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleMobileRegister(socket: Socket, data: { deviceId: string; deviceName: string; deviceModel: string }): Promise<void> {
    const { deviceId, deviceName, deviceModel } = data;
    
    try {
      await AuthService.registerDevice(deviceId, deviceName, deviceModel);
      this.mobileDevices.set(deviceId, socket);
      socket.data.deviceId = deviceId;
      socket.data.type = 'mobile';
      
      socket.emit('authenticated', { success: true });
      console.log(`📱 Mobile registered: ${deviceId} (${deviceName})`);
    } catch (error) {
      socket.emit('error', { message: 'Registration failed' });
      console.error('Mobile registration error:', error);
    }
  }

  private async handleQRScan(socket: Socket, data: { qrData: string; deviceId: string }): Promise<void> {
    const { qrData, deviceId } = data;
    
    try {
      const qrPayload = JSON.parse(qrData);
      const device = this.mobileDevices.get(deviceId);
      
      if (!device) {
        socket.emit('error', { message: 'Device not registered' });
        return;
      }

      const result = await AuthService.verifyQRToken(
        qrData,
        deviceId,
        socket.data.deviceName || 'Unknown',
        socket.data.deviceModel || 'Unknown'
      );

      if (result.success && result.sessionToken) {
        // Notify the web client waiting for this QR code
        const resolver = this.pendingQRPairings.get(qrPayload.token);
        if (resolver) {
          resolver(result.sessionToken);
          this.pendingQRPairings.delete(qrPayload.token);
        }

        socket.emit('qr:paired', { success: true });
        console.log(`✅ QR paired for device: ${deviceId}`);
      } else {
        socket.emit('error', { message: result.error || 'Pairing failed' });
      }
    } catch (error) {
      socket.emit('error', { message: 'Invalid QR code' });
      console.error('QR scan error:', error);
    }
  }

  private handleMobileMessages(socket: Socket, data: { messages: Message[] }): void {
    const deviceId = socket.data.deviceId;
    if (!deviceId) return;

    // Broadcast to all web sessions for this device
    const sessions = this.deviceToSessions.get(deviceId);
    if (sessions) {
      sessions.forEach(sessionToken => {
        const webSocket = this.webSessions.get(sessionToken);
        if (webSocket) {
          webSocket.emit('messages:sync', { messages: data.messages });
        }
      });
    }
  }

  private handleMobileConversations(socket: Socket, data: { conversations: Conversation[] }): void {
    const deviceId = socket.data.deviceId;
    if (!deviceId) return;

    // Broadcast to all web sessions for this device
    const sessions = this.deviceToSessions.get(deviceId);
    if (sessions) {
      sessions.forEach(sessionToken => {
        const webSocket = this.webSessions.get(sessionToken);
        if (webSocket) {
          webSocket.emit('conversations:sync', { conversations: data.conversations });
        }
      });
    }
  }

  private handleMessageStatus(socket: Socket, data: { messageId: string; status: string }): void {
    const deviceId = socket.data.deviceId;
    if (!deviceId) return;

    // Broadcast to all web sessions
    const sessions = this.deviceToSessions.get(deviceId);
    if (sessions) {
      sessions.forEach(sessionToken => {
        const webSocket = this.webSessions.get(sessionToken);
        if (webSocket) {
          webSocket.emit('message:status', data);
        }
      });
    }
  }

  private async handleWebAuthenticate(socket: Socket, data: { sessionToken: string }): Promise<void> {
    const { sessionToken } = data;
    
    try {
      const result = await AuthService.verifySessionToken(sessionToken);
      
      if (result.valid && result.deviceId) {
        this.webSessions.set(sessionToken, socket);
        socket.data.sessionToken = sessionToken;
        socket.data.deviceId = result.deviceId;
        socket.data.type = 'web';

        // Track session for this device
        if (!this.deviceToSessions.has(result.deviceId)) {
          this.deviceToSessions.set(result.deviceId, new Set());
        }
        this.deviceToSessions.get(result.deviceId)!.add(sessionToken);

        socket.emit('authenticated', { success: true, deviceId: result.deviceId });
        console.log(`🌐 Web authenticated: ${result.deviceId}`);

        // Request initial sync from mobile
        const mobileSocket = this.mobileDevices.get(result.deviceId);
        if (mobileSocket) {
          mobileSocket.emit('request:sync');
        }
      } else {
        socket.emit('error', { message: result.error || 'Authentication failed' });
      }
    } catch (error) {
      socket.emit('error', { message: 'Authentication failed' });
      console.error('Web auth error:', error);
    }
  }

  private handleWebSendMessage(socket: Socket, data: { phoneNumber: string; message: string; tempId: string }): void {
    const deviceId = socket.data.deviceId;
    if (!deviceId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const mobileSocket = this.mobileDevices.get(deviceId);
    if (mobileSocket) {
      mobileSocket.emit('send:message', data);
      console.log(`📤 Send message request: ${deviceId} -> ${data.phoneNumber}`);
    } else {
      socket.emit('error', { message: 'Mobile device not connected' });
    }
  }

  private handleWebMarkRead(socket: Socket, data: { conversationId: string }): void {
    const deviceId = socket.data.deviceId;
    if (!deviceId) return;

    const mobileSocket = this.mobileDevices.get(deviceId);
    if (mobileSocket) {
      mobileSocket.emit('mark:read', data);
    }
  }

  private handleWebRequestSync(socket: Socket): void {
    const deviceId = socket.data.deviceId;
    if (!deviceId) return;

    const mobileSocket = this.mobileDevices.get(deviceId);
    if (mobileSocket) {
      mobileSocket.emit('request:sync');
    }
  }

  private handleDisconnect(socket: Socket): void {
    const { type, deviceId, sessionToken } = socket.data;

    if (type === 'mobile' && deviceId) {
      this.mobileDevices.delete(deviceId);
      console.log(`📱 Mobile disconnected: ${deviceId}`);
      
      // Notify all web sessions
      const sessions = this.deviceToSessions.get(deviceId);
      if (sessions) {
        sessions.forEach(token => {
          const webSocket = this.webSessions.get(token);
          if (webSocket) {
            webSocket.emit('mobile:disconnected');
          }
        });
      }
    } else if (type === 'web' && sessionToken) {
      this.webSessions.delete(sessionToken);
      
      if (deviceId) {
        const sessions = this.deviceToSessions.get(deviceId);
        if (sessions) {
          sessions.delete(sessionToken);
          if (sessions.size === 0) {
            this.deviceToSessions.delete(deviceId);
          }
        }
      }
      
      console.log(`🌐 Web disconnected: ${sessionToken}`);
    }

    console.log(`🔌 Disconnected: ${socket.id}`);
  }

  /**
   * Wait for QR pairing
   */
  waitForQRPairing(token: string, timeout: number = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingQRPairings.set(token, { resolve });

      setTimeout(() => {
        if (this.pendingQRPairings.has(token)) {
          this.pendingQRPairings.delete(token);
          reject(new Error('QR pairing timeout'));
        }
      }, timeout);
    });
  }

  /**
   * Broadcast new message to all connected clients for a device
   */
  broadcastNewMessage(deviceId: string, message: Message): void {
    // Send to mobile
    const mobileSocket = this.mobileDevices.get(deviceId);
    if (mobileSocket) {
      mobileSocket.emit('message:new', message);
    }

    // Send to all web sessions
    const sessions = this.deviceToSessions.get(deviceId);
    if (sessions) {
      sessions.forEach(sessionToken => {
        const webSocket = this.webSessions.get(sessionToken);
        if (webSocket) {
          webSocket.emit('message:new', message);
        }
      });
    }
  }
}

export default new SocketService();
