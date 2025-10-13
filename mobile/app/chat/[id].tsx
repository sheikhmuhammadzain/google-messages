import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Keyboard, Platform } from 'react-native';
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
  const insets = useSafeAreaInsets();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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

  useEffect(() => {
    console.log('[Chat] Screen mounted for:', phoneNumber);
    
    // Load messages first
    loadMessages();
    loadContactInfo();
    loadSimInfo();
    
    // Mark conversation as read after a short delay (to ensure messages are loaded)
    setTimeout(() => {
      markConversationAsRead();
    }, 500);

    // Keyboard listeners (Android) to keep input above keyboard reliably
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const height = e.endCoordinates?.height ?? 0;
      // Subtract bottom inset to avoid double spacing
      const offset = Math.max(height - (insets?.bottom ?? 0), 0);
      setKeyboardOffset(offset);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [phoneNumber, insets?.bottom]);

  const markConversationAsRead = async () => {
    try {
      console.log('[Chat] Marking conversation as read:', phoneNumber);
      
      // Mark messages as read in database
      await smsService.markAsRead(phoneNumber);
      console.log('[Chat] Conversation marked as read successfully');
      
      // Emit local event so inbox can update immediately
      DeviceEventEmitter.emit('conversation:read', { phoneNumber });
      
      // Wait longer for Android SMS database to update and sync
      // The content provider might need time to propagate changes
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Notify web client if connected
      if (socketService.connected) {
        socketService.emitToServer('conversation:read', { phoneNumber });
      }
      
      console.log('[Chat] Mark as read complete - inbox will refresh on focus');
    } catch (error) {
      console.error('[Chat] Error marking conversation as read:', error);
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

    // Register status listener for this message
    smsService.registerStatusListener(messageId, (status, error) => {
      console.log(`Message ${messageId} status:`, status, error);
      
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            if (status === 'sent' || status === 'delivered') {
              return { ...msg, status: 'sent' };
            } else if (status === 'failed') {
              return { ...msg, status: 'failed' };
            }
          }
          return msg;
        })
      );

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
      // Check permissions first
      const hasPerms = await smsService.hasPermissions();
      if (!hasPerms) {
        const granted = await smsService.requestPermissions();
        if (!granted) {
          throw new Error('SMS permissions are required to send messages. Please enable them in Settings.');
        }
      }
      
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
      
      // Initial status update (actual status will come from broadcast receiver)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      );

      // Ensure UI doesn't stay in sending state if sent broadcast is delayed
      setIsSending(false);

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
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === newMessageId) {
            if (status === 'sent' || status === 'delivered') {
              return { ...msg, status: 'sent' };
            } else if (status === 'failed') {
              return { ...msg, status: 'failed' };
            }
          }
          return msg;
        })
      );

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
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessageId ? { ...msg, status: 'sent' } : msg
        )
      );

      socketService.updateMessageStatus(newMessageId, 'sent');
      setTimeout(() => loadMessages(false), 800);
    } catch (error: any) {
      console.error('Error retrying message:', error);
      alert(error?.message || 'Retry failed. Please try again.');
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessageId ? { ...msg, status: 'failed' } : msg
        )
      );

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
      onRetry={item.status === 'failed' ? () => handleRetryMessage(item) : undefined}
      onDelete={() => handleDeleteMessage(item)}
    />
  );

  if (isLoading) {
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
        <KeyboardAwareFlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          // Keyboard-aware scroll view props
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={24}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 24,
    marginRight: 4,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
});
