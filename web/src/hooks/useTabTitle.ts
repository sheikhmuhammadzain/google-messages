import { useEffect } from 'react';

const DEFAULT_TITLE = 'Messages';

export function useTabTitle(unreadCount: number = 0) {
  useEffect(() => {
    // Update title with unread count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${DEFAULT_TITLE}`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    // Cleanup on unmount
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [unreadCount]);
}

// Hook to flash title on new message
export function useFlashTitle(shouldFlash: boolean, message: string = 'New message!') {
  useEffect(() => {
    if (!shouldFlash) return;

    const originalTitle = document.title;
    let isFlashing = true;
    let count = 0;
    const maxFlashes = 6; // Flash 3 times (on/off)

    const interval = setInterval(() => {
      if (count >= maxFlashes) {
        document.title = originalTitle;
        clearInterval(interval);
        return;
      }

      document.title = count % 2 === 0 ? message : originalTitle;
      count++;
    }, 1000);

    return () => {
      clearInterval(interval);
      document.title = originalTitle;
    };
  }, [shouldFlash, message]);
}
