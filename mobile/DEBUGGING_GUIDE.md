# Mobile App Debugging Guide

## 🐛 Hermes Debugger Setup

The app is now configured to use **Hermes JavaScript engine** with Chrome DevTools debugging.

---

## 🚀 Quick Start Debugging

### Method 1: Using Expo CLI (Recommended)

1. **Start the development server:**
   ```bash
   cd mobile
   npm start
   ```

2. **Open the debugger:**
   - Press **`j`** in the terminal to open the debugger in Chrome/Edge
   - OR select **"Open JS Debugger"** from the developer menu in the app

3. **The debugger will open in your browser** at:
   ```
   chrome://inspect
   ```

### Method 2: Manual Chrome DevTools

1. **Start your app:**
   ```bash
   npm start
   # Then press 'a' for Android
   ```

2. **Open Chrome DevTools manually:**
   - Open Google Chrome
   - Navigate to: `chrome://inspect`
   - Click **"Configure..."** next to "Discover network targets"
   - Add: `localhost:8081`
   - Your app should appear in the "Remote Target" list
   - Click **"inspect"**

---

## 🔧 Configuration

### Hermes Engine Enabled ✅

Your `app.json` now includes:
```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

This enables:
- ✅ Faster app startup
- ✅ Smaller bundle size
- ✅ Lower memory usage
- ✅ Chrome DevTools debugging

---

## 🐞 Debugging Features

### Available in Chrome DevTools:

1. **Console Logging**
   - View all `console.log()`, `console.error()`, etc.
   - Interactive console for running commands

2. **Breakpoints**
   - Set breakpoints in your source code
   - Step through code execution
   - Inspect variables and call stack

3. **Network Monitoring**
   - View API calls
   - Inspect WebSocket connections
   - Check request/response data

4. **Performance Profiling**
   - CPU profiling
   - Memory snapshots
   - Performance timeline

5. **React DevTools**
   - Inspect component tree
   - View props and state
   - Track component updates

---

## 📋 Common Debugging Commands

### In Expo CLI Terminal:

| Key | Action |
|-----|--------|
| `j` | Open JS debugger |
| `r` | Reload app |
| `m` | Toggle menu |
| `d` | Open developer menu |
| `i` | Run on iOS |
| `a` | Run on Android |
| `w` | Run on web |
| `c` | Clear Metro bundler cache |
| `?` | Show all commands |

### In App Developer Menu:

**Android:** Shake device or press `Ctrl+M` (emulator) / `Cmd+M` (Mac)  
**iOS:** Shake device or press `Cmd+D` (simulator)

Options:
- **Reload** - Refresh the app
- **Open JS Debugger** - Launch Chrome DevTools
- **Enable Fast Refresh** - Auto-reload on save
- **Enable Performance Monitor** - Show FPS overlay
- **Show Element Inspector** - Inspect UI elements

---

## 🔍 Debugging Specific Issues

### 1. Debug SMS Service

Add breakpoints in `mobile/src/services/smsService.ts`:

```typescript
export const sendSMS = async (phoneNumber: string, message: string) => {
  console.log('📤 Sending SMS:', { phoneNumber, message });
  debugger; // Breakpoint here
  
  try {
    // Your code...
  } catch (error) {
    console.error('❌ SMS Error:', error);
  }
};
```

### 2. Debug Socket Connection

Add logging in `mobile/src/services/socketService.ts`:

```typescript
public initialize(deviceInfo: DeviceInfo) {
  console.log('🔌 Initializing socket with:', deviceInfo);
  
  this.socket.on('connect', () => {
    console.log('✅ Socket connected');
  });
  
  this.socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
}
```

### 3. Debug Navigation

Add logging in route components:

```typescript
export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  
  useEffect(() => {
    console.log('📱 ChatScreen mounted with ID:', id);
  }, [id]);
  
  // Your code...
}
```

### 4. Debug State Updates

Add logging in components:

```typescript
const [messages, setMessages] = useState<Message[]>([]);

