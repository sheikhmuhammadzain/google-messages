package com.googlemessages.app

import android.content.Intent
import android.provider.Telephony
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module to check and set default SMS app
 */
class DefaultSmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "DefaultSmsModule"
    }
    
    /**
     * Check if this app is the default SMS app
     */
    @ReactMethod
    fun isDefaultSmsApp(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(reactApplicationContext)
            promise.resolve(packageName == defaultSmsPackage)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }
    
    /**
     * Request to set this app as default SMS app
     */
    @ReactMethod
    fun requestDefaultSmsApp(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
            intent.putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, packageName)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }
}
