# SMS Testing Guide for Android

This guide explains how to test the SMS sending and receiving functionality on Android devices.

## Prerequisites

### Required Hardware
1. **Physical Android Device** (REQUIRED for SMS testing)
   - Android 4.4 (API 19) or higher
   - Active SIM card with SMS capability
   - SMS credit/balance
   - Cellular network connection

2. **Test Phone Number**
   - Another phone to receive/send test messages
   - Can be another smartphone or basic phone

### Why Physical Device is Required
⚠️ **IMPORTANT**: Android emulators **cannot** send or receive real SMS messages. You MUST use a physical Android device with an active SIM card.

## Setup for Testing

### Step 1: Build and Install the App

#### Option A: Development Build (Recommended for Testing)
```powershell
# Navigate to mobile directory
cd "C:\Users\ibrahim laptops\Desktop\projects\google-messages\mobile"

# Clean previous builds
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue

# Build and run on connected device
npx expo run:android
```

#### Option B: APK Build (For Distribution)
```powershell
# Build APK
cd android
.\gradlew assembleRelease

# Install on device
adb install app\build\outputs\apk\release\app-release.apk
```

### Step 2: Grant Permissions

1. **Install the app** on your Android device
2. **Open the app** - it will request permissions automatically
3. **Grant these permissions**:
   - ✅ SMS (Read, Send, Receive)
   - ✅ Contacts (optional but recommended)
   - ✅ Camera (for QR code scanning)

4. **Set as Default SMS App** (Optional but recommended):
   - Go to Settings → Apps → Default apps → SMS app
   - Select "Messages" (this app)
   - This enables full SMS functionality

### Step 3: Verify Setup

Run these checks before testing:

#### Check Device Connection
```powershell
# List connected devices
adb devices

# Should show your device like:
# ABC123XYZ    device
```

#### Check App Installation
```powershell
# Verify app is installed
adb shell pm list packages | findstr googlemessages

# Should show:
# package:com.googlemessages.app
```

#### Check Permissions
```powershell
# Check granted permissions
adb shell dumpsys package com.googlemessages.app | findstr "permission"

# Should include:
# android.permission.READ_SMS: granted=true
# android.permission.SEND_SMS: granted=true
# android.permission.RECEIVE_SMS: granted=true
```

## Testing Scenarios

### Test 1: Send SMS to Valid Number

**Steps:**
1. Open the app
2. Tap the **Compose** button (FAB at bottom-right)
3. Enter a valid phone number (with country code if needed)
4. Type a message: "Test message 1"
5. Tap **Send**

**Expected Results:**
- ✅ Message shows "Sending..." status (⏳)
- ✅ After 1-2 seconds, status changes to "Sent" (✓)
- ✅ Recipient receives the SMS
- ✅ Message appears in conversation list
- ✅ No error alerts shown

**Check Logs:**
```powershell
# Monitor logs while sending
adb logcat -s EnhancedSmsManager:* SmsSentReceiver:* ReactNativeJS:*

# Should show:
# EnhancedSmsManager: SMS sent to [number], messageId: [id]
# SmsSentReceiver: SMS sent successfully
```

### Test 2: Receive SMS

**Steps:**
1. Keep the app open or in background
2. Send an SMS to your test device from another phone
3. Observe the app

**Expected Results:**
- ✅ Notification appears with sender and message
- ✅ Message appears in conversation list automatically
- ✅ Unread indicator (blue dot) shows on conversation
- ✅ Tapping notification opens the conversation

**Check Logs:**
```powershell
adb logcat -s SmsReceiver:* ReactNativeJS:*

# Should show:
# SmsReceiver: SMS received from: [number], Body: [message]
# SmsReceiver: Sent SMS to React Native
# SmsReceiver: Notification shown
```

### Test 3: Send Long Message (>160 characters)

**Steps:**
1. Compose a new message
2. Enter this text (200+ characters):
   ```
   This is a very long SMS message that exceeds the standard 160 character limit. The SMS manager should automatically split this into multiple parts and send them all successfully to ensure complete delivery.
   ```
3. Send the message

**Expected Results:**
- ✅ Message splits automatically (multipart SMS)
- ✅ Recipient receives complete message
- ✅ Shows as single message in app
- ✅ Status changes to "Sent" after all parts delivered

