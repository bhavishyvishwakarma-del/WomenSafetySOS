import { Vibration } from 'react-native';
import StorageService from './StorageService';
import SOSExecutionEngine from './SOSExecutionEngine';

class JourneyTrackerService {
  constructor() {
    this.activeJourney = null;
    this.timerInterval = null;
    this.listeners = [];
  }

  /**
   * Subscribe to journey updates (seconds remaining, progress, status)
   */
  subscribe(listener) {
    this.listeners.push(listener);
    // Initial emit
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  _notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(l => {
      try {
        l(status);
      } catch (err) {
        console.error('[JourneyTrackerService] Listener notification error:', err);
      }
    });
  }

  getStatus() {
    if (!this.activeJourney) {
      return { isActive: false, remainingSeconds: 0, destination: '', etaMinutes: 0 };
    }
    const elapsedSeconds = Math.floor((Date.now() - this.activeJourney.startTime) / 1000);
    const totalSeconds = this.activeJourney.etaMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    return {
      isActive: true,
      destination: this.activeJourney.destination,
      etaMinutes: this.activeJourney.etaMinutes,
      startTime: this.activeJourney.startTime,
      totalSeconds,
      remainingSeconds,
      percentageRemaining: (remainingSeconds / totalSeconds) * 100,
    };
  }

  /**
   * Start a new journey tracking session
   * @param {string} destination Destination name or address
   * @param {number} etaMinutes Estimated arrival time in minutes
   */
  async startJourney(destination, etaMinutes) {
    if (this.activeJourney) {
      this.stopJourney();
    }

    const journeyData = {
      destination: destination || 'Unspecified Destination',
      etaMinutes: Number(etaMinutes) || 15,
      startTime: Date.now(),
    };

    this.activeJourney = journeyData;
    await StorageService.saveJourneyState(journeyData);

    // Run timer tick every 1 second
    this.timerInterval = setInterval(() => {
      this._onTick();
    }, 1000);

    this._notifyListeners();
    console.log(`[JourneyTrackerService] Journey started to ${destination} (ETA: ${etaMinutes}m)`);
  }

  /**
   * Internal timer tick
   */
  _onTick() {
    if (!this.activeJourney) return;

    const status = this.getStatus();
    this._notifyListeners();

    // Warning vibration at 1 minute remaining
    if (status.remainingSeconds === 60) {
      Vibration.vibrate([0, 500, 200, 500]);
    }

    // Time expired without entering Safe PIN
    if (status.remainingSeconds <= 0) {
      this._handleJourneyTimeout();
    }
  }

  /**
   * Called when ETA expires: Automatically escalates to full SOS alert!
   */
  async _handleJourneyTimeout() {
    console.warn('[JourneyTrackerService] ⚠️ ETA EXPIRED WITHOUT SAFE PIN! Triggering SOS.');
    this.stopJourney(false);

    // Fire SOS alert with journey timeout trigger
    await SOSExecutionEngine.fireSOS('journey_timeout');
  }

  /**
   * Verify entered PIN (Safe PIN vs Duress PIN)
   * @param {string} enteredPin 4-digit PIN
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async verifyPin(enteredPin) {
    const settings = await StorageService.getSettings();
    const safePin = settings.safePin || '1234';
    const duressPin = settings.duressPin || '9999';

    if (enteredPin === safePin) {
      // Safe PIN: safely disarm journey
      await this.stopJourney(true);
      return { success: true, message: 'Journey safely completed. Safety shield active.' };
    } else if (enteredPin === duressPin) {
      // Duress PIN entered under coercion:
      // UI indicates success/disarmed to deceive aggressor, but silently fires SOS in background!
      console.warn('[JourneyTrackerService] 🚨 DURESS PIN ENTERED! Silently raising SOS alert.');
      this.stopJourney(false);
      SOSExecutionEngine.fireSOS('duress_pin');
      return { success: true, message: 'Journey ended.' };
    } else {
      return { success: false, message: 'Incorrect PIN. Try again.' };
    }
  }

  /**
   * Stop current journey tracking
   */
  async stopJourney(clearStorage = true) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.activeJourney = null;
    if (clearStorage) {
      await StorageService.saveJourneyState(null);
    }
    this._notifyListeners();
  }
}

export default new JourneyTrackerService();
