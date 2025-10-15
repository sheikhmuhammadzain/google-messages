package com.googlemessages.app

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log

/**
 * Service for handling MMS operations
 * Required for the app to be eligible as default SMS app
 */
class MmsService : Service() {
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "MmsService started")
        
        // Handle MMS operations here if needed
        // For basic default SMS app support, this service must exist
        
        stopSelf(startId)
        return START_NOT_STICKY
    }
    
    companion object {
        private const val TAG = "MmsService"
    }
}
