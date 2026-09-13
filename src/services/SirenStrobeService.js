import { Platform } from 'react-native';
import Sound from 'react-native-sound';
import Torch from 'react-native-torch';

// Enable playback in silence mode
Sound.setCategory('Playback', true);

class SirenStrobeService {
  constructor() {
    this.sirenSound = null;
    this.isSirenPlaying = false;
    this.isStrobeActive = false;
    this.strobeInterval = null;
    this.torchState = false;
  }

  /**
   * Activate high-decibel looped alarm siren
   */
  startSiren() {
    if (this.isSirenPlaying) return;

    try {
      // Use bundled siren sound from res/raw or load network fallback alarm tone
      this.sirenSound = new Sound('alarm_siren.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.warn('[SirenStrobeService] Failed to load local siren sound:', error);
          // Fallback to online hosted emergency siren if raw asset is not yet bundled
          this._playOnlineFallbackSiren();
          return;
        }
        this.sirenSound.setVolume(1.0); // Maximum volume
        this.sirenSound.setNumberOfLoops(-1); // Infinite loop
        this.sirenSound.play();
        this.isSirenPlaying = true;
        console.log('[SirenStrobeService] Loud siren playing.');
      });
    } catch (e) {
      console.warn('[SirenStrobeService] Siren playback failed:', e);
    }
  }

  _playOnlineFallbackSiren() {
    try {
      const fallbackUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
      this.sirenSound = new Sound(fallbackUrl, '', (err) => {
        if (err) {
          console.warn('[SirenStrobeService] Online siren failed:', err);
          return;
        }
        this.sirenSound.setVolume(1.0);
        this.sirenSound.setNumberOfLoops(-1);
        this.sirenSound.play();
        this.isSirenPlaying = true;
      });
    } catch (err) {
      console.warn('[SirenStrobeService] Error setting up fallback siren:', err);
    }
  }

  /**
   * Stop alarm siren
   */
  stopSiren() {
    if (this.sirenSound && this.isSirenPlaying) {
      this.sirenSound.stop(() => {
        this.sirenSound.release();
        this.sirenSound = null;
        this.isSirenPlaying = false;
        console.log('[SirenStrobeService] Siren stopped.');
      });
    }
  }

  /**
   * Start camera LED flashlight strobe (flashing every 200ms)
   */
  startStrobe() {
    if (this.isStrobeActive) return;

    this.isStrobeActive = true;
    this.torchState = false;

    // Toggle torch state at 200ms intervals to create a disorienting / attracting strobe
    this.strobeInterval = setInterval(() => {
      try {
        this.torchState = !this.torchState;
        Torch.switchState(this.torchState);
      } catch (error) {
        console.warn('[SirenStrobeService] Torch strobe error:', error);
      }
    }, 200);

    console.log('[SirenStrobeService] Strobe flashlight started.');
  }

  /**
   * Stop camera LED flashlight strobe
   */
  stopStrobe() {
    if (this.strobeInterval) {
      clearInterval(this.strobeInterval);
      this.strobeInterval = null;
    }
    this.isStrobeActive = false;
    this.torchState = false;

    try {
      Torch.switchState(false);
      console.log('[SirenStrobeService] Strobe flashlight turned off.');
    } catch (error) {
      console.warn('[SirenStrobeService] Error turning off torch:', error);
    }
  }

  /**
   * Stop both siren and strobe
   */
  stopAll() {
    this.stopSiren();
    this.stopStrobe();
  }
}

export default new SirenStrobeService();
