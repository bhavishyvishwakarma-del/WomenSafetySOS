import { Vibration } from 'react-native';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

class ShakeTriggerService {
  constructor() {
    this.subscription = null;
    this.isListening = false;
    this.onSOSTriggerCallback = null;

    // Shake threshold parameters
    this.accelerationThreshold = 25.0; // m/s^2 (excluding gravity)
    this.shakeSlidingWindowMs = 1500;  // 1.5-second window
    this.requiredShakeSpikes = 3;      // 3 rapid directional reversals
    this.spikeTimestamps = [];
    this.lastSpikeTime = 0;
    this.minIntervalBetweenSpikesMs = 150; // Minimum time between consecutive peaks to detect reversal
  }

  /**
   * Register callback to execute on shake trigger
   */
  setCallback(onTrigger) {
    this.onSOSTriggerCallback = onTrigger;
  }

  /**
   * Start listening to accelerometer sensor
   */
  startListening() {
    if (this.isListening) return;

    try {
      // 50ms update interval (20Hz sampling rate is battery efficient yet fast enough for shakes)
      setUpdateIntervalForType(SensorTypes.accelerometer, 50);

      this.subscription = accelerometer.subscribe({
        next: ({ x, y, z }) => this._processAccelerometerData(x, y, z),
        error: (error) => {
          console.warn('[ShakeTriggerService] Accelerometer subscription error:', error);
        },
      });

      this.isListening = true;
      this.spikeTimestamps = [];
      console.log('[ShakeTriggerService] Accelerometer shake detection active.');
    } catch (error) {
      console.warn('[ShakeTriggerService] Could not start accelerometer:', error);
    }
  }

  /**
   * Stop listening to accelerometer
   */
  stopListening() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.isListening = false;
    this.spikeTimestamps = [];
    console.log('[ShakeTriggerService] Shake detection stopped.');
  }

  /**
   * Analyze acceleration vector and track rapid reversals
   */
  _processAccelerometerData(x, y, z) {
    const now = Date.now();

    // Calculate dynamic acceleration vector magnitude minus standard gravity (9.81 m/s^2)
    const totalG = Math.sqrt(x * x + y * y + z * z);
    const netAcceleration = Math.abs(totalG - 9.81);

    if (netAcceleration >= this.accelerationThreshold) {
      // Enforce debounce between consecutive peaks
      if (now - this.lastSpikeTime >= this.minIntervalBetweenSpikesMs) {
        this.lastSpikeTime = now;
        this.spikeTimestamps.push(now);

        // Slide window: keep only peaks within the last 1500ms
        const windowStart = now - this.shakeSlidingWindowMs;
        this.spikeTimestamps = this.spikeTimestamps.filter(t => t >= windowStart);

        // Check if required number of spikes reached
        if (this.spikeTimestamps.length >= this.requiredShakeSpikes) {
          console.log('[ShakeTriggerService] Valid Rapid Shake detected! Firing SOS Trigger.');
          
          // Clear history to prevent duplicate triggers
          this.spikeTimestamps = [];

          // Urgent haptic feedback
          Vibration.vibrate([0, 200, 100, 200]);

          if (this.onSOSTriggerCallback) {
            this.onSOSTriggerCallback('shake');
          }
        }
      }
    }
  }
}

export default new ShakeTriggerService();
