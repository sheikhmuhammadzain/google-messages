import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Keyboard, Platform, DeviceEventEmitter, Alert } from 'react-native';
import { TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MessageBubble from '../../src/components/MessageBubble';
import SimSelector from '../../src/components/SimSelector';
import SimIndicator from '../../src/components/SimIndicator';
import { Message, SimCard } from '../../src/types';
import { COLORS } from '../../src/config/constants';
import smsService from '../../src/services/smsService';
import socketService from '../../src/services/socketService';
import contactsService from '../../src/services/contactsService';
import dualSimService from '../../src/services/dualSimService';
import { useSmsListener } from '../../src/hooks/useSmsListener';
import usePermissions from '../../src/hooks/usePermissions';
import PermissionRequest from '../../src/components/PermissionRequest';
import DefaultSmsAppBanner from '../../src/components/DefaultSmsAppBanner';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const phoneNumber = id as string;
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [contactName, setContactName] = useState(phoneNumber);
  const [selectedSim, setSelectedSim] = useState<SimCard | null>(null);
  const [showSimSelector, setShowSimSelector] = useState(false);
  const [isDualSim, setIsDualSim] = useState(false);
  const flatListRef = useRef<any>(null);
  const permissions = usePermissions();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const insets = useSafeAreaInsets();
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  // Extra padding to keep the input clearly above the keyboard on Android
  const KEYBOARD_EXTRA_OFFSET = 32;

  // Handle incoming SMS messages in real-time
  useSmsListener({
    onSmsReceived: useCallback((event: any) => {
      // Only process messages from this conversation
      if (event.phoneNumber === phoneNumber) {
        console.log('New message received for this chat:', event.body);
        
        // Add new message to the list immediately
        const newMessage: Message = {
          id: `msg_${event.timestamp}`,
          conversationId: phoneNumber,
          phoneNumber: event.phoneNumber,
          body: event.body,
          timestamp: event.timestamp,
          type: 'received',
          read: false,
        };
        
        setMessages((prev) => [...prev, newMessage]);
        
        // Scroll to bottom to show the new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd?.({ animated: true });
        }, 100);
        
        // Sync to socket
        if (socketService.connected) {
          socketService.syncMessages([newMessage]);
        }
      }
  }, [phoneNumber]),
  });

  const handleRetryPermissions = async () => {
    await permissions.requestSmsPermissions();
  };

  useEffect(() => {
    console.log('[Chat] Screen mounted for:', phoneNumber);
    
    // Only initialize chat if we have permissions
    if (permissions.hasSmsPermissions) {
      console.log('[Chat] Initializing chat with permissions');
      
      // Load messages first
      loadMessages();
      loadContactInfo();
      loadSimInfo();
      
      // Immediately emit softRead event to clear badge in UI
      DeviceEventEmitter.emit('conversation:softRead', { phoneNumber });
      console.log('[Chat] Emitted immediate softRead event');
      
      // Mark conversation as read after a short delay (to ensure messages are loaded)
      setTimeout(() => {
        markConversationAsRead();
      }, 500);
    }
  }, [phoneNumber, insets?.bottom, permissions.hasSmsPermissions]);

  // Periodic tick for UI that depends on current time (e.g., delivery delays)
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Respond to server sync requests (simple conflict resolution by pushing fresh state)
  useEffect(() => {
    const handler = () => {
      console.log('[Chat] request:sync received - syncing messages for this conversation');
      // Reload and emit current state
      loadMessages(false);
    };
    socketService.on('request:sync', handler);
    return () => socketService.off('request:sync', handler);
  }, []);

  // Keyboard listeners (Android) to keep input above keyboard reliably
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const height = e.endCoordinates?.height ?? 0;
      // Calculate offset to keep input clearly visible above keyboard
      // Add extra padding for better visibility and send button access
      const offset = height + KEYBOARD_EXTRA_OFFSET;
      setKeyboardOffset(offset);
      console.log(`[Chat] Keyboard shown: height=${height}, offset=${offset}`);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
      console.log('[Chat] Keyboard hidden, offset reset to 0');
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const markConversationAsRead = async () => {
    try {
      console.log('[Chat] Marking conversation as read:', phoneNumber);

      // Snapshot current unread count locally
      const unreadBefore = messages.filter(m => m.type === 'received' && !m.read).length;
      console.log(`[Chat] Found ${unreadBefore} unread messages locally`);

      // Mark messages as read in database
      await smsService.markAsRead(phoneNumber);
      console.log('[Chat] markAsRead invoked');
      
      // Wait for Android SMS database to propagate changes before updating lists
      await new Promise(resolve => setTimeout(resolve, 800));

      // Recompute from DB to verify if unread are cleared
      let clearedViaDb = false;
      try {
        const convs = await smsService.getConversations();
        const conv = convs.find(c => c.phoneNumber === phoneNumber);
        clearedViaDb = !conv || conv.unreadCount === 0;
        console.log(`[Chat] DB verification: conversation found=${!!conv}, unreadCount=${conv?.unreadCount || 0}, clearedViaDb=${clearedViaDb}`);

        // Sync to web regardless
        if (socketService.connected) {
          socketService.syncConversations(convs);
        }
      } catch (e) {
        console.log('[Chat] Could not fetch conversations after mark-as-read:', e);
      }

      // Always emit softRead event as primary method to ensure UI updates
      DeviceEventEmitter.emit('conversation:softRead', { phoneNumber });
      console.log('[Chat] Emitted softRead event (primary)');

      // Also emit read event if DB was successfully cleared
      if (clearedViaDb) {
        DeviceEventEmitter.emit('conversation:read', { phoneNumber });
        console.log('[Chat] Also emitted read event (DB confirmed)');
      }
    } catch (error) {
      console.error('[Chat] Error marking conversation as read:', error);
      // On error, still soft-update UI to avoid stale badge
      DeviceEventEmitter.emit('conversation:softRead', { phoneNumber });
      console.log('[Chat] Emitted softRead event (error fallback)');
    }
  };

  const loadContactInfo = async () => {
    try {
      const name = await contactsService.getContactName(phoneNumber);
      setContactName(name);
    } catch (error) {
      console.log('Could not load contact name:', error);
      setContactName(contactsService.formatPhoneNumber(phoneNumber));
    }
  };

  // Load messages. When showLoading is false, avoid showing the full-screen loader
  const loadMessages = async (showLoading: boolean = true) => {
    try {
      console.log('[Chat] Loading messages for:', phoneNumber, 'showLoading=', showLoading);
      if (showLoading) setIsLoading(true);
      const msgs = await smsService.readConversationMessages(phoneNumber);
      const sortedMessages = msgs.sort((a, b) => a.timestamp - b.timestamp);
      console.log(`[Chat] Loaded ${sortedMessages.length} messages`);
      setMessages(sortedMessages);
      
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        flatListRef.current?.scrollToEnd?.({ animated: false });
        console.log('[Chat] Scrolled to bottom after loading');
      }, 150);
      
      // Sync to web
      if (socketService.connected) {
        socketService.syncMessages(sortedMessages);
      }
    } catch (error) {
      console.error('[Chat] Error loading messages:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadSimInfo = async () => {
    try {
      // Check if device has dual SIM
      const hasDualSim = dualSimService.isDualSimDevice();
      setIsDualSim(hasDualSim);
      
      if (hasDualSim) {
        // Get recommended SIM for this contact
        const recommendedSim = await dualSimService.getRecommendedSimForContact(phoneNumber);
        setSelectedSim(recommendedSim);
        console.log('Loaded dual SIM for chat, selected:', recommendedSim?.displayName);
      } else {
        // Single SIM - get the default one
        const defaultSim = dualSimService.getDefaultSimCard();
        setSelectedSim(defaultSim);
        console.log('Loaded single SIM for chat:', defaultSim?.displayName);
      }
    } catch (error) {
      console.error('Error loading SIM info:', error);
      // Don't use dual SIM if there's an error
      setIsDualSim(false);
      setSelectedSim(null);
    }
  };

  // Robust status updater that works even if the temp message gets replaced by DB entry
  const updateMessageStatusLocal = useCallback((opts: { id?: string; body?: string; sentAt?: number; status: 'sent' | 'delivered' | 'failed' }) => {
    setMessages(prev => {
      let updated = false;
      const next = prev.map(m => {
        if (opts.id && m.id === opts.id) {
          updated = true;
          return { ...m, status: opts.status };
        }
        return m;
      });

      if (updated) return next;

      // Fallback: try to match by content and timestamp proximity (if DB replaced the temp ID)
      if (opts.body && opts.sentAt !== undefined) {
        const PROXIMITY_MS = 15_000; // 15s window
        const idx = next.findIndex(m => m.type === 'sent' && m.body === opts.body && Math.abs(m.timestamp - opts.sentAt!) <= PROXIMITY_MS);
        if (idx !== -1) {
          const copy = [...next];
          copy[idx] = { ...copy[idx], status: opts.status };
          return copy;
        }
      }

      return next;
    });
  }, []);


  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: Message = {
      id: messageId,
      conversationId: phoneNumber,
      phoneNumber,
      body: messageText.trim(),
      timestamp: Date.now(),
      type: 'sent',
      status: 'sending',
      read: true,
    };

    // Add to UI immediately
    setMessages((prev) => [...prev, tempMessage]);
    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);
    
    // Scroll to bottom to show the new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd?.({ animated: true });
    }, 150);

    // Store timeout reference to clear it when status updates
    let statusTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Register status listener for this message
    smsService.registerStatusListener(messageId, (status, error) => {
      console.log(`Message ${messageId} status:`, status, error);
      
      // Clear the timeout since we got a status update
      if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
      }
      
      // Update status by ID, or fallback by content+time if DB replaced temp ID
      updateMessageStatusLocal({ id: messageId, body: textToSend, sentAt: tempMessage.timestamp, status: status === 'failed' ? 'failed' : (status === 'delivered' ? 'delivered' : 'sent') });

      // Show error if failed
      if (status === 'failed' && error) {
        alert(`Failed to send: ${error}`);
      }

      // Clear sending state when message is confirmed sent or failed
      if (status === 'sent' || status === 'delivered' || status === 'failed') {
        setIsSending(false);
        console.log('Message status updated, isSending set to false');
      }
      
      // Clean up listener after delivery or failure
      if (status === 'delivered' || status === 'failed') {
        setTimeout(() => smsService.unregisterStatusListener(messageId), 5000);
      }
    });

    try {
      // Send SMS with message ID for tracking (and subscription ID for dual SIM)
      // Only pass subscriptionId if we're on dual SIM device and have a valid selection
      let subscriptionId: number | undefined = undefined;
      
      if (isDualSim && selectedSim?.subscriptionId !== undefined) {
        subscriptionId = selectedSim.subscriptionId;
        console.log('Sending SMS via dual SIM - subscriptionId:', subscriptionId, 'SIM:', selectedSim.displayName);
      } else {
        console.log('Sending SMS via default method (no dual SIM)');
      }
      
      await smsService.sendSMS(phoneNumber, textToSend, messageId, subscriptionId);
      
      // Initial status update (actual status may also come from broadcast receiver)
      updateMessageStatusLocal({ id: messageId, body: textToSend, sentAt: tempMessage.timestamp, status: 'sent' });

      // Set a timeout to clear sending state if no status update comes through
      statusTimeout = setTimeout(() => {
        setIsSending(false);
        console.log('Sending state cleared by timeout - no status update received');
      }, 3000); // 3 second timeout

      // Notify socket
      socketService.updateMessageStatus(messageId, 'sent');

      // Reload to get the actual message from SMS database (no full-screen loader)
      setTimeout(() => {
        loadMessages(false);
        // Emit event so inbox can refresh
        socketService.emitToServer('message:sent', { phoneNumber, messageId });
      }, 800);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Clear the timeout since we got an error
      if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
      }
      
      const errorMessage = error?.message || 'Failed to send message. Please try again.';
      
      // Show user-friendly error alert
      alert(errorMessage);
      
      // Mark as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        )
      );

      // Unregister listener on immediate error
      smsService.unregisterStatusListener(messageId);
      
      // Clear sending state on error
      setIsSending(false);
      console.log('Send failed, isSending set to false');
    }
  };

  const handleRetryMessage = async (message: Message) => {
    if (isSending) return;

    // Ensure we still have permissions before retrying
    const hasPerms = await smsService.hasPermissions();
    if (!hasPerms) {
      Alert.alert(
        'Permissions Required',
        'SMS permissions are required to send messages. Please enable them in Settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Remove failed message from UI
    setMessages((prev) => prev.filter((msg) => msg.id !== message.id));

    // Create new message with original content
    const newMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const retryMessage: Message = {
      ...message,
      id: newMessageId,
      status: 'sending',
      timestamp: Date.now(),
    };

    // Add back to UI
    setMessages((prev) => [...prev, retryMessage]);
    setIsSending(true);

    // Register status listener
    smsService.registerStatusListener(newMessageId, (status, error) => {
      updateMessageStatusLocal({ id: newMessageId, body: retryMessage.body, sentAt: retryMessage.timestamp, status: status === 'failed' ? 'failed' : (status === 'delivered' ? 'delivered' : 'sent') });

      if (status === 'failed' && error) {
        alert(`Retry failed: ${error}`);
      }

      if (status === 'delivered' || status === 'failed') {
        setTimeout(() => smsService.unregisterStatusListener(newMessageId), 5000);
      }
    });

    try {
      const subscriptionId = selectedSim?.subscriptionId;
      console.log('Retrying SMS with subscriptionId:', subscriptionId, 'from SIM:', selectedSim?.displayName);
      await smsService.sendSMS(phoneNumber, retryMessage.body, newMessageId, subscriptionId);
      
      updateMessageStatusLocal({ id: newMessageId, body: retryMessage.body, sentAt: retryMessage.timestamp, status: 'sent' });

      socketService.updateMessageStatus(newMessageId, 'sent');
      setTimeout(() => loadMessages(false), 800);
    } catch (error: any) {
      console.error('Error retrying message:', error);
      alert(error?.message || 'Retry failed. Please try again.');
      
      updateMessageStatusLocal({ id: newMessageId, body: retryMessage.body, sentAt: retryMessage.timestamp, status: 'failed' });

      smsService.unregisterStatusListener(newMessageId);
      
      // Clear sending state on error
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    try {
      console.log('[Chat] Deleting message:', message.id);
      
      // Optimistically remove from UI
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      
      // Delete from Android SMS database
      await smsService.deleteSms(message.id);
      console.log('[Chat] Message deleted successfully');
      
      // Notify web client if connected
      if (socketService.connected) {
        socketService.emitToServer('message:deleted', { 
          messageId: message.id, 
          phoneNumber 
        });
      }
      
      // Optionally reload messages to ensure consistency
      // Uncomment if you want to refresh from database after delete
      // setTimeout(() => loadMessages(), 500);
      
    } catch (error: any) {
      console.error('[Chat] Error deleting message:', error);
      
      // Restore message in UI if delete failed
      setMessages((prev) => {
        // Re-insert the message at the correct position based on timestamp
        const updatedMessages = [...prev, message];
        return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Show error to user
      alert(error?.message || 'Failed to delete message. Please try again.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble 
      message={item}
      currentTime={nowTick}
      onRetry={item.status === 'failed' ? () => handleRetryMessage(item) : undefined}
      onDelete={() => handleDeleteMessage(item)}
    />
  );

  // Show permission request screen if permissions not granted
  if (permissions.needsPermissionSetup) {
    return <PermissionRequest onRetry={handleRetryPermissions} isLoading={permissions.isLoading} />;
  }

  // Show loading while checking permissions or loading conversations
  if (permissions.hasSmsPermissions === null || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: contactName,
          headerBackTitle: 'Messages',
        }} 
      />
      <View style={styles.container}>
        {/* Default SMS App Banner */}
        {permissions.needsDefaultSmsSetup && !bannerDismissed && (
          <DefaultSmsAppBanner
            onSetDefault={permissions.requestDefaultSmsApp}
            onDismiss={() => setBannerDismissed(true)}
            isLoading={permissions.isLoading}
          />
        )}
        <KeyboardAwareFlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          // Keyboard-aware scroll view props
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          // Larger extra scroll to keep last message and input clearly visible above keyboard
          extraScrollHeight={64}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
          // Additional props for better keyboard handling
          extraHeight={16}
          // Auto-scroll behavior
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new messages arrive
            setTimeout(() => {
              flatListRef.current?.scrollToEnd?.({ animated: true });
            }, 100);
          }}
          onLayout={() => {
            // Scroll to bottom on initial layout
            setTimeout(() => {
              flatListRef.current?.scrollToEnd?.({ animated: false });
            }, 100);
          }}
          // Keep scroll position stable
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />

        <View style={[
          styles.inputContainer,
          // Push input above keyboard on Android using measured offset
          Platform.OS === 'android' ? { marginBottom: keyboardOffset } : { paddingBottom: insets.bottom }
        ]}>
          {isDualSim && selectedSim && (
            <SimIndicator 
              selectedSim={selectedSim} 
              onPress={() => setShowSimSelector(true)}
              compact
            />
          )}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Text message"
              placeholderTextColor={COLORS.textTertiary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              cursorColor={COLORS.primary}
              selectionColor={COLORS.primaryLight}
              textColor={COLORS.textPrimary}
              onFocus={() => {
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd?.({ animated: true });
                }, 300);
              }}
            />
          </View>
          <IconButton
            icon="send"
            size={24}
            iconColor={messageText.trim() ? COLORS.primary : COLORS.textDisabled}
            disabled={!messageText.trim() || isSending}
            onPress={handleSendMessage}
            style={messageText.trim() && styles.sendButtonActive}
          />
        </View>
      </View>
      
      <SimSelector
        visible={showSimSelector}
        onDismiss={() => setShowSimSelector(false)}
        onSelect={(sim) => setSelectedSim(sim)}
        currentSimId={selectedSim?.subscriptionId}
        phoneNumber={phoneNumber}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
  },
  messagesList: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Ensure input container stays above keyboard
    zIndex: 1000,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 24,
    marginRight: 8,
    minHeight: 48,
    maxHeight: 120,
    justifyContent: 'center',
    // Ensure input wrapper is clearly visible
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonActive: {
    backgroundColor: COLORS.primaryLight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});
