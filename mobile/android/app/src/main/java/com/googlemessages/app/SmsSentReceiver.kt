package com.googlemessages.app

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver for handling SMS sent confirmations
 */
class SmsSentReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "SmsSentReceiver received broadcast: ${intent.action}")
        val messageId = intent.getStringExtra("messageId") ?: "unknown"
        val phoneNumber = intent.getStringExtra("phoneNumber") ?: "unknown"
        Log.d(TAG, "MessageId: $messageId, PhoneNumber: $phoneNumber, ResultCode: $resultCode")
        
        val params = Arguments.createMap()
        params.putString("messageId", messageId)
        params.putString("phoneNumber", phoneNumber)
        
        when (resultCode) {
            Activity.RESULT_OK -> {
                Log.d(TAG, "SMS sent successfully to $phoneNumber, messageId: $messageId")
                params.putString("status", "sent")
                params.putString("error", null)
                sendEvent(context, "onSmsSent", params)
            }
            SmsManager.RESULT_ERROR_GENERIC_FAILURE -> {
                Log.e(TAG, "SMS send failed: Generic failure")
                params.putString("status", "failed")
                params.putString("error", "Generic failure. Please try again.")
                sendEvent(context, "onSmsSent", params)
            }
            SmsManager.RESULT_ERROR_NO_SERVICE -> {
                Log.e(TAG, "SMS send failed: No service")
                params.putString("status", "failed")
                params.putString("error", "No cellular service. Check your connection.")
                sendEvent(context, "onSmsSent", params)
            }
            SmsManager.RESULT_ERROR_NULL_PDU -> {
                Log.e(TAG, "SMS send failed: Null PDU")
                params.putString("status", "failed")
                params.putString("error", "Invalid message format.")
                sendEvent(context, "onSmsSent", params)
            }
            SmsManager.RESULT_ERROR_RADIO_OFF -> {
                Log.e(TAG, "SMS send failed: Radio off")
                params.putString("status", "failed")
                params.putString("error", "Airplane mode is on. Turn off airplane mode.")
                sendEvent(context, "onSmsSent", params)
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
        private const val TAG = "SmsSentReceiver"
    }
}
