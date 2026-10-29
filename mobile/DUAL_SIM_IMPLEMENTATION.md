# Dual SIM Implementation Guide

## Overview
This Google Messages app now includes **full dual SIM support** for Android devices with multiple SIM cards. Users can seamlessly send SMS messages from either SIM card, with intelligent SIM selection based on conversation history.

## Features

### ✅ Automatic SIM Detection
- Detects if the device has single or dual SIM capability
- Automatically initializes on app startup
- No configuration required

### ✅ Intelligent SIM Recommendation
- Remembers which SIM was used for each contact
- Automatically suggests the previously used SIM for returning conversations
- Falls back to the device's default SMS SIM if no preference exists

### ✅ User-Friendly SIM Selection
- **Compact SIM Indicator**: Shows current SIM in chat and compose screens
- **SIM Selector Modal**: Beautiful UI to switch between SIM cards
- **Visual Differentiation**: Color-coded SIM indicators (Blue for SIM 1, Green for SIM 2)
- **SIM Details**: Shows carrier name, phone number, and slot information

### ✅ Seamless Single SIM Support
- Works perfectly on single SIM devices
- No unnecessary UI elements shown on single SIM devices
- Graceful fallback behavior

### ✅ Persistence
- SIM preferences are saved locally
- Survives app restarts
- Per-contact SIM memory

## Architecture

### Components

#### 1. **Native Module** (`DualSimManagerModule.java`)
```
Location: mobile/android/app/src/main/java/com/googlemessages/app/DualSimManager.kt
```
- Interfaces with Android's SubscriptionManager API
- Retrieves SIM card information
- Sends SMS through specific SIM cards using subscription ID

**Key Methods:**
- `getSimCards()`: Returns list of available SIM cards
- `getDefaultSmsSubscriptionId()`: Gets the default SIM for SMS
- `isDualSimDevice()`: Checks if device has multiple SIMs
- `sendSmsWithSim()`: Sends SMS through specific SIM card

#### 2. **Service Layer** (`dualSimService.ts`)
```
Location: mobile/src/services/dualSimService.ts
```
- TypeScript service wrapping the native module
- Manages SIM preferences and recommendations
- Handles persistence with AsyncStorage

**Key Methods:**
- `initialize()`: Loads SIM cards and preferences
- `isDualSimDevice()`: Checks dual SIM capability
- `getSimCards()`: Returns available SIM cards
- `getRecommendedSimForContact()`: Gets best SIM for a contact
- `saveSimPreference()`: Saves SIM choice for a contact
- `sendSmsWithSim()`: Sends SMS with specific SIM

#### 3. **UI Components**

**SimSelector** (`src/components/SimSelector.tsx`)
- Modal dialog for selecting SIM card
- Shows all available SIMs with details
- Displays "Default" and "Recommended" badges
- Includes carrier name, phone number, and slot info

**SimIndicator** (`src/components/SimIndicator.tsx`)
- Compact SIM indicator for input areas
- Two modes: compact and full
- Color-coded by SIM slot
- Clickable to open SIM selector

### Integration Points

#### 1. **App Initialization** (`_layout.tsx`)
```typescript
// Initializes dual SIM service on app startup
await dualSimService.initialize();
```

#### 2. **Chat Screen** (`app/chat/[id].tsx`)
- Loads recommended SIM for the contact
- Shows compact SIM indicator (only on dual SIM devices)
- Passes `subscriptionId` when sending messages
- Updates SIM preference after successful send

#### 3. **Compose Screen** (`app/compose.tsx`)
- Shows SIM indicator with label
- Dynamically updates recommendation as user types
- Passes `subscriptionId` when sending messages

#### 4. **SMS Service** (`smsService.ts`)
```typescript
async sendSMS(
  phoneNumber: string, 
  message: string, 
  messageId?: string, 
  subscriptionId?: number // Optional dual SIM support
): Promise<boolean>
```

## How It Works

### Sending a Message

