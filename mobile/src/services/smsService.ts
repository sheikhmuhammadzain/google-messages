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
    if (!this.eventEmitter) {
      console.log('[smsService] No event emitter available for status updates');
      return;
    }

    console.log('[smsService] Setting up SMS status event listeners...');

    // Listen for SMS sent status
    this.eventEmitter.addListener('onSmsSent', (data: any) => {
      console.log('[smsService] SMS sent status received:', data);
      const listener = this.smsStatusListeners.get(data.messageId);
      if (listener) {
        console.log(`[smsService] Calling status listener for messageId: ${data.messageId}, status: ${data.status}`);
        listener(data.status, data.error);
      } else {
        console.warn(`[smsService] No listener found for messageId: ${data.messageId}`);
      }
    });

    // Listen for SMS delivered status
    this.eventEmitter.addListener('onSmsDelivered', (data: any) => {
      console.log('[smsService] SMS delivered status received:', data);
      const listener = this.smsStatusListeners.get(data.messageId);
      if (listener) {
        console.log(`[smsService] Calling status listener for messageId: ${data.messageId}, status: ${data.status}`);
        listener(data.status, data.error);
      } else {
        console.warn(`[smsService] No listener found for messageId: ${data.messageId}`);
      }
    });

    console.log('[smsService] SMS status event listeners set up successfully');
  }

  /**
   * Register a listener for message status updates
   */
  registerStatusListener(messageId: string, callback: (status: string, error?: string) => void) {
    console.log(`[smsService] Registering status listener for messageId: ${messageId}`);
    this.smsStatusListeners.set(messageId, callback);
    console.log(`[smsService] Total registered listeners: ${this.smsStatusListeners.size}`);
  }

  /**
   * Unregister a status listener
   */
  unregisterStatusListener(messageId: string) {
    console.log(`[smsService] Unregistering status listener for messageId: ${messageId}`);
    this.smsStatusListeners.delete(messageId);
    console.log(`[smsService] Total registered listeners: ${this.smsStatusListeners.size}`);
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
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      return (
        granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.SEND_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.READ_PHONE_STATE'] === PermissionsAndroid.RESULTS.GRANTED
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
      const readPhoneState = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
      return readSms && sendSms && readPhoneState;
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
      return false;
    }
  }

  /**
   * Read all SMS messages (both inbox and sent)
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

      // Read ALL messages (inbox + sent) by using empty box filter
      const filter = {
        box: '', // Empty = all boxes (inbox + sent + drafts, etc.)
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
            const formattedMessages: Message[] = messages
              .map((sms) => {
                // Android SMS types: 1=inbox(received), 2=sent, 3=draft, 4=outbox, 5=failed, 6=queued
                const messageType = parseInt(sms.type);
                const isSent = messageType === 2; // TYPE_SENT
                const isReceived = messageType === 1; // TYPE_INBOX
                
                // Only keep received and sent messages for conversations UI
                if (!isSent && !isReceived) {
                  return null as any;
                }
                
                // Normalize read flag (library may return number or string)
                const readFlag = parseInt(String(sms.read), 10) === 1;
                
                console.log(`[smsService] Message ${sms._id}: type=${messageType}, address=${sms.address}, read=${sms.read}`);
                
                return {
                  id: sms._id.toString(),
                  conversationId: sms.thread_id?.toString() || sms.address,
                  phoneNumber: sms.address,
                  body: sms.body,
                  timestamp: parseInt(sms.date),
                  type: isSent ? 'sent' : 'received',
                  status: isSent ? 'sent' : undefined,
                  read: readFlag,
                } as Message;
              })
              .filter(Boolean) as Message[];
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
            const formattedMessages: Message[] = messages
              .map((sms) => {
                // Android SMS types: 1=inbox(received), 2=sent, 3=draft, 4=outbox, 5=failed, 6=queued
                const messageType = parseInt(sms.type);
                const isSent = messageType === 2; // TYPE_SENT
                const isReceived = messageType === 1; // TYPE_INBOX
                
                if (!isSent && !isReceived) {
                  return null as any;
                }
                
                // Normalize read flag (number or string)
                const readFlag = parseInt(String(sms.read), 10) === 1;
                
                return {
                  id: sms._id.toString(),
                  conversationId: sms.thread_id?.toString() || sms.address,
                  phoneNumber: sms.address,
                  body: sms.body,
                  timestamp: parseInt(sms.date),
                  type: isSent ? 'sent' : 'received',
                  status: isSent ? 'sent' : undefined,
                  read: readFlag,
                } as Message;
              })
              .filter(Boolean) as Message[];
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
        const { phoneNumber, body, timestamp, read, type } = message;

        if (!conversationsMap.has(phoneNumber)) {
          // Create new conversation
          // Only count unread RECEIVED messages (not sent messages)
          const initialUnread = (!read && type === 'received') ? 1 : 0;
          
          conversationsMap.set(phoneNumber, {
            id: phoneNumber,
            phoneNumber,
            lastMessage: body,
            lastMessageTime: timestamp,
            unreadCount: initialUnread,
          });
        } else {
          const conv = conversationsMap.get(phoneNumber)!;
          
          // Update if this message is newer
          if (timestamp > conv.lastMessageTime) {
            conv.lastMessage = body;
            conv.lastMessageTime = timestamp;
          }
          
          // Increment unread count ONLY for unread RECEIVED messages
          // Sent messages are always "read" and should not be counted
          if (!read && type === 'received') {
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
   * Mark message as read by phone number (marks entire conversation as read)
   */
  async markAsRead(phoneNumber: string): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('[smsService] markAsRead: Not Android, skipping');
      return;
    }

    try {
      console.log(`[smsService] markAsRead: Starting for ${phoneNumber}`);
      
      // Check permissions first
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        console.error('[smsService] markAsRead: No SMS permissions');
        throw new Error('SMS permissions not granted');
      }
      console.log('[smsService] markAsRead: SMS permissions verified');
      
      // First, get all unread messages from this phone number
      const messages = await this.readConversationMessages(phoneNumber);
      console.log(`[smsService] Found ${messages.length} total messages`);
      
      const unreadMessages = messages.filter(msg => !msg.read && msg.type === 'received');
      console.log(`[smsService] Found ${unreadMessages.length} unread messages`);
      
      if (unreadMessages.length === 0) {
        console.log('[smsService] No unread messages to mark as read');
        return;
      }

      // Use SmsReadManager native module to mark messages as read
      const { SmsReadManager } = NativeModules;
      if (SmsReadManager && SmsReadManager.markConversationAsRead) {
        try {
          console.log('[smsService] Using SmsReadManager.markConversationAsRead');
          console.log(`[smsService] Calling native method with phoneNumber: ${phoneNumber}`);
          const result = await SmsReadManager.markConversationAsRead(phoneNumber);
          console.log(`[smsService] ✅ Native method returned: ${result} messages marked as read`);
          
          // Verify the changes by re-reading the conversation
          setTimeout(async () => {
            try {
              const verifyMessages = await this.readConversationMessages(phoneNumber);
              const stillUnread = verifyMessages.filter(msg => !msg.read && msg.type === 'received');
              console.log(`[smsService] Verification: ${stillUnread.length} messages still unread after marking as read`);
            } catch (verifyError) {
              console.error('[smsService] Verification failed:', verifyError);
            }
          }, 1000);
          
          return;
        } catch (error: any) {
          console.error('[smsService] SmsReadManager failed:', error);
          
          // Check if error is about not being default SMS app
          if (error.message && error.message.includes('default SMS app')) {
            console.warn('[smsService] App is not default SMS app - this is required on Android 15');
            throw new Error('Cannot mark as read: Please set this app as your default SMS app in Android settings');
          }
          
          throw error;
        }
      } else {
        console.log('[smsService] SmsReadManager not available');
        throw new Error('Cannot mark messages as read: Native module not available');
      }
    } catch (error) {
      console.error('[smsService] ❌ Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Force refresh conversations to sync with Google Messages
   * This can be called after marking as read to ensure Google Messages updates
   */
  async forceRefreshConversations(): Promise<Conversation[]> {
    try {
      console.log('[smsService] Force refreshing conversations to sync with Google Messages...');
      
      // Add a small delay to allow Google Messages to process the changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const conversations = await this.getConversations();
      console.log(`[smsService] Refreshed ${conversations.length} conversations`);
      
      return conversations;
    } catch (error) {
      console.error('[smsService] Error force refreshing conversations:', error);
      return [];
    }
  }

  /**
   * Delete a specific SMS message by ID
   */
  async deleteSms(messageId: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('Delete is only supported on Android');
    }

    console.log(`[smsService] Attempting to delete message with ID: ${messageId}`);

    try {
      // Try using EnhancedSmsManager native method first (more reliable)
      if (EnhancedSmsManager && EnhancedSmsManager.deleteSmsMessage) {
        console.log('[smsService] Using EnhancedSmsManager.deleteSmsMessage');
        await EnhancedSmsManager.deleteSmsMessage(messageId);
        console.log(`[smsService] ✅ Message ${messageId} deleted successfully via native method`);
        return;
      } else {
        console.log('[smsService] EnhancedSmsManager not available, using fallback');
      }

      // Fallback to SmsAndroid if native method not available
      await new Promise<void>((resolve, reject) => {
        SmsAndroid.delete(
          messageId,
          (fail: string) => {
            console.error(`[smsService] Failed to delete message via SmsAndroid:`, fail);
            reject(new Error(fail));
          },
          (success: string) => {
            console.log(`[smsService] ✅ Message ${messageId} deleted via SmsAndroid:`, success);
            resolve();
          }
        );
      });
    } catch (error: any) {
      console.error('[smsService] ❌ Error deleting message:', error);
      throw new Error(error.message || 'Failed to delete message');
    }
  }
}

export default new SMSService();
