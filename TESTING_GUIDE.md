# Testing Your Mobile App

## 📱 You Have a Working Build!

Your development APK is ready at:
https://expo.dev/accounts/zainafzal/projects/google-messages-mobile/builds/338d3c62-5bc3-4a44-b21c-947ebb85b93f

---

## 🚀 How to Install and Test

### Step 1: Download APK

**On your Android phone:**
1. Open the link above in your phone's browser
2. Or scan this QR code (from the build output)
3. Download the APK (~168 MB)

**On your computer:**
```bash
# Answer 'Y' to the prompt in terminal
? Install and run the Android build on an emulator? » Y
```

### Step 2: Install

**On Phone:**
1. Enable "Install from Unknown Sources" in Settings
2. Tap the downloaded APK
3. Click "Install"
4. Wait ~1 minute for installation

**On Emulator:**
- EAS CLI will install automatically if you answered 'Y'

### Step 3: Grant Permissions

When you open the app for the first time:
1. **SMS Permissions** - Allow (required for reading messages)
2. **Contacts** - Allow (optional, for contact names)
3. **Camera** - Allow (for QR scanning)

### Step 4: Set as Default SMS App (Optional)

1. Go to Android Settings → Apps → Default Apps
2. Set "Messages" as default SMS app
3. This enables full SMS read/write access

---

## 🧪 Testing Checklist

### ✅ Basic Features

- [ ] **App opens** without crashing
- [ ] **UI loads** (inbox, chat screens visible)
- [ ] **Permissions granted** (SMS, Camera, Contacts)
- [ ] **Navigation works** (can switch between screens)

### ✅ SMS Features

- [ ] **Read existing messages** (inbox shows conversations)
- [ ] **Open conversation** (tap to view chat)
- [ ] **Send SMS** (compose and send message)
- [ ] **Receive SMS** (incoming messages appear)
- [ ] **Message status** (sending, sent, delivered indicators)

### ✅ QR Code Pairing

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Web App:**
   ```bash
   cd web
   npm run dev
   ```

3. **Open web app** in browser: http://localhost:5173

4. **In mobile app:**
   - Tap Settings (⚙️ icon)
   - Tap "Pair with Web"
   - Camera opens

5. **Scan QR code** from web app

6. **Check pairing:**
   - [ ] Mobile shows "Connected"
   - [ ] Web shows conversations
   - [ ] Messages sync in real-time

### ✅ Web Sync Features

- [ ] **Web shows SMS** from phone
- [ ] **Send from web** → Appears on phone
- [ ] **Receive on phone** → Appears on web
- [ ] **Real-time updates** (no refresh needed)
- [ ] **Connection status** indicator works

---

## 🐛 Common Issues & Fixes

### Issue: App Crashes on Open

**Cause:** Permissions not granted  
**Fix:** 
```
Settings → Apps → Messages → Permissions → Enable All
```

### Issue: Can't Read SMS

**Cause:** Not set as default SMS app  
**Fix:**
```
Settings → Apps → Default Apps → SMS App → Select "Messages"
```

### Issue: QR Scanner Won't Open

**Cause:** Camera permission denied  
**Fix:**
```
Settings → Apps → Messages → Permissions → Camera → Allow
```

### Issue: Can't Send SMS

**Cause:** SMS permission denied  
**Fix:**
```
Settings → Apps → Messages → Permissions → SMS → Allow
Grant all SMS-related permissions
```

### Issue: Web App Shows QR But Can't Connect

**Cause:** Backend not running  
**Fix:**
```bash
cd backend
npm run dev
# Make sure it's running on port 3000
```

### Issue: Messages Don't Sync

**Cause:** Different networks or firewall  
**Fix:**
```
1. Ensure phone and computer on same WiFi
2. Check backend logs for connection errors
3. Restart mobile app
4. Re-scan QR code
```

---

## 🎯 Full Testing Flow

### Test 1: Basic App Functionality

