import { Linking, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import StorageService from './StorageService';
import BatteryTelemetry from '../utils/battery';
import SMSHelper from '../utils/smsHelper';
import SirenStrobeService from './SirenStrobeService';
import AudioRecorderService from './AudioRecorderService';

class SOSExecutionEngine {
  constructor() {
    this.isSOSActive = false;
    this.statusListeners = [];
    this.lastLocation = null;
    this.lastExecutedPayload = null;
  }

  /**
   * Subscribe to SOS status changes
   */
  subscribe(listener) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  _notifyListeners(statusData) {
    this.statusListeners.forEach(listener => {
      try {
        listener(statusData);
      } catch (err) {
        console.error('[SOSExecutionEngine] Listener error:', err);
      }
    });
  }

  /**
   * Primary entry point: Fire complete SOS execution sequence
   * @param {string} triggerSource 'button' | 'voice' | 'shake' | 'journey_timeout'
   */
  async fireSOS(triggerSource = 'button') {
    if (this.isSOSActive) {
      console.warn('[SOSExecutionEngine] SOS is already active.');
      return;
    }

    this.isSOSActive = true;
    console.log(`[SOSExecutionEngine] 🚨 EXECUTING SOS PIPELINE (Trigger: ${triggerSource}) 🚨`);

    this._notifyListeners({
      status: 'ACTIVATING',
      triggerSource,
      message: 'Fetching high-accuracy coordinates & preparing emergency broadcast...',
    });

    try {
      // 1. Fetch settings & emergency contacts
      const settings = await StorageService.getSettings();
      const contacts = await StorageService.getContacts();
      const phoneNumbers = contacts.map(c => c.phone).filter(Boolean);

      // 2. Start Silent Evidence Recording immediately in parallel (30-60s)
      if (settings.autoRecordAudio) {
        AudioRecorderService.startSilentRecording(settings.audioRecordDuration || 45);
      }

      // 3. Start Loud Siren & Strobe Flashlight (if enabled in settings)
      if (settings.autoSirenAlarm) {
        SirenStrobeService.startSiren();
      }
      if (settings.autoStrobeFlashlight) {
        SirenStrobeService.startStrobe();
      }

      // 4. Read Device Battery Telemetry
      const battery = await BatteryTelemetry.getBatteryStatus();

      // 5. Fetch High-Accuracy GPS Location (Timeout 8 seconds, fallback to last known)
      const location = await this._fetchCurrentLocation();
      this.lastLocation = location;

      let mapLink = 'Location unavailable (GPS timeout)';
      if (location) {
        mapLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      }

      // 6. Build High-Priority Emergency Message
      const emergencyMessage =
        `🚨 EMERGENCY SOS ALERT 🚨\n` +
        `I need immediate help! This is an automated emergency message.\n` +
        `Trigger: ${triggerSource.toUpperCase()}\n` +
        `📍 Live Location: ${mapLink}\n` +
        `🔋 Phone Battery: ${battery.formatted}\n` +
        `⏰ Time: ${new Date().toLocaleTimeString()}\n` +
        `Please contact me or dispatch emergency services immediately.`;

      this.lastExecutedPayload = {
        triggerSource,
        timestamp: new Date().toISOString(),
        location,
        mapLink,
        battery: battery.formatted,
        message: emergencyMessage,
      };

      // 7. Dispatch Direct Cellular SMS with WhatsApp Fallback
      this._notifyListeners({
        status: 'DISPATCHING_ALERTS',
        message: `Sending SMS to ${phoneNumbers.length} contacts...`,
        payload: this.lastExecutedPayload,
      });

      const smsResult = await SMSHelper.sendEmergencySMS(phoneNumbers, emergencyMessage);
      console.log('[SOSExecutionEngine] SMS Result:', smsResult);

      // 8. Auto-Dial National Helpline (112) or Primary Contact
      await this._dialHelpline(settings.primaryHelpline || '112');

      this._notifyListeners({
        status: 'ACTIVE',
        message: 'SOS Fired: Alerts dispatched, evidence recording, siren active.',
        payload: this.lastExecutedPayload,
      });

      return {
        success: true,
        payload: this.lastExecutedPayload,
      };
    } catch (error) {
      console.error('[SOSExecutionEngine] Fatal error during SOS execution:', error);
      this._notifyListeners({
        status: 'ERROR',
        message: `SOS execution encountered an error: ${error.message}`,
      });
      return { success: false, error };
    }
  }

  /**
   * Acquire high-accuracy GPS coordinates with promise wrapper
   */
  async _fetchCurrentLocation() {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
          });
        },
        (error) => {
          console.warn('[SOSExecutionEngine] Geolocation error, trying last known position:', error);
          // Fallback to get latest known location
          Geolocation.getLatestPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 5000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    });
  }

  /**
   * Initiate phone call to Helpline
   */
  async _dialHelpline(phoneNumber) {
    try {
      const url = `tel:${phoneNumber}`;
      const canCall = await Linking.canOpenURL(url);
      if (canCall) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.warn('[SOSExecutionEngine] Auto-dial error:', e);
    }
  }

  /**
   * Stop all active alarms, recordings, and reset SOS state
   */
  stopSOS() {
    this.isSOSActive = false;
    SirenStrobeService.stopAll();
    AudioRecorderService.stopRecording();
    this._notifyListeners({
      status: 'IDLE',
      message: 'SOS stood down. Normal monitoring resumed.',
    });
    console.log('[SOSExecutionEngine] SOS Stopped by user.');
  }
}

export default new SOSExecutionEngine();
