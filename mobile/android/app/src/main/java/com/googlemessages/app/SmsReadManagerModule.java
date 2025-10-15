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
     * Android 15 requires the app to be the default SMS app for this to work
     */
    @ReactMethod
    public void markConversationAsRead(String phoneNumber, Promise promise) {
        try {
            Log.d(TAG, "Starting markConversationAsRead for: " + phoneNumber);
            
            // Verify app is default SMS app (required for Android 15)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                String defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(reactContext);
                String ourPackage = reactContext.getPackageName();
                
                Log.d(TAG, "Default SMS app: " + defaultSmsPackage);
                Log.d(TAG, "Our package: " + ourPackage);
                
                if (!ourPackage.equals(defaultSmsPackage)) {
                    Log.w(TAG, "App is not default SMS app - marking as read may fail on Android 15");
                    // Continue anyway - may still work with WRITE_SMS permission
                }
            }
            
            ContentResolver contentResolver = reactContext.getContentResolver();
            
            // Normalize phone number (remove spaces, dashes, parentheses)
            String normalizedNumber = phoneNumber.replaceAll("[\\s\\-()]", "");
            Log.d(TAG, "Normalized number: " + normalizedNumber);
            
            // Query for unread messages from this phone number
            Uri uri = Uri.parse("content://sms/inbox");
            String selection = "address = ? AND read = ?";
            String[] selectionArgs = new String[]{phoneNumber, "0"};
            
            // Also try with normalized number
            String selectionMulti = "(address = ? OR address = ?) AND read = ?";
            String[] selectionArgsMulti = new String[]{phoneNumber, normalizedNumber, "0"};
            
            Cursor cursor = null;
            int markedCount = 0;
            
            try {
                // First, count how many unread messages we have
                cursor = contentResolver.query(
                    uri,
                    new String[]{"_id", "address", "read"},
                    selectionMulti,
                    selectionArgsMulti,
                    null
                );
                
                if (cursor != null) {
                    int totalUnread = cursor.getCount();
                    Log.d(TAG, "Found " + totalUnread + " unread messages from " + phoneNumber);
                    
                    if (totalUnread == 0) {
                        Log.d(TAG, "No unread messages to mark as read");
                        cursor.close();
                        promise.resolve(0);
                        return;
                    }
                    
                    cursor.close();
                }
                
                // Now mark them as read using ContentValues
                ContentValues values = new ContentValues();
                values.put("read", 1); // 1 = read, 0 = unread
                values.put("seen", 1); // Also mark as seen
                
                // Update all matching messages in one call (more efficient)
                int updatedRows = contentResolver.update(
                    uri,
                    values,
                    selectionMulti,
                    selectionArgsMulti
                );
                
                Log.d(TAG, "✅ Successfully marked " + updatedRows + " messages as read");
                markedCount = updatedRows;
                
                // For Android 15, also notify the system that SMS database changed
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                    contentResolver.notifyChange(uri, null);
                    Log.d(TAG, "Notified system of SMS database change (Android 15)");
                }
                
            } catch (SecurityException e) {
                Log.e(TAG, "SecurityException - App may not be default SMS app", e);
                throw new Exception("Cannot mark as read: App must be set as default SMS app. " + e.getMessage());
            } catch (Exception e) {
                Log.e(TAG, "Error marking messages as read", e);
                throw e;
            } finally {
                if (cursor != null && !cursor.isClosed()) {
                    cursor.close();
                }
            }
            
            // Wait for database to update (Android 15 sync delay)
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Log.w(TAG, "Sleep interrupted", e);
            }
            
            // Verify the changes
            verifyReadStatus(phoneNumber, normalizedNumber);
            
            promise.resolve(markedCount);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to mark conversation as read", e);
            promise.reject("MARK_AS_READ_FAILED", e.getMessage(), e);
        }
    }

    /**
     * Verify that messages were actually marked as read
     */
    private void verifyReadStatus(String phoneNumber, String normalizedNumber) {
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri uri = Uri.parse("content://sms/inbox");
            
            String selection = "(address = ? OR address = ?) AND read = ?";
            String[] selectionArgs = new String[]{phoneNumber, normalizedNumber, "0"};
            
            Cursor cursor = contentResolver.query(
                uri,
                new String[]{"_id", "address", "read"},
                selection,
                selectionArgs,
                null
            );
            
            if (cursor != null) {
                int stillUnread = cursor.getCount();
                if (stillUnread > 0) {
                    Log.w(TAG, "⚠️ Verification: " + stillUnread + " messages still unread after marking");
                } else {
                    Log.d(TAG, "✅ Verification: All messages successfully marked as read");
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
            
            ContentResolver contentResolver = reactContext.getContentResolver();
            Uri uri = Uri.parse("content://sms");
            
            ContentValues values = new ContentValues();
            values.put("read", 1);
            values.put("seen", 1);
            
            String selection = "_id = ?";
            String[] selectionArgs = new String[]{messageId};
            
            int updatedRows = contentResolver.update(uri, values, selection, selectionArgs);
            
            if (updatedRows > 0) {
                Log.d(TAG, "✅ Message " + messageId + " marked as read");
                
                // Notify system of change (Android 15)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                    contentResolver.notifyChange(uri, null);
                }
                
                promise.resolve(true);
            } else {
                Log.w(TAG, "⚠️ No message found with ID: " + messageId);
                promise.resolve(false);
            }
            
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
            Uri uri = Uri.parse("content://sms/inbox");
            
            String normalizedNumber = phoneNumber.replaceAll("[\\s\\-()]", "");
            String selection = "(address = ? OR address = ?) AND read = ?";
            String[] selectionArgs = new String[]{phoneNumber, normalizedNumber, "0"};
            
            Cursor cursor = contentResolver.query(
                uri,
                new String[]{"_id"},
                selection,
                selectionArgs,
                null
            );
            
            int unreadCount = 0;
            if (cursor != null) {
                unreadCount = cursor.getCount();
                cursor.close();
            }
            
            Log.d(TAG, "Unread count for " + phoneNumber + ": " + unreadCount);
            promise.resolve(unreadCount);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get unread count", e);
            promise.reject("GET_UNREAD_COUNT_FAILED", e.getMessage(), e);
        }
    }
}
