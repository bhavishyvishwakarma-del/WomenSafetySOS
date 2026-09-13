package com.womensafety;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.telephony.SmsManager;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.ArrayList;

public class SafetyModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public SafetyModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "SafetyModule";
    }

    /**
     * Send direct cellular SMS via SmsManager without displaying user interaction dialog
     */
    @ReactMethod
    public void sendDirectSMS(String phoneNumber, String message, Promise promise) {
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = reactContext.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (smsManager == null) {
                promise.reject("SMS_FAILED", "SmsManager is not available on this device.");
                return;
            }

            // Split message if longer than single SMS limit (160 characters)
            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            promise.resolve("SMS successfully queued to " + phoneNumber);
        } catch (Exception e) {
            promise.reject("SMS_EXCEPTION", e.getMessage(), e);
        }
    }

    /**
     * Start sticky Android foreground service
     */
    @ReactMethod
    public void startSafetyService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, SafetyForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            promise.resolve("Safety foreground service started.");
        } catch (Exception e) {
            promise.reject("SERVICE_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Stop foreground service
     */
    @ReactMethod
    public void stopSafetyService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, SafetyForegroundService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve("Safety service stopped.");
        } catch (Exception e) {
            promise.reject("SERVICE_STOP_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Check and launch battery optimization exemption intent
     */
    @ReactMethod
    public void requestBatteryOptimizationExemption(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                String packageName = reactContext.getPackageName();
                PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    promise.resolve("Prompted for battery optimization exemption.");
                    return;
                }
            }
            promise.resolve("Battery optimization already ignored or not supported.");
        } catch (Exception e) {
            promise.reject("BATTERY_OPT_ERROR", e.getMessage(), e);
        }
    }
}
