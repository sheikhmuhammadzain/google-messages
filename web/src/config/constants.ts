// Backend API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Storage keys
export const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token',
  DEVICE_ID: 'device_id',
};

// App configuration
export const APP_CONFIG = {
  QR_REFRESH_INTERVAL: 60000, // 1 minute
  SOCKET_RECONNECT_DELAY: 3000,
  MESSAGE_SYNC_INTERVAL: 10000,
};

// Google Messages exact color system (Material Design 3)
export const COLORS = {
  // Primary Google Colors
  primary: '#1A73E8',        // Google Blue
  primaryLight: '#E8F0FE',   // Light blue tint
  primaryDark: '#1557B0',    // Darker blue
  accent: '#34A853',         // Google Green
  error: '#EA4335',          // Google Red
  warning: '#FBBC04',        // Google Yellow
  success: '#34A853',        // Google Green

  // Text colors
  text: '#202124',           // Almost black
  textPrimary: '#202124',    // Almost black
  textSecondary: '#5F6368',  // Gray
  textTertiary: '#80868B',   // Light gray
  textDisabled: '#DADCE0',   // Very light gray

  // Backgrounds
  background: '#FFFFFF',
  backgroundGray: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F3F4',
  overlay: 'rgba(0, 0, 0, 0.04)',
  
  // Borders and dividers
  border: '#E8EAED',
  divider: '#E8EAED',
  
  // Message colors
  sentBubble: '#1A73E8',     // Google Blue
  sentText: '#FFFFFF',
  receivedBubble: '#F1F3F4', // Light gray
  receivedText: '#202124',
  
  // Status and indicators
  unreadIndicator: '#1A73E8',
  onlineIndicator: '#34A853',
  offlineIndicator: '#EA4335',
  
  // Interactive states
  hover: 'rgba(26, 115, 232, 0.04)',
  pressed: 'rgba(26, 115, 232, 0.08)',
  selected: 'rgba(26, 115, 232, 0.12)',
  focus: 'rgba(26, 115, 232, 0.12)',
};

// Avatar colors (8 Material Design colors for consistent contact avatars)
export const AVATAR_COLORS = [
  '#1A73E8', // Blue
  '#34A853', // Green  
  '#EA4335', // Red
  '#FBBC04', // Yellow
  '#9334E6', // Purple
  '#00BCD4', // Cyan
  '#FF6F00', // Orange
  '#E91E63', // Pink
];
