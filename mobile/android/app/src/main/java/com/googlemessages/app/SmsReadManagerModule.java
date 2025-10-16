package com.googlemessages.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Telephony;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SmsReadManagerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SmsReadManager";
    private final ReactApplicationContext reactContext;

    public SmsReadManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SmsReadManager";
    }

    /**
     * Mark all messages from a specific phone number as read
     * Requires the app to be the default SMS app on Android 4.4+
     */
    @ReactMethod
    public void markConversationAsRead(String phoneNumber, Promise promise) {
        try {
            Log.d(TAG, "Starting markConversationAsRead for: " + phoneNumber);
            
            // FAIL FAST: Verify app is default SMS app (required for Android 4.4+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                String defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(reactContext);
                String ourPackage = reactContext.getPackageName();
                
                Log.d(TAG, "Default SMS app: " + defaultSmsPackage);
                Log.d(TAG, "Our package: " + ourPackage);
                
                if (!ourPackage.equals(defaultSmsPackage)) {
                    String errorMsg = "App is not the default SMS app. Cannot mark messages as read. Current default: " + defaultSmsPackage;
                    Log.e(TAG, errorMsg);
                    promise.reject("NOT_DEFAULT_SMS_APP", errorMsg);
                    return;
                }
            }
            
            ContentResolver contentResolver = reactContext.getContentResolver();
            
            // Use proper Telephony.Sms.Inbox URI
            Uri uri = Telephony.Sms.Inbox.CONTENT_URI;
            
            // Normalize phone number (remove spaces, dashes, parentheses)
            String normalizedNumber = phoneNumber.replaceAll("[\\s\\-()]", "");
            Log.d(TAG, "Normalized number: " + normalizedNumber);
            
            Cursor cursor = null;
            int markedCount = 0;
            
            try {
                // STEP 1: Get the thread_id for this phone number
                // thread_id is more reliable than address for marking conversations
                Long threadId = getThreadIdForPhoneNumber(phoneNumber, normalizedNumber);
                
                if (threadId == null) {
                    Log.w(TAG, "No thread found for phone number: " + phoneNumber);
                    promise.resolve(0);
                    return;
                }
                
                Log.d(TAG, "Found thread_id: " + threadId + " for " + phoneNumber);
                
                // STEP 2: Count unread messages in this thread
                String selection = "thread_id = ? AND read = ?";
                String[] selectionArgs = new String[]{String.valueOf(threadId), "0"};
                
                cursor = contentResolver.query(
                    uri,
                    new String[]{"_id", "address", "read", "thread_id"},
                    selection,
                    selectionArgs,
                    null
                );
                
                if (cursor != null) {
                    int totalUnread = cursor.getCount();
                    Log.d(TAG, "Found " + totalUnread + " unread messages in thread " + threadId);
                    
                    if (totalUnread == 0) {
                        Log.d(TAG, "No unread messages to mark as read");
                        cursor.close();
                        promise.resolve(0);
                        return;
                    }
                    
                    cursor.close();
                    cursor = null;
                }
                
                // STEP 3: Mark all messages in thread as read using thread_id
                ContentValues values = new ContentValues();
                values.put(Telephony.Sms.Inbox.READ, 1); // 1 = read
                values.put(Telephony.Sms.Inbox.SEEN, 1); // Also mark as seen
                
                // Update by thread_id - more reliable than address
                selection = "thread_id = ?";
                selectionArgs = new String[]{String.valueOf(threadId)};
                
                int updatedRows = contentResolver.update(
                    uri,
                    values,
                    selection,
                    selectionArgs
                );
                
                Log.d(TAG, "✅ Successfully marked " + updatedRows + " messages as read in thread " + threadId);
                markedCount = updatedRows;
                
                // ALWAYS notify the system that SMS database changed (all Android versions)
                contentResolver.notifyChange(uri, null);
                Log.d(TAG, "Notified system of SMS database change");
                
            } catch (SecurityException e) {
                Log.e(TAG, "SecurityException - App is not default SMS app", e);
                promise.reject("SECURITY_ERROR", "Cannot mark as read: App must be set as default SMS app. " + e.getMessage());
                return;
            } catch (Exception e) {
                Log.e(TAG, "Error marking messages as read", e);
                throw e;
            } finally {
                if (cursor != null && !cursor.isClosed()) {
                    cursor.close();
                }
            }
            
            // Wait for database to update
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Log.w(TAG, "Sleep interrupted", e);
            }
            
            // Verify the changes
            if (markedCount > 0) {
                verifyReadStatusByThreadId(getThreadIdForPhoneNumber(phoneNumber, normalizedNumber));
            }
            
            promise.resolve(markedCount);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to mark conversation as read", e);
            promise.reject("MARK_AS_READ_FAILED", e.getMessage(), e);
        }
    }
    
    /**
     * Get thread_id for a phone number
     * Returns null if no thread found
     */
    private Long getThreadIdForPhoneNumber(String phoneNumber, String normalizedNumber) {
        ContentResolver contentResolver = reactContext.getContentResolver();
        Uri uri = Telephony.Sms.CONTENT_URI;
        
        String selection = "address = ? OR address = ?";
        String[] selectionArgs = new String[]{phoneNumber, normalizedNumber};
        
        Cursor cursor = null;
        try {
            cursor = contentResolver.query(
                uri,
                new String[]{"thread_id"},
                selection,
                selectionArgs,
                "date DESC LIMIT 1"
            );
            
            if (cursor != null && cursor.moveToFirst()) {
                int threadIdIndex = cursor.getColumnIndex("thread_id");
                if (threadIdIndex >= 0) {
                    long threadId = cursor.getLong(threadIdIndex);
                    cursor.close();
                    return threadId;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting thread_id for phone number", e);
        } finally {
            if (cursor != null && !cursor.isClosed()) {
                cursor.close();
            }
        }
        
        return null;
    }

    /**
     * Verify that messages were actually marked as read using thread_id
     */
    private void verifyReadStatusByThreadId(Long threadId) {
        if (threadId == null) {
            Log.w(TAG, "Cannot verify - threadId is null");
            return;
        }
        
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri uri = Telephony.Sms.Inbox.CONTENT_URI;
            
            String selection = "thread_id = ? AND read = ?";
            String[] selectionArgs = new String[]{String.valueOf(threadId), "0"};
            
            Cursor cursor = contentResolver.query(
                uri,
                new String[]{"_id", "address", "read", "thread_id"},
                selection,
                selectionArgs,
                null
            );
            
            if (cursor != null) {
                int stillUnread = cursor.getCount();
                if (stillUnread > 0) {
                    Log.w(TAG, "⚠️ Verification: " + stillUnread + " messages still unread in thread " + threadId);
                } else {
                    Log.d(TAG, "✅ Verification: All messages in thread " + threadId + " successfully marked as read");
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error verifying read status", e);
        }
    }

    /**
     * Mark a specific message as read by ID
     */
    @ReactMethod
    public void markMessageAsReadById(String messageId, Promise promise) {
        try {
            Log.d(TAG, "Marking message as read by ID: " + messageId);
            
            // FAIL FAST: Check if default SMS app
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                String defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(reactContext);
                String ourPackage = reactContext.getPackageName();
                
                if (!ourPackage.equals(defaultSmsPackage)) {
                    String errorMsg = "App is not the default SMS app. Cannot mark message as read.";
                    Log.e(TAG, errorMsg);
                    promise.reject("NOT_DEFAULT_SMS_APP", errorMsg);
                    return;
                }
            }
            
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri uri = Telephony.Sms.CONTENT_URI;
            
            ContentValues values = new ContentValues();
            values.put(Telephony.Sms.READ, 1);
            values.put(Telephony.Sms.SEEN, 1);
            
            String selection = "_id = ?";
            String[] selectionArgs = new String[]{messageId};
            
            int updatedRows = contentResolver.update(uri, values, selection, selectionArgs);
            
            if (updatedRows > 0) {
                Log.d(TAG, "✅ Message " + messageId + " marked as read");
                
                // ALWAYS notify system of change
                contentResolver.notifyChange(uri, null);
                Log.d(TAG, "Notified system of SMS database change");
                
                promise.resolve(true);
            } else {
                Log.w(TAG, "⚠️ No message found with ID: " + messageId);
                promise.resolve(false);
            }
            
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException - App is not default SMS app", e);
            promise.reject("SECURITY_ERROR", "Cannot mark as read: App must be set as default SMS app. " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to mark message as read by ID", e);
            promise.reject("MARK_AS_READ_FAILED", e.getMessage(), e);
        }
    }

    /**
     * Get unread message count for a phone number
     */
    @ReactMethod
    public void getUnreadCount(String phoneNumber, Promise promise) {
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri uri = Telephony.Sms.Inbox.CONTENT_URI;
            
            String normalizedNumber = phoneNumber.replaceAll("[\\s\\-()]", "");
            
            // Get thread_id for more reliable querying
            Long threadId = getThreadIdForPhoneNumber(phoneNumber, normalizedNumber);
            
            int unreadCount = 0;
            
            if (threadId != null) {
                // Query by thread_id
                String selection = "thread_id = ? AND read = ?";
                String[] selectionArgs = new String[]{String.valueOf(threadId), "0"};
                
                Cursor cursor = contentResolver.query(
                    uri,
                    new String[]{"_id"},
                    selection,
                    selectionArgs,
                    null
                );
                
                if (cursor != null) {
                    unreadCount = cursor.getCount();
                    cursor.close();
                }
            }
            
            Log.d(TAG, "Unread count for " + phoneNumber + ": " + unreadCount);
            promise.resolve(unreadCount);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get unread count", e);
            promise.reject("GET_UNREAD_COUNT_FAILED", e.getMessage(), e);
        }
    }
}
