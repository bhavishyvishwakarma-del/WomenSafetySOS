import { Platform } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import StorageService from './StorageService';

const audioRecorderPlayer = new AudioRecorderPlayer();

class AudioRecorderService {
  constructor() {
    this.isRecording = false;
    this.currentRecordPath = null;
    this.recordingTimeout = null;
  }

  /**
   * Start discreet ambient audio recording for evidence gathering
   * @param {number} durationSeconds Duration in seconds (default: 45s)
   * @returns {Promise<string>} File path of recorded audio
   */
  async startSilentRecording(durationSeconds = 45) {
    if (this.isRecording) {
      console.log('[AudioRecorderService] Recording already active.');
      return this.currentRecordPath;
    }

    try {
      this.isRecording = true;
      const timestamp = Date.now();
      const fileName = `evidence_${timestamp}.${Platform.OS === 'android' ? 'mp4' : 'm4a'}`;

      // Start recording
      const resultUri = await audioRecorderPlayer.startRecorder(undefined, {
        AudioEncoderAndroid: 3, // AAC
        AudioSourceAndroid: 1,  // MIC
        AVEncoderAudioQualityKeyIOS: 2,
        AVNumberOfChannelsKeyIOS: 1,
        AVFormatIDKeyIOS: 'aac ',
      });

      this.currentRecordPath = resultUri;
      console.log(`[AudioRecorderService] Silent evidence recording started: ${resultUri}`);

      // Automatically stop after durationSeconds
      this.recordingTimeout = setTimeout(async () => {
        await this.stopRecording();
      }, durationSeconds * 1000);

      return resultUri;
    } catch (error) {
      console.warn('[AudioRecorderService] Start recording failed:', error);
      this.isRecording = false;
      return null;
    }
  }

  /**
   * Stop current audio recording and persist to evidence log
   */
  async stopRecording() {
    if (!this.isRecording) return null;

    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;
      console.log(`[AudioRecorderService] Evidence recorded successfully: ${result}`);

      // Log evidence in StorageService for retrieval/upload
      await StorageService.logEvidence({
        filePath: result,
        recordedAt: new Date().toISOString(),
        durationSeconds: 45,
        uploaded: false,
      });

      return result;
    } catch (error) {
      console.warn('[AudioRecorderService] Stop recording error:', error);
      this.isRecording = false;
      return null;
    }
  }
}

export default new AudioRecorderService();