useEffect(() => {
  console.log('💬 Messages updated:', messages.length);
}, [messages]);
```

---

## 🛠️ Troubleshooting

### Issue: "No compatible apps connected"

**Solution:**
1. Make sure you're running a debug build (not production)
2. Verify Hermes is enabled in `app.json`
3. Reload the app by pressing `r` in Expo CLI
4. Check connection:
   ```bash
   curl http://localhost:8081/json/list
   ```
   Should return an array with debugger info

### Issue: Debugger not connecting

**Solution:**
1. Clear Metro cache:
   ```bash
   npm start -- --clear
   ```

2. Restart development server:
   ```bash
   # Kill the process and restart
   npm start
   ```

3. Rebuild the app:
   ```bash
   npx expo prebuild --clean
   npm run android
   ```

### Issue: Breakpoints not working

**Solution:**
1. Make sure source maps are enabled
2. Use `debugger;` statement instead of clicking in editor
3. Reload the debugger page in Chrome
4. Restart the app

### Issue: "WebSocket connection failed"

**Solution:**
1. Check if you're using the correct URL
2. For physical device, use `--tunnel` flag:
   ```bash
   npm start -- --tunnel
   ```

3. Or use `--localhost`:
   ```bash
   npm start -- --localhost
   ```

### Issue: App crashes when debugger opens

**Solution:**
1. This might be due to network issues
2. Try disabling Fast Refresh temporarily
3. Check for infinite loops or heavy operations
4. Use `console.log()` instead of breakpoints for heavy operations

---

## 📱 Device-Specific Setup

### Android Emulator

1. **Enable USB debugging** in emulator settings
2. **Forward ADB ports:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

3. **Open dev menu:** `Ctrl+M` (Windows/Linux) or `Cmd+M` (Mac)

### Physical Android Device

1. **Connect via USB** with USB debugging enabled
2. **Same WiFi network** as development machine
3. **Use tunnel mode** if needed:
   ```bash
   npm start -- --tunnel
   ```

4. **Find your IP:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

5. **Update API URL** in `src/config/constants.ts`:
   ```typescript
   export const API_URL = 'http://YOUR_IP:3000';
   ```

---

## 📊 Performance Debugging

### Enable Performance Monitor

1. Open developer menu
2. Select **"Show Performance Monitor"**
3. View:
   - FPS (Frames Per Second)
   - JS thread usage
   - UI thread usage
   - Memory usage

### Profile Performance

1. Open Chrome DevTools
2. Go to **Performance** tab
3. Click **Record**
4. Perform actions in your app
5. Click **Stop**
6. Analyze the timeline

---

## 🔬 Advanced Debugging

### React DevTools

Install React DevTools extension:
```bash
npm install -g react-devtools
```

Run standalone:
```bash
react-devtools
```

### Reactotron (Optional)

For advanced debugging:
```bash
npm install --save-dev reactotron-react-native
```

### Flipper (Optional)

Advanced debugging platform:
1. Download from https://fbflipper.com/
2. Connect to your app
3. Access plugins for Network, Layout, Databases, etc.

---

## 💡 Best Practices

### 1. Use Descriptive Logging

```typescript
// ❌ Bad
console.log(data);

// ✅ Good
console.log('📥 API Response:', data);
console.log('🔄 State updated:', { prevState, newState });
```

### 2. Add Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('🔥 Error caught:', error, errorInfo);
  }
}
```

### 3. Use Try-Catch Blocks

```typescript
try {
  await smsService.sendSMS(phone, message);
} catch (error) {
  console.error('❌ Failed to send SMS:', error);
  // Handle error gracefully
}
```

### 4. Log Lifecycle Events

```typescript
useEffect(() => {
  console.log('🎬 Component mounted');
  
  return () => {
    console.log('🎬 Component unmounted');
  };
}, []);
```

### 5. Use Debug-Only Code

```typescript
if (__DEV__) {
  console.log('🐛 Debug info:', debugData);
}
```

---

## 📝 Debugging Checklist

Before reporting bugs, check:

- [ ] Console errors in Expo CLI
- [ ] Chrome DevTools console
- [ ] Network tab for API calls
- [ ] React DevTools for component state
- [ ] Logcat for Android native errors:
  ```bash
  adb logcat | grep -i error
  ```
- [ ] Metro bundler output
- [ ] WebSocket connection status
- [ ] API server running (backend on port 3000)

---

## 🎯 Quick Debugging Workflow

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start mobile with debugger:**
   ```bash
   cd mobile
   npm start
   # Press 'j' to open debugger
   # Press 'a' to run on Android
   ```

3. **Open Chrome DevTools:**
   - Already opened by pressing 'j'
   - Or manually at `chrome://inspect`

4. **Set breakpoints** in your code

5. **Reproduce the issue** in the app

6. **Inspect** variables, network calls, and state

7. **Fix** the issue

8. **Reload** the app (press 'r')

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| App won't start | Clear cache: `npm start -- --clear` |
| Debugger won't connect | Check `curl http://localhost:8081/json/list` |
| Slow performance | Disable debugger, use console logs |
| Network errors | Check API URL in `constants.ts` |
| SMS not working | Check permissions in Android Settings |
| Socket errors | Verify backend is running |

---

## 📞 Need Help?

1. Check **console logs** in Expo CLI
2. Check **Chrome DevTools** console
3. Run with verbose logging:
   ```bash
   npm start -- --verbose
   ```
4. Check **Metro bundler** output
5. Review error stack traces

---

## 🎉 Happy Debugging!

Hermes debugger is now configured and ready to use. Press **`j`** in Expo CLI to start debugging!

**Pro tip:** Use `console.log()` liberally during development, and remove them or wrap in `if (__DEV__)` for production.
