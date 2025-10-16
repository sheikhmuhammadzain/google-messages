# 🐛 Google Messages App - Bug & Security Audit Report

**Date:** 2025-10-16  
**Scope:** Full app audit - React Native, Android Native, Services, State Management  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | ℹ️ Info

---

## Executive Summary

**Total Issues Found:** 23  
- 🔴 Critical: 3
- 🟠 High: 7  
- 🟡 Medium: 8
- 🔵 Low: 5

**Overall Status:** ⚠️ Several critical bugs found requiring immediate attention

---

## 🔴 CRITICAL BUGS (Fix Immediately)

### 1. 🔴 Memory Leak in useSmsListener Hook
**File:** `src/hooks/useSmsListener.ts`  
**Line:** 88  
**Severity:** Critical

**Issue:**  
The hook has a dependency array that includes callback functions, which will cause the effect to re-run on every render if those callbacks are not memoized.

```typescript
// Line 88 - PROBLEMATIC
}, [onSmsReceived, onSmsSent, onSmsDelivered]);
```

**Impact:**  
- Event listeners are added/removed on every render
- Memory leak as old listeners accumulate
- Performance degradation over time
- App crash on low-memory devices

**Fix:**
```typescript
// Option 1: Use useCallback in parent components
export function useSmsListener(options: UseSmsListenerOptions) {
  const { onSmsReceived, onSmsSent, onSmsDelivered } = options;
  
  // Use refs to avoid dependency issues
  const onSmsReceivedRef = useRef(onSmsReceived);
  const onSmsSentRef = useRef(onSmsSent);
  const onSmsDeliveredRef = useRef(onSmsDelivered);
  
  useEffect(() => {
    onSmsReceivedRef.current = onSmsReceived;
    onSmsSentRef.current = onSmsSent;
    onSmsDeliveredRef.current = onSmsDelivered;
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    const subscriptions = [];

    if (onSmsReceivedRef.current) {
      subscriptions.push(
        DeviceEventEmitter.addListener('onSmsReceived', (event) => {
          onSmsReceivedRef.current?.(event);
        })
      );
    }
    // ... same for other listeners
    
    return () => subscriptions.forEach(sub => sub.remove());
  }, []); // Empty deps - safe with refs
}
```

---

### 2. 🔴 Potential Race Condition in markAsRead
**File:** `src/services/smsService.ts`  
**Lines:** 489-497

**Issue:**  
Verification logic runs asynchronously in setTimeout without awaiting completion, and has no error boundary if the component unmounts.

```typescript
// Line 489-497 - RACE CONDITION
setTimeout(async () => {
  try {
    const verifyMessages = await this.readConversationMessages(phoneNumber);
    // What if component unmounted? What if another markAsRead was called?
  } catch (verifyError) {
    console.error('[smsService] Verification failed:', verifyError);
  }
}, 1000);
```

**Impact:**  
- Stale state updates if component unmounts
- Multiple simultaneous markAsRead calls can conflict
- Verification may check wrong conversation
- Memory leak from dangling promises

**Fix:**
```typescript
async markAsRead(phoneNumber: string): Promise<void> {
  // ... existing code ...
  
  // Return a promise that includes verification
  const result = await SmsReadManager.markConversationAsRead(phoneNumber);
  
  // Await verification with timeout
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Verify with abort signal support
  const verifyMessages = await this.readConversationMessages(phoneNumber);
  const stillUnread = verifyMessages.filter(msg => !msg.read && msg.type === 'received');
  console.log(`[smsService] Verification: ${stillUnread.length} unread`);
  
  return; // Return cleanly
}
```

---

### 3. 🔴 Unregistered Broadcast Receivers Memory Leak
**File:** `android/.../EnhancedSmsManagerModule.java`  
**Lines:** 333-341

**Issue:**  
Receivers are only unregistered on `onCatalystInstanceDestroy()`, but if the module is recreated (e.g., reload, CodePush), old receivers accumulate.

