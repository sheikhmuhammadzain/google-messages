import { useEffect } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

/**
 * Hook for listening to real-time SMS events from native Android
 * 
 * Events:
 * - onSmsReceived: When a new SMS is received
 * - onSmsSent: When an SMS is successfully sent
 * - onSmsDelivered: When an SMS is delivered
 */

interface SmsReceivedEvent {
  phoneNumber: string;
  body: string;
  timestamp: number;
  type: 'received';
}

interface SmsSentEvent {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

interface SmsDeliveredEvent {
  messageId: string;
  status: 'delivered';
}

export interface UseSmsListenerOptions {
  onSmsReceived?: (event: SmsReceivedEvent) => void;
  onSmsSent?: (event: SmsSentEvent) => void;
  onSmsDelivered?: (event: SmsDeliveredEvent) => void;
}

/**
 * Listen to SMS events from the native layer
 */
export function useSmsListener(options: UseSmsListenerOptions) {
  const { onSmsReceived, onSmsSent, onSmsDelivered } = options;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    // Set up event listeners
    const subscriptions = [];

    if (onSmsReceived) {
      const subscription = DeviceEventEmitter.addListener(
        'onSmsReceived',
        (event: SmsReceivedEvent) => {
          console.log('[useSmsListener] SMS received:', event.phoneNumber);
          onSmsReceived(event);
        }
      );
      subscriptions.push(subscription);
    }

    if (onSmsSent) {
      const subscription = DeviceEventEmitter.addListener(
        'onSmsSent',
        (event: SmsSentEvent) => {
          console.log('[useSmsListener] SMS sent status:', event.messageId, event.status);
          onSmsSent(event);
        }
      );
      subscriptions.push(subscription);
    }

    if (onSmsDelivered) {
      const subscription = DeviceEventEmitter.addListener(
        'onSmsDelivered',
        (event: SmsDeliveredEvent) => {
          console.log('[useSmsListener] SMS delivered:', event.messageId);
          onSmsDelivered(event);
        }
      );
      subscriptions.push(subscription);
    }

    // Clean up on unmount
    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, [onSmsReceived, onSmsSent, onSmsDelivered]);
}
