package com.googlemessages.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver for receiving SMS messages
 * Required for the app to be eligible as default SMS app
 */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_DELIVER_ACTION) {
            try {
                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                
                for (message in messages) {
                    val sender = message.displayOriginatingAddress
                    val body = message.messageBody
                    val timestamp = message.timestampMillis
                    
                    Log.d(TAG, "SMS received from: $sender, Body: $body")
                    
                    // Send to React Native
                    sendMessageToReactNative(context, sender, body, timestamp)
                    
                    // Show notification
                    showNotification(context, sender, body)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing SMS", e)
            }
        }
    }
    
    /**
     * Send received SMS to React Native
     */
    private fun sendMessageToReactNative(context: Context, sender: String, body: String, timestamp: Long) {
        try {
            val params = Arguments.createMap()
            params.putString("phoneNumber", sender)
            params.putString("body", body)
            params.putDouble("timestamp", timestamp.toDouble())
            params.putString("type", "received")
            
            val reactApp = context.applicationContext as? ReactApplication
            reactApp?.reactNativeHost?.reactInstanceManager?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onSmsReceived", params)
                
            Log.d(TAG, "Sent SMS to React Native")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS to React Native: ${e.message}")
        }
    }
    
    /**
     * Show notification for received SMS
     */
    private fun showNotification(context: Context, sender: String, body: String) {
        try {
            createNotificationChannel(context)
            
            // Create intent to open the app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("phoneNumber", sender)
                setPackage(context.packageName) // Explicit package for security
            }
            
            // Use FLAG_IMMUTABLE for Android 6.0+ (when it was introduced)
            // This is REQUIRED for Android 12, 13, 14, 15 (Samsung One UI 7.0)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            
            val pendingIntent = try {
                PendingIntent.getActivity(
                    context,
                    sender.hashCode(),
                    intent,
                    flags
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error creating PendingIntent for notification: ${e.message}", e)
                null
            }
            
            // Get contact name if available
            val displayName = getContactName(context, sender) ?: sender
            
            val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.sym_action_chat) // Better SMS icon
                .setContentTitle(displayName)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText(body)
                    .setBigContentTitle(displayName))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setVibrate(longArrayOf(0, 250, 250, 250)) // Vibration pattern
                .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
                .setLights(0xFF0000FF.toInt(), 1000, 500) // Blue LED
                .setShowWhen(true)
                .setWhen(System.currentTimeMillis())
            
            // Only set content intent if PendingIntent was created successfully
            if (pendingIntent != null) {
                notificationBuilder.setContentIntent(pendingIntent)
            }
            
            val notification = notificationBuilder.build()
            
            NotificationManagerCompat.from(context)
                .notify(sender.hashCode(), notification)
                
            Log.d(TAG, "Notification shown")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show notification: ${e.message}")
        }
    }
    
    /**
     * Get contact name from phone number
     */
    private fun getContactName(context: Context, phoneNumber: String): String? {
        try {
            val uri = android.provider.ContactsContract.PhoneLookup.CONTENT_FILTER_URI
            val contentUri = android.net.Uri.withAppendedPath(uri, android.net.Uri.encode(phoneNumber))
            val projection = arrayOf(android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME)
            
            context.contentResolver.query(contentUri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME)
                    if (nameIndex >= 0) {
                        return cursor.getString(nameIndex)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting contact name: ${e.message}")
        }
        return null
    }
    
    /**
     * Create notification channel (required for Android 8.0+)
     */
    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for incoming SMS messages"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                enableLights(true)
                lightColor = 0xFF0000FF.toInt() // Blue
                setShowBadge(true)
            }
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    companion object {
        private const val TAG = "SmsReceiver"
        private const val CHANNEL_ID = "sms_messages"
    }
}