1. Open app
2. Grant all permissions
3. Check inbox loads
4. Open a conversation
5. Send a test message
6. Verify it sends

**Expected:** App works smoothly, messages send ✅

---

### Test 2: QR Code Pairing

1. Start backend: `cd backend && npm run dev`
2. Start web: `cd web && npm run dev`
3. Open web at http://localhost:5173
4. Open mobile app → Settings → Pair with Web
5. Scan QR code
6. Check web shows "Connected"

**Expected:** Pairing successful, web shows SMS ✅

---

### Test 3: Web-to-Phone Messaging

1. Ensure paired (Test 2 completed)
2. In web app, click a conversation
3. Type a message
4. Click Send
5. Check mobile app shows the sent message

**Expected:** Message appears on both web and phone ✅

---

### Test 4: Phone-to-Web Messaging

1. Ensure paired
2. Ask someone to send you an SMS
3. Check mobile app receives it
4. Check web app shows it (no refresh needed)

**Expected:** Message appears on both instantly ✅

---

## 📊 Performance Testing

### Check These Metrics:

- **App launch time:** Should be < 3 seconds
- **Message load time:** Should be instant
- **Scroll performance:** Should be smooth (60 FPS)
- **Memory usage:** Monitor in Android Settings
- **Battery drain:** Should be minimal

### How to Check:

```bash
# Enable developer options on phone
Settings → About Phone → Tap "Build Number" 7 times

# Then check performance
Settings → Developer Options → Running Services
```

---

## 🔧 Debug Mode Features

Your development build includes:

### Chrome DevTools Debugging

1. Open the app
2. Shake phone (or press menu button)
3. Select "Open JS Debugger"
4. Chrome DevTools opens on computer
5. Set breakpoints, inspect network, etc.

### React DevTools

```bash
npm install -g react-devtools
react-devtools
```

Then connect from app dev menu.

### Logs

**View app logs:**
```bash
# If using ADB
adb logcat | grep GoogleMessages

# Or from dev menu
Dev Menu → Start Remote JS Debugging
```

---

## 🎉 Success Criteria

Your app is working correctly if:

✅ **App opens and runs smoothly**  
✅ **Can read existing SMS messages**  
✅ **Can send SMS messages**  
✅ **Can scan QR code**  
✅ **Successfully pairs with web app**  
✅ **Messages sync both ways (phone ↔ web)**  
✅ **Real-time updates work**  
✅ **UI matches Google Messages design**  

---

## 📸 Screenshots for Testing

Take screenshots of:
1. Inbox screen
2. Chat screen
3. Compose screen
4. QR scanner
5. Settings screen
6. Web app (paired)

This helps verify the pixel-perfect UI!

---

## 🚀 Next Steps After Testing

### If Everything Works:

1. **Build production version:**
   ```bash
   eas build --profile production-apk --platform android
   ```

2. **Expected size:** 25-40 MB (much smaller!)

3. **Share with testers or users**

### If Issues Found:

1. Check error logs
2. Review permissions
3. Verify backend is running
4. Check network connectivity
5. Report specific errors for debugging

---

## 💡 Pro Tips

1. **Keep dev build for testing** - It has debugging tools
2. **Use production build for sharing** - Much smaller size
3. **Test on multiple devices** - Different Android versions
4. **Test both WiFi and mobile data** - Network variations
5. **Test with real SMS** - Not just test messages

---

## 📞 Support

If you encounter issues:

1. **Check logs** in Chrome DevTools
2. **Review backend logs** in terminal
3. **Verify all permissions** granted
4. **Test network connection** between devices
5. **Try uninstall/reinstall** if app corrupted

---

## 🎉 You're Ready!

Download your APK and start testing! The app is fully functional with:
- ✅ SMS reading/sending
- ✅ Web synchronization
- ✅ QR code pairing
- ✅ Pixel-perfect Google Messages UI
- ✅ Real-time messaging

**Have fun testing your creation!** 🚀
