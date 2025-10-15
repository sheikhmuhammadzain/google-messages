package com.googlemessages.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/**
 * BroadcastReceiver for receiving MMS messages
 * Required for the app to be eligible as default SMS app
 */
class MmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION) {
            try {
                Log.d(TAG, "MMS received")
                
                // MMS handling is more complex and typically requires
                // parsing the WAP push message and downloading MMS content
                // For basic default SMS app support, this receiver must exist
                
                // You can add custom MMS handling here if needed
            } catch (e: Exception) {
                Log.e(TAG, "Error processing MMS", e)
            }
        }
    }
    
    companion object {
        private const val TAG = "MmsReceiver"
    }
}