```java
// Line 333 - ONLY CALLED ON FULL CATALYST DESTROY
@Override
public void onCatalystInstanceDestroy() {
  try {
    reactContext.unregisterReceiver(sentReceiver);
    reactContext.unregisterReceiver(deliveredReceiver);
  } catch (Exception e) {
    Log.e(TAG, "Error unregistering receivers", e);
  }
}
```

**Impact:**  
- Broadcast receivers leak on every reload
- Multiple receivers fire for same SMS
- Duplicate status callbacks
- App crash: "Receiver not registered"

**Fix:**
```java
// Add initialization guard
private boolean receiversRegistered = false;

private void registerReceivers() {
  if (receiversRegistered) {
    return; // Already registered
  }
  
  try {
    // ... existing registration code ...
    receiversRegistered = true;
    Log.d(TAG, "Broadcast receivers registered successfully");
  } catch (Exception e) {
    Log.e(TAG, "Failed to register receivers", e);
  }
}

@Override
public void invalidate() {
  // Also unregister on invalidate (hot reload)
  unregisterReceivers();
}

private void unregisterReceivers() {
  if (!receiversRegistered) {
    return;
  }
  
  try {
    reactContext.unregisterReceiver(sentReceiver);
    reactContext.unregisterReceiver(deliveredReceiver);
    receiversRegistered = false;
    Log.d(TAG, "Broadcast receivers unregistered");
  } catch (Exception e) {
    Log.e(TAG, "Error unregistering receivers", e);
  }
}
```

---

## 🟠 HIGH PRIORITY BUGS

### 4. 🟠 Unbounded pendingMessages Map Growth
**File:** `android/.../EnhancedSmsManagerModule.java`  
**Line:** 33

**Issue:**  
The `pendingMessages` ConcurrentHashMap can grow unbounded if delivery confirmations never arrive.

```java
// Line 33 - UNBOUNDED GROWTH
private final Map<String, PendingMessageTracker> pendingMessages = new ConcurrentHashMap<>();
```

**Impact:**  
- Memory leak over time
- OutOfMemoryError after sending many messages
- Stale trackers persist indefinitely

**Current Mitigation:** Background checker removes after 2 minutes (line 313)  
**Problem:** Checker only runs if messages exist - doesn't help empty map after cleanup

**Fix:**
```java
// Add size limit
private static final int MAX_PENDING_MESSAGES = 100;

// Before adding new message
if (pendingMessages.size() >= MAX_PENDING_MESSAGES) {
  // Remove oldest entry
  String oldestKey = pendingMessages.entrySet().stream()
    .min(Map.Entry.comparingByValue(
      Comparator.comparingLong(t -> t.sentTimestamp)
    ))
    .map(Map.Entry::getKey)
    .orElse(null);
  
  if (oldestKey != null) {
    pendingMessages.remove(oldestKey);
    Log.w(TAG, "Removed oldest pending message due to limit");
  }
}
```

---

### 5. 🟠 No Cancellation for Socket Reconnection
**File:** `src/services/socketService.ts`  
**Lines:** 179-184

**Issue:**  
Reconnection timers are not cancelled when socket connects successfully or disconnect() is called while timer is pending.

```typescript
// Line 179 - Timer not cancelled on successful connection
this.reconnectTimer = setTimeout(() => {
  if (!this.isConnected) {
    console.log('🔄 Attempting to reconnect...');
    this.connect();
  }
}, delay);
```

**Impact:**  
- Multiple simultaneous connection attempts
- Connection thrashing
- Wasted network/battery
- "Already connected" errors

**Fix:**
```typescript
private connect(): void {
  // Cancel any pending reconnection
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  
  if (this.socket?.connected) {
    console.log('Already connected, skipping connect');
    return;
  }
  
  // ... rest of connect logic
}

// In setupEventHandlers - on connect
this.socket.on('connect', () => {
  console.log('✅ Socket connected successfully');
  this.isConnected = true;
  this.reconnectAttempts = 0;
  this.connectionError = null;
  
  // Cancel any pending reconnection timers
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  
  this.registerDevice();
  this.emit('connected', { connected: true, attempts: this.reconnectAttempts });
});
```

