import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { Message } from '../types';
import { formatChatTime } from '../utils/dateUtils';
import { COLORS } from '../config/constants';

interface Props {
  message: Message;
  showTimestamp?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  currentTime?: number;
}

export default function MessageBubble({ message, showTimestamp = true, onRetry, onDelete, currentTime }: Props) {
  const isSent = message.type === 'sent';
  const isFailed = message.status === 'failed';
  const DELIVERY_WARN_MS = 5 * 60 * 1000; // 5 minutes
  const isDeliveryDelayed = isSent && message.status === 'sent' && typeof currentTime === 'number' && (currentTime - message.timestamp) > DELIVERY_WARN_MS;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isSent ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLongPress = () => {
    if (onDelete) {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: onDelete,
          },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isSent ? styles.sentContainer : styles.receivedContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity 
        style={{ width: '100%', alignItems: isSent ? 'flex-end' : 'flex-start' }}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        delayLongPress={500}
      >
        <View style={[styles.bubble, isSent ? styles.sentBubble : styles.receivedBubble, isFailed && styles.failedBubble]}>
        <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
          {message.body}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.timeAndStatus}>
            {showTimestamp && (
              <Text style={[styles.timestamp, isSent ? styles.sentTimestamp : styles.receivedTimestamp]}>
                {formatChatTime(message.timestamp)}
              </Text>
            )}
            
            {isSent && message.status && (
              <Text style={styles.status}>
                {message.status === 'sending' && '⏳'}
                {message.status === 'sent' && (isDeliveryDelayed ? '✓ ⏱️' : '✓')}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'failed' && '✗ Failed'}
              </Text>
            )}
          </View>
          
          {isFailed && onRetry && (
            <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 3,
    paddingHorizontal: 8,
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sentBubble: {
    backgroundColor: COLORS.sentBubble,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: COLORS.receivedBubble,
    borderBottomLeftRadius: 4,
  },
  failedBubble: {
    backgroundColor: '#D32F2F',
    opacity: 0.85,
  },
  footer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  timeAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  sentText: {
    color: COLORS.sentText,
  },
  receivedText: {
    color: COLORS.receivedText,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
  },
  receivedTimestamp: {
    color: COLORS.textSecondary,
  },
  status: {
    fontSize: 11,
    textAlign: 'right',
    color: 'rgba(255, 255, 255, 0.9)',
    opacity: 0.8,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
});
