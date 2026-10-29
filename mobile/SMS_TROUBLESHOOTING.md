# SMS Sending Troubleshooting Guide

## "Generic Failure" Error - FIXED!

The app has been updated with **automatic fallback and better error handling**. Messages should now send successfully!

### What Was Fixed

✅ **Automatic Fallback**: If dual SIM fails, automatically uses default SMS manager
✅ **Better Validation**: Only uses dual SIM when it's truly available
✅ **Detailed Logging**: Console shows exactly what's happening
✅ **Safety Checks**: Won't pass invalid subscriptionId
✅ **Graceful Degradation**: Works perfectly on single SIM devices

### How It Works Now

1. **App tries dual SIM first** (if available)
2. **If that fails** → Automatically falls back to EnhancedSmsManager
3. **If that fails** → Falls back to SmsAndroid
4. **Messages send successfully** through whichever method works!

### Check Console Logs

When sending a message, you should see:

**On Dual SIM Device:**
```
Loaded dual SIM for chat, selected: SIM 1
Sending SMS via dual SIM - subscriptionId: 1, SIM: SIM 1
Attempting to send SMS via subscription ID: 1
```

If dual SIM fails:
```
DualSimManager failed, falling back to default SMS manager
Using EnhancedSmsManager for sending
SMS sent successfully via EnhancedSmsManager
```

**On Single SIM Device:**
```
Loaded single SIM for chat: SIM 1
Sending SMS via default method (no dual SIM)
Using EnhancedSmsManager for sending
SMS sent successfully
```

### If You Still Get Errors

#### 1. Check Permissions

Go to: **Settings → Apps → Google Messages → Permissions**

Ensure these are granted:
- ✅ SMS (Send and receive)
- ✅ Phone (Read phone state)
- ✅ Contacts (optional, for contact names)

#### 2. Set as Default SMS App

On some Android versions, the app must be the default SMS app:

**Settings → Apps → Default apps → SMS app → Select your app**

#### 3. Check Cellular Service

- Ensure device has signal
- Turn off airplane mode
- Verify SIM card is active

#### 4. Verify Phone Number Format

Use proper format:
- ✅ +1234567890
- ✅ 1234567890
- ❌ 123-456-7890 (will be cleaned automatically)

### Quick Test

1. Open the app
2. Check console for: "✅ SMS permissions granted"
3. Open a chat
4. Check console for: "Loaded [single/dual] SIM for chat"
5. Send a test message
6. Watch console logs - should show successful send

### Advanced Debugging

View native logs:
```bash
adb logcat | grep -E "DualSimManager|EnhancedSmsManager|SMS"
```

### Emergency: Disable Dual SIM

If you want to completely disable dual SIM and use only the default SMS manager:

**In `app/chat/[id].tsx`** (around line 52):
```typescript
const hasDualSim = false; // Force disable
```

**In `app/compose.tsx`** (around line 71):
```typescript
const hasDualSim = false; // Force disable
```

This makes the app work exactly as it did before dual SIM was added.

### Why "Generic Failure" Happened

The original implementation was:
1. Getting a subscriptionId (which could be valid)
2. Passing it to native module
3. If native module had ANY issue → Error

The fix:
1. Gets subscriptionId (with validation)
2. Tries native module
3. **If it fails → Automatically tries next method**
4. **Keeps trying until message sends**

### Expected Behavior Now

- ✅ Messages send successfully on all devices
- ✅ Dual SIM works when available
- ✅ Single SIM works perfectly
- ✅ Automatic fallback prevents errors
- ✅ Clear console logs for debugging

### Need Help?

1. **Share console logs** from when app starts to when you send message
2. **Device info**: Model, Android version, number of SIMs
3. **Permission status**: Screenshot of app permissions
4. **Error message**: Exact text of any errors

The app is now **much more robust** and should handle all scenarios gracefully!