---

### 6. 🟠 Missing Error Handling in sendSMS
**File:** `src/services/smsService.ts`  
**Lines:** 314-402

**Issue:**  
The DualSimManager fallback path doesn't rethrow errors properly, causing silent failures.

```typescript
// Line 351-354 - Silently swallows errors
} catch (simError: any) {
  console.warn('DualSimManager failed, falling back to default SMS manager:', simError);
  // Don't throw here, fall through to default SMS manager
}
```

**Impact:**  
- User thinks message sent but it didn't
- No error feedback to user
- Confusing UX

**Fix:**
```typescript
// Track if any method succeeded
let sendSucceeded = false;
let lastError: Error | null = null;

try {
  if (subscriptionId !== undefined && subscriptionId !== -1) {
    const { DualSimManager } = NativeModules;
    if (DualSimManager) {
      try {
        await DualSimManager.sendSmsWithSim(cleanNumber, message, msgId, subscriptionId);
        sendSucceeded = true;
        return true;
      } catch (simError: any) {
        console.warn('DualSimManager failed:', simError);
        lastError = simError;
        // Fall through to try other methods
      }
    }
  }
  
  if (EnhancedSmsManager) {
    try {
      await EnhancedSmsManager.sendSMS(cleanNumber, message, msgId);
      sendSucceeded = true;
      return true;
    } catch (error) {
      lastError = error;
    }
  }
  
  // Fallback
  const result = await new Promise((resolve, reject) => {
    SmsAndroid.autoSend(cleanNumber, message,
      (fail) => reject(new Error(fail)),
      (success) => resolve(true)
    );
  });
  
  sendSucceeded = true;
  return result;
  
} catch (error: any) {
  // All methods failed - throw the last error
  throw lastError || error;
}
```

---

### 7. 🟠 Async Function Anti-Pattern in readAllMessages
**File:** `src/services/smsService.ts`  
**Line:** 126

**Issue:**  
Using `new Promise(async (resolve, reject) => ...)` is an anti-pattern. The async executor is unnecessary.

```typescript
// Line 126 - ANTI-PATTERN
async readAllMessages(): Promise<Message[]> {
  return new Promise(async (resolve, reject) => {
    // ... should not be async
  });
}
```

**Impact:**  
- Uncaught promise rejections if async code throws before callbacks
- Confusion about error handling
- Promise may never resolve/reject

**Fix:**
```typescript
async readAllMessages(): Promise<Message[]> {
  if (Platform.OS !== 'android') {
    return [];
  }

  // Check permissions first
  const hasPerms = await this.hasPermissions();
  if (!hasPerms) {
    throw new Error('SMS permissions not granted...');
  }

  // Wrap callback-based API in promise properly
  return new Promise((resolve, reject) => {
    const filter = {
      box: '',
      indexFrom: 0,
      maxCount: 1000,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => reject(new Error(fail)),
      (count: number, smsList: string) => {
        try {
          const messages: any[] = JSON.parse(smsList);
          // ... formatting
          resolve(formattedMessages);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}
```

---

### 8. 🟠 Missing sendSMS Overload Signature
**File:** `android/.../EnhancedSmsManagerModule.java`  
**Line:** 176

**Issue:**  
Method signature expects 5 parameters but JavaScript may call with 4 (subscriptionId optional).

```java
// Line 176 - subscriptionId is Integer, not optional
@ReactMethod
public void sendSMS(String phoneNumber, String message, String messageId, Integer subscriptionId, Promise promise)
```

**Impact:**  
- Crash if called without subscriptionId: "Wrong number of arguments"
- Type mismatch errors

**Fix:**
```java
// Add overload
@ReactMethod
public void sendSMS(String phoneNumber, String message, String messageId, Promise promise) {
  sendSMS(phoneNumber, message, messageId, null, promise);
}

@ReactMethod
public void sendSMS(String phoneNumber, String message, String messageId, Integer subscriptionId, Promise promise) {
  // ... existing implementation
}
```

---

