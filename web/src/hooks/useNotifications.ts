import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export function useNotifications() {
  const { settings } = useSettings();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      // Check if notifications are enabled in settings
      if (!settings.notifications.enabled || !settings.notifications.desktop) {
        return null;
      }

      // Check permission
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icon.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
          silent: !settings.notifications.sound,
        });

        // Auto-close after 5 seconds unless requireInteraction is true
        if (!options.requireInteraction) {
          setTimeout(() => notification.close(), 5000);
        }

        return notification;
      } catch (error) {
        console.error('Failed to show notification:', error);
        return null;
      }
    },
    [permission, settings.notifications]
  );

  const playSound = useCallback(() => {
    if (!settings.notifications.sound) {
      return;
    }

    try {
      // Play notification sound (you can replace with custom sound URL)
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch((err) => console.warn('Failed to play sound:', err));
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, [settings.notifications.sound]);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    requestPermission,
    showNotification,
    playSound,
  };
}
