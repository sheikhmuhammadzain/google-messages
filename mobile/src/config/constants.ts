// Backend server configuration
export const API_URL = __DEV__ 
  ? 'http://10.0.2.2:3000' // Android emulator
  : 'https://your-production-api.com';

export const SOCKET_URL = API_URL;

// Storage keys
export const STORAGE_KEYS = {
  DEVICE_ID: 'device_id',
  DEVICE_INFO: 'device_info',
  SESSION_TOKEN: 'session_token',
  IS_DEFAULT_SMS_APP: 'is_default_sms_app'
};

// App configuration
export const APP_CONFIG = {
  QR_EXPIRY_TIME: 5 * 60 * 1000, // 5 minutes
  SOCKET_RECONNECT_DELAY: 3000,
  MESSAGE_SYNC_INTERVAL: 30000, // 30 seconds
  MAX_MESSAGE_LENGTH: 160,
  PAGINATION_LIMIT: 50
};

// Colors matching Google Messages exactly
export const COLORS = {
  // Primary colors
  primary: '#1A73E8', // Google Blue
  primaryDark: '#1557B0',
  primaryLight: '#E8F0FE',
  accent: '#34A853', // Google Green
  
  // Background colors
  background: '#FFFFFF',
  backgroundGray: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F3F4',
  
  // Status colors
  error: '#EA4335',
  success: '#34A853',
  warning: '#FBBC04',
  
  // Text colors
  text: '#202124',
  textPrimary: '#202124',
  textSecondary: '#5F6368',
  textTertiary: '#80868B',
  textDisabled: '#DADCE0',
  
  // Border colors
  border: '#E8EAED',
  divider: '#DADCE0',
  
  // Message bubble colors
  sentBubble: '#1A73E8',
  sentText: '#FFFFFF',
  receivedBubble: '#F1F3F4',
  receivedText: '#202124',
  
  // Avatar colors (Google Material Design palette)
  avatarColors: [
    '#1A73E8', // Blue
    '#34A853', // Green
    '#EA4335', // Red
    '#FBBC04', // Yellow
    '#9334E6', // Purple
    '#00BCD4', // Cyan
    '#FF6F00', // Orange
    '#E91E63', // Pink
  ],
  
  // Dual SIM colors
  simSlot1: '#1A73E8', // Blue for SIM 1
  simSlot2: '#34A853', // Green for SIM 2
};