### 9. 🟠 Socket Event Handlers Not Cleaned Up
**File:** `src/services/socketService.ts`  
**Lines:** 73-138

**Issue:**  
Socket event handlers are set up but never explicitly removed when socket is recreated.

```typescript
// Line 73-138 - Handlers added but never removed
private setupEventHandlers(): void {
  if (!this.socket) return;

  this.socket.on('connect', () => { ... });
  this.socket.on('disconnect', () => { ... });
  // ... many more
}
```

**Impact:**  
- Multiple handlers fire for same event after reconnect
- Memory leak
- Duplicate message sends

**Fix:**
```typescript
private cleanupSocketHandlers(): void {
  if (!this.socket) return;
  
  this.socket.removeAllListeners('connect');
  this.socket.removeAllListeners('disconnect');
  this.socket.removeAllListeners('authenticated');
  this.socket.removeAllListeners('qr:paired');
  this.socket.removeAllListeners('send:message');
  this.socket.removeAllListeners('mark:read');
  this.socket.removeAllListeners('request:sync');
  this.socket.removeAllListeners('connect_error');
  this.socket.removeAllListeners('error');
  this.socket.removeAllListeners('connect_timeout');
}

private connect(): void {
  // ... existing checks ...
  
  // Clean up old socket
  if (this.socket) {
    this.cleanupSocketHandlers();
    this.socket.disconnect();
  }
  
  this.socket = io(SOCKET_URL, { ... });
  this.setupEventHandlers();
}
```

---

### 10. 🟠 No Bounds Check on Message Body Length
**File:** `src/services/smsService.ts`  
**Lines:** 331-333

**Issue:**  
Message validation checks for empty but not for max length. SMS messages have 160-char limit (70 for Unicode).

```typescript
// Line 331-333 - No max length check
if (!message || message.trim().length === 0) {
  throw new Error('Message cannot be empty. Please enter a message.');
}
```

**Impact:**  
- Very long messages silently truncated
- Poor UX - user doesn't know message was cut off
- Multipart SMS costs more

**Fix:**
```typescript
// After empty check
const MAX_SMS_LENGTH = 1600; // 10 parts max
if (message.length > MAX_SMS_LENGTH) {
  throw new Error(`Message too long (${message.length} chars). Maximum is ${MAX_SMS_LENGTH} characters.`);
}

// Warn for multipart
const parts = Math.ceil(message.length / 160);
if (parts > 1) {
  console.warn(`Message will be sent as ${parts} parts`);
}
```

---

## 🟡 MEDIUM PRIORITY BUGS

### 11. 🟡 Excessive Console Logging in Production
**Files:** Multiple (smsService.ts, socketService.ts, EnhancedSmsManagerModule.java)

**Issue:**  
Excessive console.log() calls in production builds harm performance and leak sensitive data.

**Impact:**  
- Performance degradation (especially on Android)
- Logs visible in production
- Phone numbers, message content in logs
- Battery drain

**Fix:**
```typescript
// Create logger utility
// src/utils/logger.ts
const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
};

// Replace all console.log with logger.log
```

---

### 12. 🟡 Missing Null Checks in ConversationItem
**File:** `src/components/ConversationItem.tsx`  
**Lines:** 37-42

**Issue:**  
Accessing `displayName.split()` without checking if displayName exists.

```typescript
// Line 37-42 - Potential crash
const initials = displayName
  .split(' ')
  .map(word => word[0])
  .join('')
  .substring(0, 2)
  .toUpperCase();
```

**Impact:**  
- App crash if displayName is null/undefined
- Happens when contact name fails to load

**Fix:**
```typescript
const initials = displayName
  ? displayName
      .split(' ')
      .map(word => word[0] || '')
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase()
  : '?';
```

---

### 13. 🟡 No Timeout on readConversationMessages
**File:** `src/services/smsService.ts`  
**Lines:** 196-258

**Issue:**  
SmsAndroid.list() callback may never fire, causing promise to hang forever.

**Impact:**  
- App freeze on SMS read
- No way to recover
- User must force close app

