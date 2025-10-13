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

// Professional color scheme with enhanced visual hierarchy
export const COLORS = {
  // Primary colors - Modern blue palette
  primary: '#0B57D0', // Google Blue (updated)
  primaryDark: '#001D35',
  primaryLight: '#D3E3FD',
  primaryContainer: '#E8F0FE',
  accent: '#00897B', // Teal accent
  accentLight: '#E0F2F1',
  
  // Background colors - Subtle gradients
  background: '#FFFFFF',
  backgroundGray: '#F8F9FA',
  backgroundSecondary: '#F1F3F4',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF0F3',
  surfaceElevated: '#FFFFFF',
  
  // Status colors
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  warningLight: '#FFF3E0',
  info: '#0288D1',
  infoLight: '#E1F5FE',
  
  // Text colors - Better contrast
  text: '#1C1B1F',
  textPrimary: '#1C1B1F',
  textSecondary: '#49454F',
  textTertiary: '#73767E',
  textDisabled: '#C4C7C5',
  textHint: '#9AA0A6',
  textInverse: '#FFFFFF',
  
  // Border and divider colors
  border: '#E3E1E6',
  borderLight: '#F4F3F5',
  divider: '#E8EAED',
  outline: '#79747E',
  
  // Message bubble colors - Modern design
  sentBubble: '#0B57D0',
  sentBubbleGradient: ['#0B57D0', '#1967D2'],
  sentText: '#FFFFFF',
  receivedBubble: '#E8EAF6',
  receivedText: '#1C1B1F',
  
  // Avatar colors - Material You palette
  avatarColors: [
    '#0B57D0', // Blue
    '#00897B', // Teal  
    '#C62828', // Red
    '#F57C00', // Orange
    '#6A1B9A', // Purple
    '#00ACC1', // Cyan
    '#EF6C00', // Deep Orange
    '#AD1457', // Pink
  ],
  
  // Dual SIM colors
  simSlot1: '#0B57D0', // Blue for SIM 1
  simSlot2: '#00897B', // Teal for SIM 2
  
  // Additional UI colors
  badge: '#D32F2F',
  badgeText: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};

// Typography system
export const TYPOGRAPHY = {
  // Display
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400' },
  displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: '400' },
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: '400' },
  
  // Headline
  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '400' },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '400' },
  
  // Title
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  
  // Body
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  
  // Label
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
};

// Spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius system
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Elevation/Shadow system
export const ELEVATION = {
  level0: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  level2: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  level3: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  level4: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
};
