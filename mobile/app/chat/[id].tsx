import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
        
        // Sync to socket
        if (socketService.connected) {
          socketService.syncMessages([newMessage]);
        }
      }
    }, [phoneNumber]),
  });

  useEffect(() => {
    loadMessages();
    loadContactInfo();
    loadSimInfo();
    
    // Mark conversation as read when opening
    markConversationAsRead();

    // Keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [phoneNumber]);

  const markConversationAsRead = async () => {
    try {
      await smsService.markAsRead(phoneNumber);
      console.log('Conversation marked as read');
      // Notify web client if connected
      if (socketService.connected) {
        socketService.emitToServer('conversation:read', { phoneNumber });
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
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

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const msgs = await smsService.readConversationMessages(phoneNumber);
      setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
      
      // Sync to web
      if (socketService.connected) {
        socketService.syncMessages(msgs);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
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

      // Notify socket
      socketService.updateMessageStatus(messageId, 'sent');

      // Reload to get the actual message from SMS database
      setTimeout(() => {
        loadMessages();
        // Emit event so inbox can refresh
        socketService.emitToServer('message:sent', { phoneNumber, messageId });
      }, 1500);
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
      setTimeout(() => loadMessages(), 1500);
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

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble 
      message={item} 
      onRetry={item.status === 'failed' ? () => handleRetryMessage(item) : undefined}
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
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        style={styles.messagesContainer}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={[styles.inputContainer, { marginBottom: keyboardHeight > 0 ? 0 : 0 }]}>
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
      </KeyboardAvoidingView>
      
      <SimSelector
        visible={showSimSelector}
        onDismiss={() => setShowSimSelector(false)}
        onSelect={(sim) => setSelectedSim(sim)}
        currentSimId={selectedSim?.subscriptionId}
        phoneNumber={phoneNumber}
      />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  keyboardView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  messagesContainer: {
    flex: 1,
    paddingBottom: 80, // Space for input container
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