**Fix:**
```typescript
async readConversationMessages(phoneNumber: string): Promise<Message[]> {
  // ... permission checks ...
  
  return Promise.race([
    new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => reject(new Error(fail)),
        (count: number, smsList: string) => {
          // ... existing logic
        }
      );
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMS read timeout')), 10000)
    )
  ]);
}
```

---

### 14. 🟡 Type Safety Issue in Message Status
**File:** `src/types.ts` (inferred)

**Issue:**  
Message status is string type, not enum, allowing invalid values.

**Fix:**
```typescript
// Define strict types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  phoneNumber: string;
  body: string;
  timestamp: number;
  type: 'sent' | 'received';
  status?: MessageStatus; // Strict type
  read: boolean;
}
```

---

### 15. 🟡 Infinite Timeout Checker Loop
**File:** `android/.../EnhancedSmsManagerModule.java`  
**Lines:** 288-322

**Issue:**  
Background timeout checker runs forever with no stop condition.

```java
// Line 319 - RUNS FOREVER
handler.postDelayed(this, 5000); // Check every 5 seconds
```

**Impact:**  
- Wastes CPU/battery even when no messages pending
- Runs even when app backgrounded

**Fix:**
```java
private volatile boolean timeoutCheckerRunning = false;

private void startTimeoutChecker() {
  if (timeoutCheckerRunning) {
    return;
  }
  
  timeoutCheckerRunning = true;
  final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
  
  handler.post(new Runnable() {
    @Override
    public void run() {
      // Stop if no pending messages
      if (pendingMessages.isEmpty()) {
        Log.d(TAG, "No pending messages, stopping timeout checker");
        timeoutCheckerRunning = false;
        return;
      }
      
      // ... existing timeout logic ...
      
      handler.postDelayed(this, 5000);
    }
  });
}

// Restart checker when adding messages
pendingMessages.put(messageId, new PendingMessageTracker(messageId));
if (!timeoutCheckerRunning) {
  startTimeoutChecker();
}
```

---

### 16. 🟡 No debouncing on loadConversations
**File:** `app/index.tsx`  
**Lines:** 155-184

**Issue:**  
`loadConversations()` can be called rapidly from multiple sources causing redundant loads.

**Impact:**  
- Unnecessary SMS database queries
- UI flicker
- Battery/performance waste

**Fix:**
```typescript
// Add debouncing
const loadConversationsDebounced = useCallback(
  debounce(async () => {
    // ... existing loadConversations logic
  }, 500),
  [permissions.hasSmsPermissions]
);
```

---

### 17. 🟡 Hardcoded maxCount Limits
**Files:** `smsService.ts` lines 143, 214

**Issue:**  
Hardcoded limits of 1000 and 500 messages may truncate conversations.

**Impact:**  
- Older messages not visible
- No way to load more
- Users lose history

**Fix:**
```typescript
// Add pagination support
async readAllMessages(offset = 0, limit = 1000): Promise<Message[]> {
  const filter = {
    box: '',
    indexFrom: offset,
    maxCount: limit,
  };
  // ... rest
}

// Add loadMore functionality
async loadMoreMessages(phoneNumber: string, currentCount: number): Promise<Message[]> {
  const filter = {
    box: '',
    address: phoneNumber,
    indexFrom: currentCount,
    maxCount: 100,
  };
  // ...
}
```

---

### 18. 🟡 Missing Input Sanitization
**File:** `src/services/smsService.ts`  
**Line:** 336

**Issue:**  
Phone number cleaning only removes spaces/dashes, not other special chars.

```typescript
// Line 336 - Incomplete sanitization
const cleanNumber = phoneNumber.replace(/[\s-()]/g, '');
```

**Impact:**  
- Invalid characters passed to SMS manager
- SMS send failures
- Potential injection if number contains special chars

**Fix:**
```typescript
// More robust sanitization
const cleanNumber = phoneNumber
  .replace(/[^\d+]/g, '') // Keep only digits and +
  .trim();

// Validate format
if (!cleanNumber.match(/^\+?\d{10,15}$/)) {
  throw new Error('Invalid phone number format');
}
```

