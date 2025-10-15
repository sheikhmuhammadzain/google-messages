package com.googlemessages.app

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver for handling SMS delivery confirmations
 */
class SmsDeliveredReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "SmsDeliveredReceiver received broadcast: ${intent.action}")
        val messageId = intent.getStringExtra("messageId") ?: "unknown"
        val phoneNumber = intent.getStringExtra("phoneNumber") ?: "unknown"
        Log.d(TAG, "MessageId: $messageId, PhoneNumber: $phoneNumber, ResultCode: $resultCode")
        
        val params = Arguments.createMap()
        params.putString("messageId", messageId)
        params.putString("phoneNumber", phoneNumber)
        
        when (resultCode) {
            Activity.RESULT_OK -> {
                Log.d(TAG, "SMS delivered successfully to $phoneNumber, messageId: $messageId")
                params.putString("status", "delivered")
                params.putString("error", null)
                sendEvent(context, "onSmsDelivered", params)
            }
            Activity.RESULT_CANCELED -> {
                Log.e(TAG, "SMS delivery failed to $phoneNumber, messageId: $messageId")
                params.putString("status", "not_delivered")
                params.putString("error", "Message not delivered to recipient")
                sendEvent(context, "onSmsDelivered", params)
            }
        }
    }
    
    private fun sendEvent(context: Context, eventName: String, params: WritableMap) {
        try {
            val reactApp = context.applicationContext as? ReactApplication
            reactApp?.reactNativeHost?.reactInstanceManager?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event to React Native: ${e.message}")
        }
    }
    
    companion object {
        private const val TAG = "SmsDeliveredReceiver"
    }
}
