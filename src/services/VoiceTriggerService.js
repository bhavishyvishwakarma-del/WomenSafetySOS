import { Vibration, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

class VoiceTriggerService {
  constructor() {
    this.isListening = false;
    this.detectionTimestamps = []; // Array of timestamps within sliding window
    this.windowDurationMs = 5000;  // 5-second sliding window
    this.requiredDetections = 3;   // Must say "Help" 3 times
    this.minIntervalBetweenHitsMs = 400; // Debounce to prevent 1 stretched word registering multiple times
    this.lastHitTimestamp = 0;
    this.onSOSTriggerCallback = null;
    this.onDetectionHitCallback = null;
    this.restartTimeout = null;

    // Supported emergency keywords (English + Hindi)
    this.emergencyKeywords = ['help', 'bachao', 'save me', 'emergency', 'police', 'madad'];

    this._bindEvents();
  }

  _bindEvents() {
    Voice.onSpeechResults = this._onSpeechResults.bind(this);
    Voice.onSpeechEnd = this._onSpeechEnd.bind(this);
    Voice.onSpeechError = this._onSpeechError.bind(this);
  }

  /**
   * Set callback to invoke when SOS condition is satisfied (3 hits in 5s)
   */
  setCallbacks({ onTrigger, onHit }) {
    this.onSOSTriggerCallback = onTrigger;
    this.onDetectionHitCallback = onHit;
  }

  /**
   * Start continuous background voice listener
   */
  async startListening() {
    if (this.isListening) return;

    try {
      this.isListening = true;
      this.detectionTimestamps = [];
      await Voice.start('en-IN'); // English (India) / also understands common phrases
      console.log('[VoiceTriggerService] Voice recognition started.');
    } catch (error) {
      console.warn('[VoiceTriggerService] Voice start error:', error);
      this._scheduleRestart(1500);
    }
  }

  /**
   * Stop voice listener
   */
  async stopListening() {
    this.isListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    try {
      await Voice.stop();
      await Voice.destroy();
      console.log('[VoiceTriggerService] Voice recognition stopped.');
    } catch (error) {
      console.warn('[VoiceTriggerService] Voice stop error:', error);
    }
  }

  /**
   * Speech results handler: checks for wake words and manages sliding window
   */
  _onSpeechResults(event) {
    if (!this.isListening || !event || !event.value) return;

    const spokenPhrases = event.value.map(phrase => phrase.toLowerCase());
    const containsKeyword = spokenPhrases.some(phrase =>
      this.emergencyKeywords.some(keyword => phrase.includes(keyword))
    );

    if (containsKeyword) {
      this._handleKeywordDetection();
    }
  }

  /**
   * State Machine logic: Sliding 5-second window with debounce
   */
  _handleKeywordDetection() {
    const now = Date.now();

    // Debounce check: ensure at least 400ms elapsed since the previous detection
    if (now - this.lastHitTimestamp < this.minIntervalBetweenHitsMs) {
      return;
    }

    this.lastHitTimestamp = now;

    // Haptic feedback (Vibrate 200ms) so user discreetly knows the device heard "Help"
    Vibration.vibrate(200);

    // Push into sliding window
    this.detectionTimestamps.push(now);

    // Filter out timestamps outside the sliding 5-second window
    const windowStart = now - this.windowDurationMs;
    this.detectionTimestamps = this.detectionTimestamps.filter(t => t >= windowStart);

    const count = this.detectionTimestamps.length;
    console.log(`[VoiceTriggerService] Emergency keyword detected! Count: ${count}/${this.requiredDetections}`);

    if (this.onDetectionHitCallback) {
      this.onDetectionHitCallback(count, this.requiredDetections);
    }

    // Check if threshold reached
    if (count >= this.requiredDetections) {
      console.log('[VoiceTriggerService] Voice SOS threshold reached! Firing SOS Trigger.');
      // Vibration alert for trigger confirmation (double buzz)
      Vibration.vibrate([0, 300, 100, 300]);

      // Reset sliding window
      this.detectionTimestamps = [];

      if (this.onSOSTriggerCallback) {
        this.onSOSTriggerCallback('voice');
      }
    }
  }

  _onSpeechEnd() {
    // Keep continuous listening active by restarting on speech end
    if (this.isListening) {
      this._scheduleRestart(300);
    }
  }

  _onSpeechError(error) {
    // Gracefully handle recognition timeouts or network drops and keep listening
    if (this.isListening) {
      this._scheduleRestart(1000);
    }
  }

  _scheduleRestart(delayMs) {
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(async () => {
      if (this.isListening) {
        try {
          await Voice.destroy();
          await Voice.start('en-IN');
        } catch (e) {
          // Retry again if failed
          if (this.isListening) this._scheduleRestart(2000);
        }
      }
    }, delayMs);
  }
}

export default new VoiceTriggerService();
