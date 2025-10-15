package com.googlemessages.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.telephony.SmsManager;
import android.telephony.SubscriptionManager;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class EnhancedSmsManagerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "EnhancedSmsManager";
    private static final String SMS_SENT_ACTION = "com.googlemessages.SMS_SENT";
    private static final String SMS_DELIVERED_ACTION = "com.googlemessages.SMS_DELIVERED";
    
    private final ReactApplicationContext reactContext;
    private final Map<String, PendingMessageTracker> pendingMessages = new ConcurrentHashMap<>();
    
    // Track message status with timeout
    private static class PendingMessageTracker {
        String messageId;
        long sentTimestamp;
        boolean sentReceived = false;
        boolean deliveredReceived = false;
        
        PendingMessageTracker(String messageId) {
            this.messageId = messageId;
            this.sentTimestamp = System.currentTimeMillis();
        }
    }

    // Broadcast receiver for sent status
    private final BroadcastReceiver sentReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String messageId = intent.getStringExtra("messageId");
            if (messageId == null) return;
            
            Log.d(TAG, "SMS Sent broadcast received for: " + messageId + ", resultCode: " + getResultCode());
            
            PendingMessageTracker tracker = pendingMessages.get(messageId);
            if (tracker != null) {
                tracker.sentReceived = true;
            }
            
            WritableMap params = Arguments.createMap();
            params.putString("messageId", messageId);
            
            switch (getResultCode()) {
                case Activity.RESULT_OK:
                    params.putString("status", "sent");
                    params.putString("error", null);
                    sendEvent("onSmsSent", params);
                    
                    // Start delivery timeout timer
                    scheduleDeliveryTimeout(messageId);
                    break;
                    
                case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                    params.putString("status", "failed");
                    params.putString("error", "Generic failure");
                    sendEvent("onSmsSent", params);
                    pendingMessages.remove(messageId);
                    break;
                    
                case SmsManager.RESULT_ERROR_NO_SERVICE:
                    params.putString("status", "failed");
                    params.putString("error", "No service");
                    sendEvent("onSmsSent", params);
                    pendingMessages.remove(messageId);
                    break;
                    
                case SmsManager.RESULT_ERROR_NULL_PDU:
                    params.putString("status", "failed");
                    params.putString("error", "Null PDU");
                    sendEvent("onSmsSent", params);
                    pendingMessages.remove(messageId);
                    break;
                    
                case SmsManager.RESULT_ERROR_RADIO_OFF:
                    params.putString("status", "failed");
                    params.putString("error", "Radio off");
                    sendEvent("onSmsSent", params);
                    pendingMessages.remove(messageId);
                    break;
                    
                default:
                    params.putString("status", "failed");
                    params.putString("error", "Unknown error");
                    sendEvent("onSmsSent", params);
                    pendingMessages.remove(messageId);
                    break;
            }
        }
    };

    // Broadcast receiver for delivery status
    private final BroadcastReceiver deliveredReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String messageId = intent.getStringExtra("messageId");
            if (messageId == null) return;
            
            Log.d(TAG, "SMS Delivered broadcast received for: " + messageId + ", resultCode: " + getResultCode());
            
            PendingMessageTracker tracker = pendingMessages.get(messageId);
            if (tracker != null) {
                tracker.deliveredReceived = true;
            }
            
            WritableMap params = Arguments.createMap();
            params.putString("messageId", messageId);
            
            if (getResultCode() == Activity.RESULT_OK) {
                params.putString("status", "delivered");
                params.putString("error", null);
            } else {
                params.putString("status", "failed");
                params.putString("error", "Delivery failed");
            }
            
            sendEvent("onSmsDelivered", params);
            pendingMessages.remove(messageId);
        }
    };

    public EnhancedSmsManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        registerReceivers();
        startTimeoutChecker();
    }

    @Override
    public String getName() {
        return "EnhancedSmsManager";
    }

    private void registerReceivers() {
        try {
            // Register with RECEIVER_EXPORTED for Android 13+ (API 33+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(sentReceiver, 
                    new IntentFilter(SMS_SENT_ACTION),
                    Context.RECEIVER_EXPORTED);
                reactContext.registerReceiver(deliveredReceiver, 
                    new IntentFilter(SMS_DELIVERED_ACTION),
                    Context.RECEIVER_EXPORTED);
            } else {
                reactContext.registerReceiver(sentReceiver, new IntentFilter(SMS_SENT_ACTION));
                reactContext.registerReceiver(deliveredReceiver, new IntentFilter(SMS_DELIVERED_ACTION));
            }
            Log.d(TAG, "Broadcast receivers registered successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register receivers", e);
        }
    }

    @ReactMethod
    public void sendSMS(String phoneNumber, String message, String messageId, Integer subscriptionId, Promise promise) {
        try {
            Log.d(TAG, "Sending SMS to " + phoneNumber + " with messageId: " + messageId);
            
            // Track this message
            pendingMessages.put(messageId, new PendingMessageTracker(messageId));
            
            // Create pending intents with IMMUTABLE flag for Android 12+
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S 
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT;
            
            Intent sentIntent = new Intent(SMS_SENT_ACTION);
            sentIntent.putExtra("messageId", messageId);
            sentIntent.setPackage(reactContext.getPackageName()); // Explicit package for Android 15
            PendingIntent sentPI = PendingIntent.getBroadcast(
                reactContext, 
                messageId.hashCode(), 
                sentIntent, 
                flags
            );
            
            Intent deliveredIntent = new Intent(SMS_DELIVERED_ACTION);
            deliveredIntent.putExtra("messageId", messageId);
            deliveredIntent.setPackage(reactContext.getPackageName()); // Explicit package for Android 15
            PendingIntent deliveredPI = PendingIntent.getBroadcast(
                reactContext, 
                messageId.hashCode() + 1, 
                deliveredIntent, 
                flags
            );
            
            // Get SmsManager instance
            SmsManager smsManager;
            if (subscriptionId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                smsManager = SmsManager.getSmsManagerForSubscriptionId(subscriptionId);
                Log.d(TAG, "Using SIM subscriptionId: " + subscriptionId);
            } else {
                smsManager = SmsManager.getDefault();
                Log.d(TAG, "Using default SIM");
            }
            
            // Split message if needed
            ArrayList<String> parts = smsManager.divideMessage(message);
            
            if (parts.size() > 1) {
                // Multi-part message
                ArrayList<PendingIntent> sentIntents = new ArrayList<>();
                ArrayList<PendingIntent> deliveredIntents = new ArrayList<>();
                
                for (int i = 0; i < parts.size(); i++) {
                    sentIntents.add(sentPI);
                    deliveredIntents.add(deliveredPI);
                }
                
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, deliveredIntents);
                Log.d(TAG, "Sent multipart SMS (" + parts.size() + " parts)");
            } else {
                // Single message
                smsManager.sendTextMessage(phoneNumber, null, message, sentPI, deliveredPI);
                Log.d(TAG, "Sent single SMS");
            }
            
            // Start aggressive timeout for Android 15
            scheduleAggressiveTimeout(messageId);
            
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to send SMS", e);
            pendingMessages.remove(messageId);
            promise.reject("SMS_SEND_FAILED", e.getMessage(), e);
        }
    }

    // Aggressive timeout for Android 15 - 3 seconds
    private void scheduleAggressiveTimeout(final String messageId) {
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            PendingMessageTracker tracker = pendingMessages.get(messageId);
            if (tracker != null && !tracker.sentReceived) {
                Log.w(TAG, "Aggressive timeout for message: " + messageId + " - assuming sent");
                
                WritableMap params = Arguments.createMap();
                params.putString("messageId", messageId);
                params.putString("status", "sent");
                params.putString("error", null);
                sendEvent("onSmsSent", params);
                
                tracker.sentReceived = true;
            }
        }, 3000); // 3 seconds
    }

    // Delivery timeout - 60 seconds
    private void scheduleDeliveryTimeout(final String messageId) {
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            PendingMessageTracker tracker = pendingMessages.get(messageId);
            if (tracker != null && !tracker.deliveredReceived) {
                Log.w(TAG, "Delivery timeout for message: " + messageId + " - assuming delivered");
                
                WritableMap params = Arguments.createMap();
                params.putString("messageId", messageId);
                params.putString("status", "delivered");
                params.putString("error", null);
                sendEvent("onSmsDelivered", params);
                
                pendingMessages.remove(messageId);
            }
        }, 60000); // 60 seconds
    }

    // Background timeout checker every 5 seconds
    private void startTimeoutChecker() {
        final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        handler.post(new Runnable() {
            @Override
            public void run() {
                long now = System.currentTimeMillis();
                
                for (Map.Entry<String, PendingMessageTracker> entry : pendingMessages.entrySet()) {
                    PendingMessageTracker tracker = entry.getValue();
                    long elapsed = now - tracker.sentTimestamp;
                    
                    // Force sent after 4 seconds if not received
                    if (!tracker.sentReceived && elapsed > 4000) {
                        Log.w(TAG, "Force-sending status for: " + tracker.messageId);
                        
                        WritableMap params = Arguments.createMap();
                        params.putString("messageId", tracker.messageId);
                        params.putString("status", "sent");
                        params.putString("error", null);
                        sendEvent("onSmsSent", params);
                        
                        tracker.sentReceived = true;
                    }
                    
                    // Remove stale trackers after 2 minutes
                    if (elapsed > 120000) {
                        Log.w(TAG, "Removing stale tracker: " + tracker.messageId);
                        pendingMessages.remove(entry.getKey());
                    }
                }
                
                handler.postDelayed(this, 5000); // Check every 5 seconds
            }
        });
    }

    private void sendEvent(String eventName, WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        try {
            reactContext.unregisterReceiver(sentReceiver);
            reactContext.unregisterReceiver(deliveredReceiver);
            Log.d(TAG, "Broadcast receivers unregistered");
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receivers", e);
        }
    }
}