1. **User opens chat** → System loads recommended SIM for contact
2. **User types message** → Compact SIM indicator shows selected SIM
3. **User can tap indicator** → SIM selector modal opens
4. **User selects different SIM** (optional) → Selection updates
5. **User sends message** → Message sent via selected SIM
6. **System saves preference** → Next time, same SIM is recommended

### SIM Recommendation Logic

1. **Check saved preference** for this contact
2. **If found** → Use that SIM
3. **If not found** → Use device's default SMS SIM
4. **If no default** → Use first available SIM

### Fallback Behavior

- **No dual SIM detected**: SIM UI elements are hidden, app works normally
- **No SIM cards found**: Falls back to default SMS manager
- **Permission denied**: Graceful error handling with user-friendly messages
- **subscriptionId undefined**: Uses default SMS manager (backward compatible)

## User Experience

### Dual SIM Device
1. Small SIM indicator appears in message input area
2. Indicator shows current SIM with colored dot
3. Tapping indicator opens SIM selector
4. Selector shows all SIMs with badges (Default, Recommended)
5. Selection is remembered per contact
6. Seamless switching between SIMs

### Single SIM Device
1. No SIM indicators shown
2. Works exactly like before
3. Zero overhead or confusion
4. Messages sent normally

## Configuration

### Colors (in `constants.ts`)
```typescript
simSlot1: '#1A73E8', // Blue for SIM 1
simSlot2: '#34A853', // Green for SIM 2
```

### Storage Key
```typescript
SIM_PREFERENCES_KEY = '@sim_preferences'
```

## Testing Checklist

- [x] Dual SIM device detection
- [x] Single SIM device compatibility
- [x] SIM selector UI
- [x] SIM indicator UI
- [x] SIM preference persistence
- [x] Message sending with specific SIM
- [x] Fallback to default SMS manager
- [x] Per-contact SIM recommendation
- [x] Error handling
- [x] Permission handling

## Permissions Required

No additional permissions needed! Uses existing SMS permissions:
- `android.permission.SEND_SMS`
- `android.permission.READ_SMS`
- `android.permission.READ_PHONE_STATE`

## Compatibility

- **Minimum Android Version**: Android 5.1 (API 22) - Lollipop MR1
- **Recommended**: Android 7.0+ (API 24) for full dual SIM API support
- **Works on**: Single SIM, Dual SIM, and eSIM devices

## Best Practices Implemented

✅ **Progressive Enhancement**: Single SIM devices work perfectly without dual SIM features
✅ **Intelligent Defaults**: System automatically selects the best SIM
✅ **User Memory**: Remembers user's SIM choices per contact
✅ **Visual Clarity**: Color-coded SIM indicators for easy identification
✅ **Error Handling**: Graceful fallbacks for all edge cases
✅ **Performance**: Minimal overhead, async initialization
✅ **Persistence**: SIM preferences survive app restarts
✅ **Accessibility**: Clear labels and visual indicators

## Future Enhancements

Possible future improvements:
- [ ] Bulk SIM preference management
- [ ] SIM usage statistics
- [ ] Network quality indicators
- [ ] Data usage per SIM
- [ ] RCS support per SIM (if applicable)

## Troubleshooting

### Issue: SIM selector not showing
**Solution**: Check if `isDualSimDevice()` returns true. Verify READ_PHONE_STATE permission.

### Issue: Messages not sending from selected SIM
**Solution**: Verify DualSimManager native module is registered in CustomPackage. Check Android version is 5.1+.

### Issue: SIM preferences not persisting
**Solution**: Check AsyncStorage permissions. Verify SIM_PREFERENCES_KEY is correct.

## Summary

The dual SIM implementation is **complete and production-ready**. It provides:
- Seamless message sending from any SIM card
- No restrictions or barriers
- Intelligent SIM selection
- Beautiful, intuitive UI
- Perfect single SIM compatibility
- Full persistence and memory
- Comprehensive error handling

Users can send messages to any number without any restrictions, and the system intelligently manages SIM selection while providing full manual control when needed.
