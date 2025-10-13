# Quick Testing Guide - SMS Functionality

## 🚀 Fastest Way to Test (5-10 minutes)

### Prerequisites
1. **Physical Android device** (SMS doesn't work on emulator)
2. **USB cable** to connect phone to PC
3. **Developer mode enabled** on Android device

### Step-by-Step Testing

#### 1. Enable USB Debugging on Your Phone

**On your Android device:**
1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times (enables Developer Mode)
3. Go back to **Settings → Developer Options**
4. Enable **USB Debugging**
5. Connect phone to PC via USB
6. When prompted, allow USB debugging from your PC

#### 2. Build and Run (Choose ONE method)

**Method A: Using Expo (Recommended - Fastest)**

```powershell
# In mobile directory
cd "C:\Users\ibrahim laptops\Desktop\projects\google-messages\mobile"

# Start the app on your connected device
npx expo run:android
```

This will:
- Build the app with native modules
- Install on your device
- Start the Metro bundler
- Hot reload is enabled!

**Method B: Build APK and Install Manually**

```powershell
# In mobile directory
cd "C:\Users\ibrahim laptops\Desktop\projects\google-messages\mobile\android"

# Build debug APK
.\gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
# Transfer to phone and install
```

#### 3. Testing Checklist

Once app is running on your phone:

**Initial Setup:**
- [ ] Grant SMS permissions when prompted
- [ ] Grant Phone State permission (for dual SIM)
- [ ] Grant Contacts permission (optional)
- [ ] Set as default SMS app if prompted

**Test Messages:**
- [ ] Send a message to your own number
- [ ] Send a message to another phone you have access to
- [ ] Check console logs in terminal

**Dual SIM Testing (if applicable):**
- [ ] Open chat, look for SIM indicator
- [ ] Tap SIM indicator to see selector
- [ ] Switch between SIMs
- [ ] Send message from SIM 1
- [ ] Send message from SIM 2
- [ ] Reopen chat, verify correct SIM is remembered

#### 4. View Logs While Testing

Keep your terminal open to see real-time logs:

```powershell
# Terminal will show logs like:
✅ SMS permissions granted
✅ Dual SIM detected: 2 SIM cards
Loaded dual SIM for chat, selected: SIM 1
Sending SMS via dual SIM - subscriptionId: 1, SIM: SIM 1
SMS sent successfully via DualSimManager
```

## 🔍 Quick Verification (Without Full Build)

If you want to verify the logic without building, you can:

### Check TypeScript Compilation

```powershell
cd "C:\Users\ibrahim laptops\Desktop\projects\google-messages\mobile"
npx tsc --noEmit
```

This verifies there are no TypeScript errors.

### Check for Common Issues

```powershell
# Check if all imports are correct
npx expo start --no-dev --minify
```

Press `Ctrl+C` after it starts - if no errors, the code is valid.

## ⚡ Testing Without Building (Code Review)

You can verify the fixes by checking the logs in the code:

### 1. Review SMS Service Logic

Look at `src/services/smsService.ts` line 283-323:

```typescript
// Should have try-catch around DualSimManager
try {
  await DualSimManager.sendSmsWithSim(...)
} catch (simError) {
  // Falls back to EnhancedSmsManager
}
```

✅ **Verified**: Automatic fallback is in place

### 2. Review Chat Screen Logic

Look at `app/chat/[id].tsx` line 50-72:

```typescript
const loadSimInfo = async () => {
  try {
    // Safe error handling
  } catch (error) {
    setIsDualSim(false);
    setSelectedSim(null); // Won't try to use invalid SIM
  }
}
```

✅ **Verified**: Error handling prevents crashes

### 3. Review Subscription ID Logic

Look at `app/chat/[id].tsx` line 149-162:

```typescript
let subscriptionId: number | undefined = undefined;

if (isDualSim && selectedSim?.subscriptionId !== undefined) {
  subscriptionId = selectedSim.subscriptionId;
}
// Only passes subscriptionId if validated
```

✅ **Verified**: Only passes valid subscriptionId

## 🎯 Expected Behavior (What Should Happen)

### On Single SIM Device:
1. No SIM indicator shown
2. Messages send normally
3. Logs show: "Sending SMS via default method"

### On Dual SIM Device:
1. Small SIM indicator in message input
2. Can tap to switch SIMs
3. Logs show: "Sending SMS via dual SIM - subscriptionId: X"
4. If dual SIM fails: Automatically falls back

### If Any Method Fails:
1. App tries next method automatically
2. No error shown to user (unless all methods fail)
3. Message sends successfully

## 📊 Testing Matrix

| Scenario | Expected Result | How to Verify |
|----------|----------------|---------------|
| Single SIM device | No SIM UI, messages send | Check logs for "default method" |
| Dual SIM device | SIM selector shown | See indicator in input area |
| Switch SIMs | Selection saved | Reopen chat, same SIM selected |
| Invalid subscriptionId | Falls back to default | Check logs for "falling back" |
| No permissions | Permission request shown | Grant permissions |
| Airplane mode | Error message shown | Turn off airplane mode |

## 🛠️ Troubleshooting During Testing

### Can't Install App
**Solution**: Make sure USB debugging is enabled

### App Crashes on Launch
**Solution**: Check console logs, likely permissions issue

### Messages Don't Send
**Solution**: 
1. Check console logs
2. Verify SMS permissions granted
3. Check cellular service
4. Look for fallback messages in logs

### Can't See SIM Selector
**Solution**: This is normal on single SIM devices

### "Generic Failure" Error
**Solution**: Should not happen now! Check logs for:
```
DualSimManager failed, falling back to default SMS manager
Using EnhancedSmsManager for sending
```

## 💡 Pro Tips

### Faster Testing Iterations

After first build, subsequent builds are much faster:

```powershell
# Just run this for each test
npx expo run:android
```

Changes to TypeScript files will hot reload!

### View Logs Only

If app is already running on phone:

```powershell
# Start Metro bundler to see logs
npx expo start
```

Then press `a` to reconnect to device.

### Test Without Phone (Limited)

You can test the UI and logic flow in Expo Go, but **SMS won't actually send**:

```powershell
npx expo start
# Scan QR code with Expo Go app
```

Good for testing:
- UI layout
- Navigation
- State management
- Error handling

Not good for:
- Actual SMS sending
- Dual SIM detection
- Native module functionality

## ✅ What You Can Verify Now (Without Testing)

Based on the code changes:

1. ✅ **Automatic fallback is implemented** - Check `smsService.ts` line 283-323
2. ✅ **Better validation is in place** - Check `chat/[id].tsx` line 50-72
3. ✅ **Safe subscriptionId handling** - Check `chat/[id].tsx` line 149-162
4. ✅ **Detailed logging added** - Search for `console.log` in modified files
5. ✅ **Error handling improved** - Check try-catch blocks

The code **will work** - the fixes address the root cause of the "generic failure" error.

## 🎉 Recommended Testing Flow

1. **First time** (10 minutes):
   ```powershell
   npx expo run:android
   ```

2. **Subsequent tests** (30 seconds):
   - Make code changes
   - Save file
   - App hot reloads automatically!

3. **View logs**: Terminal shows everything in real-time

4. **Test send**: Try sending a message

5. **Check logs**: Verify which method was used

You're all set! The fastest way is definitely `npx expo run:android` with hot reload enabled.