---

## 🔵 LOW PRIORITY / IMPROVEMENTS

### 19. 🔵 Inefficient Conversation Sorting
**File:** `src/services/smsService.ts`  
**Line:** 302

**Issue:**  
Sorts entire conversation list on every call.

**Fix:** Maintain sorted order during insertion instead.

---

### 20. 🔵 No Request Cancellation
**Issue:** API requests can't be cancelled when component unmounts.
**Fix:** Use AbortController for fetch/axios requests.

---

### 21. 🔵 Missing TypeScript Strict Mode
**File:** `tsconfig.json` (inferred)
**Fix:** Enable `"strict": true` and fix type errors.

---

### 22. 🔵 No Code Splitting
**Issue:** Entire app bundle loaded upfront.
**Fix:** Use dynamic imports for screens.

---

### 23. 🔵 No Analytics Error Tracking
**Issue:** Production crashes not monitored.
**Fix:** Integrate Sentry or similar.

---

## 📊 Priority Matrix

| Bug # | Severity | Effort | Impact | Priority |
|-------|----------|--------|--------|----------|
| 1 | Critical | Medium | High | 🔴 P0 |
| 2 | Critical | Low | High | 🔴 P0 |
| 3 | Critical | Medium | High | 🔴 P0 |
| 4 | High | Medium | High | 🟠 P1 |
| 5 | High | Low | Medium | 🟠 P1 |
| 6 | High | Low | Medium | 🟠 P1 |
| 7 | High | Low | Low | 🟠 P2 |
| 8 | High | Low | Medium | 🟠 P1 |
| 9 | High | Medium | High | 🟠 P1 |
| 10 | High | Low | Medium | 🟠 P2 |
| 11 | Medium | Low | Low | 🟡 P3 |
| 12 | Medium | Low | Medium | 🟡 P2 |
| 13 | Medium | Low | High | 🟡 P2 |
| 14 | Medium | Low | Low | 🟡 P3 |
| 15 | Medium | Medium | Medium | 🟡 P2 |
| 16 | Medium | Low | Low | 🟡 P3 |
| 17 | Medium | Medium | Medium | 🟡 P3 |
| 18 | Medium | Low | Medium | 🟡 P2 |
| 19-23 | Low | Various | Low | 🔵 P4 |

---

## 🎯 Recommended Fix Order

### Sprint 1 (Week 1) - Critical Fixes
1. Fix useSmsListener memory leak (#1)
2. Fix markAsRead race condition (#2)
3. Fix broadcast receiver leak (#3)

### Sprint 2 (Week 2) - High Priority
4. Fix socket event cleanup (#9)
5. Fix pendingMessages growth (#4)
6. Fix sendSMS error handling (#6)
7. Fix socket reconnection (#5)

### Sprint 3 (Week 3) - Medium Priority
8. Add null checks (#12)
9. Add timeouts (#13)
10. Add input sanitization (#18)
11. Remove production logs (#11)

### Sprint 4 (Week 4) - Polish
12. Remaining medium/low issues
13. Add tests for fixes
14. Performance optimization

---

## 🧪 Testing Recommendations

### Unit Tests Needed
- SMS service methods
- Socket reconnection logic
- Message parsing/formatting

### Integration Tests
- SMS send/receive flow
- Mark as read flow
- Socket connection lifecycle

### E2E Tests
- Complete conversation flow
- Permission flow
- Error scenarios

---

## 📝 Additional Notes

### Code Quality
- Add ESLint rules for Promise anti-patterns
- Enable TypeScript strict mode gradually
- Add pre-commit hooks for linting

### Documentation
- Add JSDoc comments to all public methods
- Document error codes
- Create troubleshooting guide

### Monitoring
- Add crash reporting (Sentry/Crashlytics)
- Add performance monitoring
- Track critical user flows

---

**Report Generated By:** Automated Code Audit  
**Next Review:** After Sprint 1 fixes  
**Questions?** Open issue in project repo