### Test 4: Handle No Service Error

**Steps:**
1. Enable Airplane mode on device
2. Try to send a message
3. Check the error

**Expected Results:**
- ✅ Shows error: "Airplane mode is on. Turn off airplane mode."
- ✅ Message marked as "Failed" (✗)
- ✅ "Tap to retry" button appears
- ✅ Can retry after disabling airplane mode

**Check Logs:**
```powershell
adb logcat -s SmsSentReceiver:*

# Should show:
# SmsSentReceiver: SMS send failed: Radio off
```

### Test 5: Retry Failed Message

**Steps:**
1. Send a message while in airplane mode (to fail it)
2. Turn off airplane mode
3. Tap the failed message
4. Tap "Tap to retry"

**Expected Results:**
- ✅ Message re-queues with "Sending..." status
- ✅ Successfully sends after retry
- ✅ Status updates to "Sent"
- ✅ Original failed message removed

### Test 6: Contact Name Resolution

**Steps:**
1. Make sure you have contacts with phone numbers
2. Send/receive SMS from a saved contact
3. Check conversation list

**Expected Results:**
- ✅ Shows contact name instead of phone number
- ✅ Shows contact photo if available
- ✅ Contact name appears in chat header
- ✅ Phone number formatted properly if no contact

**Check Logs:**
```powershell
adb logcat | findstr "ContactsService"

# Should show:
# Loaded [X] contacts
```

### Test 7: Delivery Status Tracking

**Steps:**
1. Send a message to a valid number
2. Watch the status indicators
3. Wait for delivery confirmation

**Expected Results:**
- ✅ Initially shows ⏳ (sending)
- ✅ Changes to ✓ (sent)
- ✅ Eventually shows ✓✓ (delivered)
- ✅ Timestamps update correctly

### Test 8: Invalid Phone Number

**Steps:**
1. Try to send to invalid numbers:
   - Empty number
   - "123" (too short)
   - Letters: "ABCD"

**Expected Results:**
- ✅ Shows error: "Invalid phone number. Please enter a valid phone number."
- ✅ Message not sent
- ✅ No crash or hang

### Test 9: Permissions Denied

**Steps:**
1. Go to Android Settings → Apps → Messages → Permissions
2. Revoke SMS permissions
3. Try to send a message

**Expected Results:**
- ✅ Shows error: "SMS permission denied. Please grant SMS permissions in Settings."
- ✅ Option to open app settings
- ✅ After granting permission, can send successfully

### Test 10: Default SMS App Status

**Steps:**
1. Open app Settings screen
2. Check "Default SMS App" section
3. If not default, tap "Set as Default"

**Expected Results:**
- ✅ Shows current status correctly
- ✅ System dialog appears to change default
- ✅ After selection, status updates
- ✅ Can receive SMS when not default (with limitations)

## Advanced Testing

### Load Testing

**Test sending multiple messages:**
```powershell
# Send 10 messages in quick succession
# Monitor for any failures
```

**Expected:**
- All messages queue properly
- No messages lost
- Status tracked for each

### Stress Testing

**Test receiving many messages:**
1. Use SMS testing service or have multiple people send messages
2. Receive 20+ messages quickly
3. Check app stability

**Expected:**
- App doesn't crash
- All messages received
- Notifications work correctly
- UI updates smoothly

## Debugging

### View Real-Time Logs

```powershell
# All app logs
adb logcat -s ReactNativeJS:* ReactNative:*

# SMS-specific logs
adb logcat -s EnhancedSmsManager:* SmsSentReceiver:* SmsDeliveredReceiver:* SmsReceiver:*

# Clear logs first for clean output
adb logcat -c
```

### Common Issues and Solutions

#### Issue: "Failed to send message" with no specific error

**Check:**
```powershell
# Check if SIM is active
adb shell dumpsys telephony.registry | findstr "mServiceState"

# Check SMS manager availability
adb shell service list | findstr telephony
```

**Solution:**
- Ensure SIM card is inserted and active
- Check SMS balance/credit
- Verify phone number format

#### Issue: Messages not appearing in app

