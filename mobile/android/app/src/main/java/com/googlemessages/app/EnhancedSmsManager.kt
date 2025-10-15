package com.googlemessages.app

import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Enhanced SMS Manager with proper delivery tracking
 */
class EnhancedSmsManager(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "EnhancedSmsManager"
    }
    
    /**
     * Send SMS with delivery tracking
     */
    @ReactMethod
    fun sendSMS(phoneNumber: String, message: String, messageId: String, promise: Promise) {
        try {
            // Validate inputs
            if (phoneNumber.isBlank()) {
                promise.reject("INVALID_NUMBER", "Phone number cannot be empty")
                return
            }
            
            if (message.isBlank()) {
                promise.reject("INVALID_MESSAGE", "Message cannot be empty")
                return
            }
            
            // Get SMS manager instance
            val smsManager = SmsManager.getDefault()
            
            // Create pending intents for sent and delivered status
            // For Android 12+ (API 31+), we MUST use FLAG_IMMUTABLE
            // This is required for Android 12, 13, 14, 15 and beyond
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Use FLAG_IMMUTABLE for Android 6.0+ (when it was introduced)
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                // Fallback for very old devices
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            
            Log.d(TAG, "Creating PendingIntent with flags: $flags for Android ${Build.VERSION.SDK_INT}")
            
            val sentIntent = try {
                PendingIntent.getBroadcast(
                    reactContext,
                    messageId.hashCode(),
                    Intent("com.googlemessages.app.SMS_SENT").apply {
                        putExtra("messageId", messageId)
                        putExtra("phoneNumber", phoneNumber)
                        setPackage(reactContext.packageName) // Explicit package for security
                    },
                    flags
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error creating sent PendingIntent: ${e.message}")
                throw e
            }
            
            val deliveredIntent = try {
                PendingIntent.getBroadcast(
                    reactContext,
                    messageId.hashCode() + 1,
                    Intent("com.googlemessages.app.SMS_DELIVERED").apply {
                        putExtra("messageId", messageId)
                        putExtra("phoneNumber", phoneNumber)
                        setPackage(reactContext.packageName) // Explicit package for security
                    },
                    flags
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error creating delivered PendingIntent: ${e.message}")
                throw e
            }
            
            // Check if message needs to be split
            val parts = smsManager.divideMessage(message)
            
            try {
                if (parts.size > 1) {
                    // For long messages, send as multipart
                    val sentIntents = ArrayList<PendingIntent>()
                    val deliveredIntents = ArrayList<PendingIntent>()
                    
                    for (i in parts.indices) {
                        sentIntents.add(sentIntent)
                        deliveredIntents.add(deliveredIntent)
                    }
                    
                    smsManager.sendMultipartTextMessage(
                        phoneNumber,
                        null,
                        parts,
                        sentIntents,
                        deliveredIntents
                    )
                    Log.d(TAG, "Multipart SMS sent successfully")
                } else {
                    // Send single message
                    smsManager.sendTextMessage(
                        phoneNumber,
                        null,
                        message,
                        sentIntent,
                        deliveredIntent
                    )
                    Log.d(TAG, "Single SMS sent successfully")
                }
            } catch (e: Exception) {
                // If sending with PendingIntents fails, try without them as fallback
                Log.w(TAG, "Failed to send with PendingIntents, trying without: ${e.message}")
                
                if (parts.size > 1) {
                    smsManager.sendMultipartTextMessage(
                        phoneNumber,
                        null,
                        parts,
                        null,
                        null
                    )
                } else {
                    smsManager.sendTextMessage(
                        phoneNumber,
                        null,
                        message,
                        null,
                        null
                    )
                }
                Log.d(TAG, "SMS sent successfully without PendingIntents (fallback)")
            }
            
            Log.d(TAG, "SMS sent to $phoneNumber, messageId: $messageId")
            Log.d(TAG, "PendingIntents created - sentIntent: ${sentIntent != null}, deliveredIntent: ${deliveredIntent != null}")
            promise.resolve(true)
            
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied: ${e.message}")
            promise.reject("PERMISSION_DENIED", "SMS permission denied. Please grant SMS permissions in Settings.", e)
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Invalid argument: ${e.message}")
            promise.reject("INVALID_ARGUMENT", "Invalid phone number or message format", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS: ${e.message}", e)
            promise.reject("SEND_FAILED", "Failed to send SMS: ${e.message}", e)
        }
    }
    
    /**
     * Check if device can send SMS
     */
    @ReactMethod
    fun canSendSMS(promise: Promise) {
        try {
            val smsManager = SmsManager.getDefault()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
    
    /**
     * Get SMS delivery status
     */
    @ReactMethod
    fun getDeliveryStatus(messageId: String, promise: Promise) {
        // This would need to be tracked in a local database or shared preferences
        // For now, return pending
        promise.resolve("pending")
    }
    
    /**
     * Mark all messages from a phone number as read
     */
    @ReactMethod
    fun markConversationAsRead(phoneNumber: String, promise: Promise) {
        try {
            val contentResolver = reactContext.contentResolver
            val values = ContentValues()
            values.put(Telephony.Sms.READ, 1)
            values.put(Telephony.Sms.SEEN, 1)
            
            // Update all messages from this phone number
            val selection = "${Telephony.Sms.ADDRESS} = ? AND ${Telephony.Sms.READ} = ?"
            val selectionArgs = arrayOf(phoneNumber, "0")
            
            val updated = contentResolver.update(
                Telephony.Sms.CONTENT_URI,
                values,
                selection,
                selectionArgs
            )
            
            Log.d(TAG, "Marked $updated messages as read for $phoneNumber")
            promise.resolve(updated)
            
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for marking as read: ${e.message}")
            promise.reject("PERMISSION_DENIED", "SMS permission denied", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mark conversation as read: ${e.message}", e)
            promise.reject("MARK_READ_FAILED", "Failed to mark conversation as read: ${e.message}", e)
        }
    }
    
    /**
     * Delete a specific SMS message by ID
     */
    @ReactMethod
    fun deleteSmsMessage(messageId: String, promise: Promise) {
        try {
            val contentResolver = reactContext.contentResolver
            
            // Delete the message from SMS content provider
            val selection = "${Telephony.Sms._ID} = ?"
            val selectionArgs = arrayOf(messageId)
            
            val deleted = contentResolver.delete(
                Telephony.Sms.CONTENT_URI,
                selection,
                selectionArgs
            )
            
            if (deleted > 0) {
                Log.d(TAG, "Successfully deleted message with ID: $messageId")
                promise.resolve(true)
            } else {
                Log.w(TAG, "No message found with ID: $messageId")
                promise.reject("MESSAGE_NOT_FOUND", "Message not found or already deleted")
            }
            
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for deleting message: ${e.message}")
            promise.reject("PERMISSION_DENIED", "SMS permission denied. Cannot delete messages.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete message: ${e.message}", e)
            promise.reject("DELETE_FAILED", "Failed to delete message: ${e.message}", e)
        }
    }
    
    companion object {
        private const val TAG = "EnhancedSmsManager"
    }
}
