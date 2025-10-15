package com.googlemessages.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*

/**
 * Native module for managing dual SIM functionality
 */
class DualSimManager(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "DualSimManager"
    }
    
    /**
     * Get list of available SIM cards
     */
    @ReactMethod
    fun getSimCards(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            promise.reject("NOT_SUPPORTED", "Dual SIM requires Android 5.1+")
            return
        }
        
        try {
            // Check permission
            if (ActivityCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.READ_PHONE_STATE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "READ_PHONE_STATE permission required")
                return
            }
            
            val subscriptionManager = reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            if (subscriptionManager == null) {
                promise.reject("ERROR", "SubscriptionManager not available")
                return
            }
            
            val simCards = WritableNativeArray()
            val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
            
            if (activeSubscriptions != null && activeSubscriptions.isNotEmpty()) {
                for (subInfo in activeSubscriptions) {
                    val simCard = Arguments.createMap()
                    
                    // Subscription ID (used for sending SMS)
                    simCard.putInt("subscriptionId", subInfo.subscriptionId)
                    
                    // Sim slot index (0 = SIM1, 1 = SIM2)
                    simCard.putInt("slotIndex", subInfo.simSlotIndex)
                    
                    // Display name (carrier name or custom name)
                    simCard.putString("displayName", subInfo.displayName?.toString() ?: "SIM ${subInfo.simSlotIndex + 1}")
                    
                    // Carrier name
                    simCard.putString("carrierName", subInfo.carrierName?.toString() ?: "Unknown")
                    
                    // Phone number (may not always be available)
                    simCard.putString("phoneNumber", subInfo.number ?: "")
                    
                    // Country ISO
                    simCard.putString("countryIso", subInfo.countryIso ?: "")
                    
                    // Is default for voice/SMS/data
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        val defaultSubId = SubscriptionManager.getDefaultSmsSubscriptionId()
                        simCard.putBoolean("isDefaultSms", subInfo.subscriptionId == defaultSubId)
                    }
                    
                    simCards.pushMap(simCard)
                    
                    Log.d(TAG, "SIM found: ${subInfo.displayName}, Slot: ${subInfo.simSlotIndex}, SubId: ${subInfo.subscriptionId}")
                }
            }
            
            promise.resolve(simCards)
            
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied: ${e.message}")
            promise.reject("PERMISSION_DENIED", "Permission denied: ${e.message}", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting SIM cards: ${e.message}", e)
            promise.reject("ERROR", "Failed to get SIM cards: ${e.message}", e)
        }
    }
    
    /**
     * Get default SIM for SMS
     */
    @ReactMethod
    fun getDefaultSmsSubscriptionId(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            promise.resolve(-1)
            return
        }
        
        try {
            val defaultSubId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                SubscriptionManager.getDefaultSmsSubscriptionId()
            } else {
                -1
            }
            promise.resolve(defaultSubId)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting default SMS subscription: ${e.message}")
            promise.resolve(-1)
        }
    }
    
    /**
     * Check if device has multiple SIM cards
     */
    @ReactMethod
    fun isDualSimDevice(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            promise.resolve(false)
            return
        }
        
        try {
            if (ActivityCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.READ_PHONE_STATE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.resolve(false)
                return
            }
            
            val subscriptionManager = reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val activeSubscriptions = subscriptionManager?.activeSubscriptionInfoList
            
            val isDual = activeSubscriptions != null && activeSubscriptions.size > 1
            promise.resolve(isDual)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking dual SIM: ${e.message}")
            promise.resolve(false)
        }
    }
    
    /**
     * Get SmsManager for specific subscription
     */
    private fun getSmsManagerForSubscription(subscriptionId: Int): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && subscriptionId != -1) {
            SmsManager.getSmsManagerForSubscriptionId(subscriptionId)
        } else {
            SmsManager.getDefault()
        }
    }
    
    /**
     * Send SMS using specific SIM card
     */
    @ReactMethod
    fun sendSmsWithSim(
        phoneNumber: String,
        message: String,
        messageId: String,
        subscriptionId: Int,
        promise: Promise
    ) {
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
            
            // Get SMS manager for the specific subscription
            val smsManager = getSmsManagerForSubscription(subscriptionId)
            
            Log.d(TAG, "Sending SMS via subscription $subscriptionId to $phoneNumber on Android ${Build.VERSION.SDK_INT}")
            
            // Create pending intents with proper flags
            // FLAG_IMMUTABLE is required for Android 12+ and recommended for Android 6.0+
            // This works on Samsung devices with One UI 7.0 (Android 15)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Use FLAG_IMMUTABLE for Android 6.0+ (when it was introduced)
                // This is REQUIRED for Android 12, 13, 14, 15
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                // Fallback for very old devices (Android < 6.0)
                android.app.PendingIntent.FLAG_UPDATE_CURRENT
            }
            
            Log.d(TAG, "Using PendingIntent flags: $flags")
            
            val sentIntent = try {
                android.app.PendingIntent.getBroadcast(
                    reactContext,
                    messageId.hashCode(),
                    android.content.Intent("com.googlemessages.app.SMS_SENT").apply {
                        putExtra("messageId", messageId)
                        putExtra("phoneNumber", phoneNumber)
                        putExtra("subscriptionId", subscriptionId)
                        setPackage(reactContext.packageName) // Explicit package for security
                    },
                    flags
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error creating sent PendingIntent: ${e.message}", e)
                throw e
            }
            
            val deliveredIntent = try {
                android.app.PendingIntent.getBroadcast(
                    reactContext,
                    messageId.hashCode() + 1,
                    android.content.Intent("com.googlemessages.app.SMS_DELIVERED").apply {
                        putExtra("messageId", messageId)
                        putExtra("phoneNumber", phoneNumber)
                        putExtra("subscriptionId", subscriptionId)
                        setPackage(reactContext.packageName) // Explicit package for security
                    },
                    flags
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error creating delivered PendingIntent: ${e.message}", e)
                throw e
            }
            
            // Check if message needs to be split
            val parts = smsManager.divideMessage(message)
            
            try {
                if (parts.size > 1) {
                    val sentIntents = ArrayList<android.app.PendingIntent>()
                    val deliveredIntents = ArrayList<android.app.PendingIntent>()
                    
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
                    Log.d(TAG, "Multipart SMS sent successfully via subscription $subscriptionId")
                } else {
                    smsManager.sendTextMessage(
                        phoneNumber,
                        null,
                        message,
                        sentIntent,
                        deliveredIntent
                    )
                    Log.d(TAG, "Single SMS sent successfully via subscription $subscriptionId")
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
                Log.d(TAG, "SMS sent successfully without PendingIntents (fallback) via subscription $subscriptionId")
            }
            
            Log.d(TAG, "SMS sent successfully via subscription $subscriptionId")
            promise.resolve(true)
            
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied: ${e.message}")
            promise.reject("PERMISSION_DENIED", "SMS permission denied", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS: ${e.message}", e)
            promise.reject("SEND_FAILED", "Failed to send SMS: ${e.message}", e)
        }
    }
    
    companion object {
        private const val TAG = "DualSimManager"
    }
}
