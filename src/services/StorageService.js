import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  CONTACTS: '@women_safety_contacts',
  SETTINGS: '@women_safety_settings',
  JOURNEY_STATE: '@women_safety_journey_state',
  EVIDENCE_LOGS: '@women_safety_evidence_logs',
};

const DEFAULT_SETTINGS = {
  voiceTriggerEnabled: true,
  shakeTriggerEnabled: true,
  camouflageByDefault: false,
  safePin: '1234',
  duressPin: '9999',
  countdownDuration: 3, // seconds
  autoRecordAudio: true,
  audioRecordDuration: 45, // seconds
  autoStrobeFlashlight: true,
  autoSirenAlarm: true,
  primaryHelpline: '112',
};

const DEFAULT_CONTACTS = [
  { id: '1', name: 'Emergency Helpline', phone: '112', relationship: 'National Police/Rescue', isPrimary: true },
  { id: '2', name: 'Mom / Guardian', phone: '+919876543210', relationship: 'Family', isPrimary: false },
  { id: '3', name: 'Trusted Friend', phone: '+919812345678', relationship: 'Friend', isPrimary: false },
];

class StorageService {
  /**
   * Retrieve all saved trusted contacts
   * @returns {Promise<Array>}
   */
  async getContacts() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (!data) {
        await this.saveContacts(DEFAULT_CONTACTS);
        return DEFAULT_CONTACTS;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('[StorageService] Error getting contacts:', error);
      return DEFAULT_CONTACTS;
    }
  }

  /**
   * Persist trusted contacts list
   * @param {Array} contacts
   */
  async saveContacts(contacts) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
      return true;
    } catch (error) {
      console.error('[StorageService] Error saving contacts:', error);
      return false;
    }
  }

  /**
   * Retrieve application settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        await this.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
      console.error('[StorageService] Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Persist application settings
   * @param {Object} settings
   */
  async saveSettings(settings) {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('[StorageService] Error saving settings:', error);
      return null;
    }
  }

  /**
   * Store active journey state (ETA, Destination, Start Time)
   */
  async saveJourneyState(journeyData) {
    try {
      if (!journeyData) {
        await AsyncStorage.removeItem(STORAGE_KEYS.JOURNEY_STATE);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.JOURNEY_STATE, JSON.stringify(journeyData));
      }
      return true;
    } catch (error) {
      console.error('[StorageService] Error saving journey state:', error);
      return false;
    }
  }

  /**
   * Retrieve active journey state
   */
  async getJourneyState() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.JOURNEY_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[StorageService] Error getting journey state:', error);
      return null;
    }
  }

  /**
   * Add evidence recording entry to local log
   */
  async logEvidence(entry) {
    try {
      const logsRaw = await AsyncStorage.getItem(STORAGE_KEYS.EVIDENCE_LOGS);
      const logs = logsRaw ? JSON.parse(logsRaw) : [];
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...entry,
      });
      await AsyncStorage.setItem(STORAGE_KEYS.EVIDENCE_LOGS, JSON.stringify(logs.slice(0, 50)));
      return true;
    } catch (error) {
      console.error('[StorageService] Error logging evidence:', error);
      return false;
    }
  }

  /**
   * Retrieve evidence recording entries
   */
  async getEvidenceLogs() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EVIDENCE_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[StorageService] Error getting evidence logs:', error);
      return [];
    }
  }
}

export default new StorageService();
