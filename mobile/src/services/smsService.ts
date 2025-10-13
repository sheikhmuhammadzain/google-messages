import { PermissionsAndroid, Platform, Linking, NativeEventEmitter } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { Message, Conversation } from '../types';
import { NativeModules } from 'react-native';

const { EnhancedSmsManager, DefaultSmsModule } = NativeModules;

class SMSService {
  private eventEmitter: NativeEventEmitter | null = null;
  private smsStatusListeners: Map<string, (status: string, error?: string) => void> = new Map();

  constructor() {
    // Initialize event emitter for SMS status updates
    if (Platform.OS === 'android' && EnhancedSmsManager) {
      this.eventEmitter = new NativeEventEmitter(EnhancedSmsManager);
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners for SMS status updates
   */
  private setupEventListeners() {
    if (!this.eventEmitter) return;

    // Listen for SMS sent status
    this.eventEmitter.addListener('onSmsSent', (data: any) => {
      console.log('SMS sent status:', data);
      const listener = this.smsStatusListeners.get(data.messageId);
      if (listener) {
        listener(data.status, data.error);
      }
    });

    // Listen for SMS delivered status
    this.eventEmitter.addListener('onSmsDelivered', (data: any) => {
      console.log('SMS delivered status:', data);
      const listener = this.smsStatusListeners.get(data.messageId);
      if (listener) {
        listener(data.status, data.error);
      }
    });
  }

  /**
   * Register a listener for message status updates
   */
  registerStatusListener(messageId: string, callback: (status: string, error?: string) => void) {
    this.smsStatusListeners.set(messageId, callback);
  }

  /**
   * Unregister a status listener
   */
  unregisterStatusListener(messageId: string) {
    this.smsStatusListeners.delete(messageId);
  }

  /**
   * Request SMS permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      return (
        granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.SEND_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const readSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      const sendSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
      return readSms && sendSms;
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
      return false;
    }
  }

  /**
   * Read all SMS messages
   */
  async readAllMessages(): Promise<Message[]> {
    return new Promise(async (resolve, reject) => {
      if (Platform.OS !== 'android') {
        resolve([]);
        return;
      }

      // Check permissions first
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        reject(new Error('SMS permissions not granted. Please enable SMS permissions in app settings.'));
        return;
      }

      const filter = {
        box: 'inbox', // 'inbox' (1), 'sent' (2), 'draft' (3), 'outbox' (4), 'failed' (5), 'queued' (6)
        indexFrom: 0,
        maxCount: 1000,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('Failed to read messages:', fail);
          reject(new Error(fail));
        },
        (count: number, smsList: string) => {
          try {
            const messages: any[] = JSON.parse(smsList);
            const formattedMessages: Message[] = messages.map((sms) => ({
              id: sms._id.toString(),
              conversationId: sms.thread_id?.toString() || sms.address,
              phoneNumber: sms.address,
              body: sms.body,
              timestamp: parseInt(sms.date),
              type: sms.type === '1' ? 'received' : 'sent',
              status: sms.type === '2' ? 'sent' : undefined,
              read: sms.read === '1',
            }));
            resolve(formattedMessages);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Read messages for a specific conversation
   */
  async readConversationMessages(phoneNumber: string): Promise<Message[]> {
    return new Promise(async (resolve, reject) => {
      if (Platform.OS !== 'android') {
        resolve([]);
        return;
      }

      // Check permissions first
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        reject(new Error('SMS permissions not granted. Please enable SMS permissions in app settings.'));
        return;
      }

      const filter = {
        box: '',
        address: phoneNumber,
        indexFrom: 0,
        maxCount: 500,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('Failed to read conversation:', fail);
          reject(new Error(fail));
        },
        (count: number, smsList: string) => {
          try {
            const messages: any[] = JSON.parse(smsList);
            const formattedMessages: Message[] = messages.map((sms) => ({
              id: sms._id.toString(),
              conversationId: sms.thread_id?.toString() || sms.address,
              phoneNumber: sms.address,
              body: sms.body,
              timestamp: parseInt(sms.date),
              type: sms.type === '1' ? 'received' : 'sent',
              status: sms.type === '2' ? 'sent' : undefined,
              read: sms.read === '1',
            }));
            resolve(formattedMessages);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Get conversations grouped by phone number
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const messages = await this.readAllMessages();
      const conversationsMap = new Map<string, Conversation>();

      messages.forEach((message) => {
        const { phoneNumber, body, timestamp, read } = message;

        if (!conversationsMap.has(phoneNumber)) {
          conversationsMap.set(phoneNumber, {
            id: phoneNumber,
            phoneNumber,
            lastMessage: body,
            lastMessageTime: timestamp,
            unreadCount: read ? 0 : 1,
          });
        } else {
          const conv = conversationsMap.get(phoneNumber)!;
          
          // Update if this message is newer
          if (timestamp > conv.lastMessageTime) {
            conv.lastMessage = body;
            conv.lastMessageTime = timestamp;
          }
          
          // Increment unread count
          if (!read) {
            conv.unreadCount++;
          }
        }
      });

      // Convert to array and sort by last message time
      return Array.from(conversationsMap.values()).sort(
        (a, b) => b.lastMessageTime - a.lastMessageTime
      );
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  /**
   * Send SMS message using Enhanced SMS Manager (with optional SIM selection)
   */
  async sendSMS(phoneNumber: string, message: string, messageId?: string, subscriptionId?: number): Promise<boolean> {
    if (Platform.OS !== 'android') {
      throw new Error('SMS sending is only supported on Android');
    }

    // Check permissions first
    const hasPerms = await this.hasPermissions();
    if (!hasPerms) {
      throw new Error('SMS permissions not granted. Please enable SMS permissions in Settings.');
    }

    // Validate phone number
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new Error('Invalid phone number. Please enter a valid phone number.');
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty. Please enter a message.');
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/[\s-()]/g, '');
    
    // Generate message ID if not provided
    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Use DualSimManager if subscription ID is provided
      if (subscriptionId !== undefined && subscriptionId !== -1) {
        const { DualSimManager } = NativeModules;
        if (DualSimManager) {
          try {
            console.log(`Attempting to send SMS via subscription ID: ${subscriptionId}`);
            await DualSimManager.sendSmsWithSim(cleanNumber, message, msgId, subscriptionId);
            console.log('SMS sent successfully via DualSimManager');
            return true;
          } catch (simError: any) {
            console.warn('DualSimManager failed, falling back to default SMS manager:', simError);
            // Don't throw here, fall through to default SMS manager
          }
        }
      }
      
      // Try using EnhancedSmsManager (better tracking)
      if (EnhancedSmsManager) {
        console.log('Using EnhancedSmsManager for sending');
        await EnhancedSmsManager.sendSMS(cleanNumber, message, msgId);
        console.log('SMS sent successfully via EnhancedSmsManager');
        return true;
      }
      
      // Fallback to SmsAndroid if EnhancedSmsManager is not available
      console.log('Using SmsAndroid fallback for sending');
      return new Promise((resolve, reject) => {
        SmsAndroid.autoSend(
          cleanNumber,
          message,
          (fail: string) => {
            console.error('Failed to send SMS via SmsAndroid:', fail);
            reject(new Error(`Failed to send message: ${fail}`));
          },
          (success: string) => {
            console.log('SMS sent successfully via SmsAndroid:', success);
            resolve(true);
          }
        );
      });
    } catch (error: any) {
      // Provide user-friendly error messages
      let errorMessage = 'Failed to send message. ';
      
      if (error.code === 'PERMISSION_DENIED') {
        errorMessage += 'SMS permission denied. Please grant SMS permissions in Settings.';
      } else if (error.code === 'INVALID_NUMBER') {
        errorMessage += 'Invalid phone number format.';
      } else if (error.code === 'INVALID_MESSAGE') {
        errorMessage += 'Message is empty or invalid.';
      } else if (error.message?.includes('No service')) {
        errorMessage += 'No cellular service. Check your connection.';
      } else if (error.message?.includes('Radio off')) {
        errorMessage += 'Airplane mode is on. Turn off airplane mode.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if app is the default SMS app
   */
  async isDefaultSmsApp(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const { DefaultSmsModule } = NativeModules;
      if (DefaultSmsModule) {
        return await DefaultSmsModule.isDefaultSmsApp();
      }
      return false;
    } catch (error) {
      console.error('Error checking default SMS app status:', error);
      return false;
    }
  }

  /**
   * Request to set app as default SMS app
   */
  async requestDefaultSmsApp(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const { DefaultSmsModule } = NativeModules;
      if (DefaultSmsModule) {
        await DefaultSmsModule.requestDefaultSmsApp();
      } else {
        // Fallback to opening settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error requesting default SMS app:', error);
      // Fallback to opening settings
      await Linking.openSettings();
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    // This requires direct database access or system API
    // For now, this is a placeholder
    console.log('Mark as read:', messageId);
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (Platform.OS !== 'android') {
        reject(new Error('Delete is only supported on Android'));
        return;
      }

      SmsAndroid.delete(
        messageId,
        (fail: string) => {
          console.error('Failed to delete message:', fail);
          reject(new Error(fail));
        },
        (success: string) => {
          console.log('Message deleted:', success);
          resolve();
        }
      );
    });
  }
}

export default new SMSService();
