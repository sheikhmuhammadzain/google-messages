# Google Messages Mobile App

React Native (Expo 54) mobile application that functions as a default SMS app on Android with real-time web synchronization.

## Features

- 📱 Default SMS app functionality
- 💬 Send and receive SMS messages
- 🔄 Real-time sync with web app
- 📷 QR code pairing
- 🎨 Material Design UI
- 📊 Message delivery status
- 👥 Contact integration

## Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for emulator)
- Physical Android device (recommended for SMS testing)

## Installation

```bash
npm install
```

## Configuration

Update `src/config/constants.ts`:

```typescript
// For Android Emulator
export const API_URL = 'http://10.0.2.2:3000';

// For Physical Device (replace with your computer's IP)
export const API_URL = 'http://192.168.1.100:3000';
```

## Development

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS (limited SMS functionality)
npm run ios
```

## Building

### Development Build

```bash
npx expo prebuild
npm run android
```

### Production Build with EAS

```bash
# Configure EAS
npx eas build:configure

# Build APK for testing
npx eas build --platform android --profile preview

# Build AAB for Play Store
npx eas build --platform android --profile production
```

## Permissions

The app requires the following Android permissions:

- `READ_SMS` - Read SMS messages
- `SEND_SMS` - Send SMS messages
- `RECEIVE_SMS` - Receive SMS messages
- `READ_CONTACTS` - Access contacts
- `WRITE_SMS` - Modify SMS database
- `RECEIVE_MMS` - Receive MMS messages
- `CAMERA` - Scan QR codes

## Setting as Default SMS App

1. Install the app on your Android device
2. Open the app
3. When prompted, tap "Yes" to set as default SMS app
4. In Android settings, select this app as default
5. Grant all required permissions

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Inbox screen
│   ├── chat/[id].tsx      # Chat screen
│   └── settings.tsx       # Settings screen
├── src/
│   ├── components/        # Reusable components
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   ├── config/            # Configuration
│   └── types/             # TypeScript types
├── app.json               # Expo configuration
└── package.json
```

## Usage

### Send SMS

```typescript
import smsService from './src/services/smsService';

await smsService.sendSMS('+1234567890', 'Hello World!');
```

### Read Messages

```typescript
const messages = await smsService.readAllMessages();
const conversations = await smsService.getConversations();
```

### Socket Connection

```typescript
import socketService from './src/services/socketService';
import { getDeviceInfo } from './src/utils/deviceUtils';

const deviceInfo = await getDeviceInfo();
socketService.initialize(deviceInfo);

socketService.on('message:new', (message) => {
  console.log('New message:', message);
});
```

## Troubleshooting

### SMS Permissions Denied

If permissions are denied:
1. Go to Android Settings
2. Apps → Messages → Permissions
3. Grant all SMS permissions
4. Set as default SMS app

### Cannot Send/Receive SMS

- Ensure app is set as default SMS app
- Check that all permissions are granted
- Verify SIM card is inserted and active
- Test with physical device (emulator may not support SMS)

### Socket Connection Failed

- Check API_URL in configuration
- Ensure backend server is running
- Verify device and server are on same network
- Check firewall settings

### App Crashes on Launch

- Clear app data and cache
- Reinstall the app
- Check logcat for error messages:
  ```bash
  adb logcat | grep -i error
  ```

## Testing

### Test on Emulator

```bash
# Send SMS to emulator
adb emu sms send +1234567890 "Test message"

# Check SMS database
adb shell content query --uri content://sms/inbox
```

### Test on Physical Device

```bash
# Enable USB debugging
# Connect device via USB
# Run the app
npm run android
```

## Known Limitations

- SMS functionality only works on Android
- Requires Android 6.0 (API 23) or higher
- Some manufacturers may restrict SMS access
- MMS support is experimental

## License

MIT