**Check:**
```powershell
# Check if messages exist in SMS database
adb shell content query --uri content://sms/inbox

# Check app permissions again
adb shell dumpsys package com.googlemessages.app | findstr "permission"
```

**Solution:**
- Grant READ_SMS permission
- Restart app
- Clear app cache: Settings → Apps → Messages → Storage → Clear Cache

#### Issue: Notifications not showing

**Check:**
```powershell
# Check notification settings
adb shell dumpsys notification | findstr googlemessages
```

**Solution:**
- Enable notifications in Android settings
- Check notification channel is created
- Verify app has notification permission

#### Issue: Contact names not showing

**Check:**
```powershell
adb logcat | findstr "ContactsService"
```

**Solution:**
- Grant READ_CONTACTS permission
- Wait for contacts to load (check logs)
- Refresh app

## Performance Metrics

### Expected Timings

| Action | Expected Time |
|--------|--------------|
| Send SMS (local) | < 2 seconds |
| Receive SMS | Instant |
| Load conversations | < 1 second |
| Load contacts | 2-5 seconds |
| Retry failed message | < 2 seconds |

### Monitor Performance

```powershell
# CPU usage
adb shell top -n 1 | findstr googlemessages

# Memory usage
adb shell dumpsys meminfo com.googlemessages.app | Select-String "TOTAL"
```

## Test Report Template

After testing, document results:

```
## Test Execution Report

**Device:** [Model Name, Android Version]
**SIM:** [Carrier Name]
**App Version:** 1.0.0
**Test Date:** [Date]

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Send SMS | ✅ Pass | Sent in 1.2s |
| Receive SMS | ✅ Pass | Notification shown |
| Long message | ✅ Pass | Split correctly |
| No service error | ✅ Pass | Error shown |
| Retry failed | ✅ Pass | Retry worked |
| Contact names | ✅ Pass | All resolved |
| Delivery status | ✅ Pass | Status updated |
| Invalid number | ✅ Pass | Error handled |
| Permissions | ✅ Pass | Prompts shown |
| Default app | ✅ Pass | Can set/unset |

### Issues Found
[List any issues discovered]

### Screenshots
[Attach relevant screenshots]
```

## Automated Testing (Future)

While SMS can't be fully automated, you can test the UI:

```typescript
// Example with Detox or Appium
describe('Compose Screen', () => {
  it('should show error for empty recipient', async () => {
    await element(by.id('compose-button')).tap();
    await element(by.id('message-input')).typeText('Test');
    await element(by.id('send-button')).tap();
    await expect(element(by.text('Invalid phone number'))).toBeVisible();
  });
});
```

## Best Practices for Testing

1. **Test on Multiple Devices**
   - Different Android versions
   - Different manufacturers (Samsung, Google, etc.)
   - Different screen sizes

2. **Test Different Scenarios**
   - Good network connection
   - Poor network connection
   - Airplane mode
   - Different carriers

3. **Test Edge Cases**
   - Empty messages
   - Very long messages (>1000 chars)
   - Special characters
   - Emojis

4. **Monitor Resources**
   - Battery usage
   - Data usage
   - Memory leaks

5. **User Experience**
   - Response time
   - Error messages clarity
   - UI smoothness
   - Notification behavior

## Production Checklist

Before releasing to production:

- [ ] All test cases pass
- [ ] No crashes in 30-minute usage session
- [ ] Works on Android 7.0+ devices
- [ ] Handles all error scenarios gracefully
- [ ] Permissions requested properly
- [ ] Notifications work correctly
- [ ] Contact integration works
- [ ] Default SMS app functionality works
- [ ] Message delivery tracked correctly
- [ ] UI is responsive and smooth
- [ ] No memory leaks detected
- [ ] Tested on at least 3 different devices

## Support & Troubleshooting

If you encounter issues during testing:

1. Check logs first: `adb logcat`
2. Verify device setup and permissions
3. Try on different device
4. Check Android version compatibility
5. Review error messages in code

## Conclusion

Thorough testing ensures your SMS app works reliably like Google Messages. Always test on real devices with real SIM cards for accurate results.

**Remember:** SMS functionality cannot be properly tested in emulators. Always use physical devices with active SIM cards!
