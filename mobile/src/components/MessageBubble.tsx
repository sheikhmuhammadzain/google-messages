import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { Message } from '../types';
import { formatChatTime } from '../utils/dateUtils';
import { COLORS } from '../config/constants';

interface Props {
  message: Message;
  showTimestamp?: boolean;
  onRetry?: () => void;
}

export default function MessageBubble({ message, showTimestamp = true, onRetry }: Props) {
  const isSent = message.type === 'sent';
  const isFailed = message.status === 'failed';

  return (
    <View style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}>
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
                {message.status === 'sent' && '✓'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
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
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sentBubble: {
    backgroundColor: COLORS.sentBubble,
    borderBottomRightRadius: 2,
  },
  receivedBubble: {
    backgroundColor: COLORS.receivedBubble,
    borderBottomLeftRadius: 2,
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
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
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
