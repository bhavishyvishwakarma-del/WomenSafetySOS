import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  Vibration,
  Animated,
  StatusBar,
} from 'react-native';

import CountdownModal from '../components/CountdownModal';
import SOSExecutionEngine from '../services/SOSExecutionEngine';
import VoiceTriggerService from '../services/VoiceTriggerService';
import ShakeTriggerService from '../services/ShakeTriggerService';
import StorageService from '../services/StorageService';
import PermissionsManager from '../utils/permissions';

const HomeScreen = ({
  onOpenCalculator,
  onOpenFakeCall,
  onOpenJourneyTracker,
}) => {
  // State
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({});
  const [isCountdownVisible, setIsCountdownVisible] = useState(false);
  const [countdownTriggerSource, setCountdownTriggerSource] = useState('button');
  const [sosStatus, setSosStatus] = useState({ status: 'IDLE' });
  const [voiceHits, setVoiceHits] = useState(0);

  // Contact Modal State
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('');

  // Pulsing animation for the Panic Button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    _initApp();
    _startPulseAnimation();

    // Subscribe to SOS Engine changes
    const unsubSOS = SOSExecutionEngine.subscribe((status) => {
      setSosStatus(status);
    });

    return () => {
      unsubSOS();
      VoiceTriggerService.stopListening();
      ShakeTriggerService.stopListening();
    };
  }, []);

  const _startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const _initApp = async () => {
    // 1. Request Android Permissions
    await PermissionsManager.requestAllPermissions();

    // 2. Load Settings & Contacts
    const loadedSettings = await StorageService.getSettings();
    const loadedContacts = await StorageService.getContacts();
    setSettings(loadedSettings);
    setContacts(loadedContacts);

    // 3. Initialize Multi-Modal Triggers based on preferences
    _configureTriggers(loadedSettings);
  };

  const _configureTriggers = (currentSettings) => {
    // Configure Voice Trigger
    if (currentSettings.voiceTriggerEnabled) {
      VoiceTriggerService.setCallbacks({
        onHit: (hits, required) => {
          setVoiceHits(hits);
        },
        onTrigger: (source) => {
          _initiateGracePeriod(source || 'voice');
        },
      });
      VoiceTriggerService.startListening();
    } else {
      VoiceTriggerService.stopListening();
    }

    // Configure Shake Trigger
    if (currentSettings.shakeTriggerEnabled) {
      ShakeTriggerService.setCallback((source) => {
        _initiateGracePeriod(source || 'shake');
      });
      ShakeTriggerService.startListening();
    } else {
      ShakeTriggerService.stopListening();
    }
  };

  /**
   * Triggers the 3-second grace countdown screen
   */
  const _initiateGracePeriod = (source = 'button') => {
    setCountdownTriggerSource(source);
    setIsCountdownVisible(true);
  };

  /**
   * Cancel button pressed during grace period
   */
  const handleCancelCountdown = () => {
    setIsCountdownVisible(false);
    Vibration.vibrate(100);
    console.log('[HomeScreen] SOS countdown cancelled by user.');
  };

  /**
   * Grace period countdown expired: Fire real SOS
   */
  const handleCountdownExpired = async () => {
    setIsCountdownVisible(false);
    await SOSExecutionEngine.fireSOS(countdownTriggerSource);
  };

  /**
   * Toggle Trigger Settings
   */
  const handleToggleVoice = async (val) => {
    const updated = await StorageService.saveSettings({ voiceTriggerEnabled: val });
    setSettings(updated);
    _configureTriggers(updated);
  };

  const handleToggleShake = async (val) => {
    const updated = await StorageService.saveSettings({ shakeTriggerEnabled: val });
    setSettings(updated);
    _configureTriggers(updated);
  };

  /**
   * Add new Trusted Contact
   */
  const handleSaveContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Missing Info', 'Please provide a name and mobile number.');
      return;
    }
    const newEntry = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRel.trim() || 'Emergency Contact',
      isPrimary: contacts.length === 0,
    };
    const updated = [...contacts, newEntry];
    setContacts(updated);
    await StorageService.saveContacts(updated);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRel('');
    setContactModalVisible(false);
  };

  /**
   * Delete Contact
   */
  const handleDeleteContact = (id) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this trusted contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = contacts.filter((c) => c.id !== id);
          setContacts(updated);
          await StorageService.saveContacts(updated);
        },
      },
    ]);
  };

  const isSOSActive = sosStatus.status && sosStatus.status !== 'IDLE';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070b15" />

      {/* HEADER BAR */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>SHAKTI SOS</Text>
          <View style={styles.shieldBadge}>
            <View style={styles.shieldDot} />
            <Text style={styles.shieldText}>SAFETY SHIELD ACTIVE</Text>
          </View>
        </View>

        {/* Camouflage Disguise Button */}
        <TouchableOpacity
          style={styles.camouBadge}
          onPress={onOpenCalculator}
          activeOpacity={0.7}
        >
          <Text style={styles.camouIcon}>🔢</Text>
          <Text style={styles.camouText}>Disguise</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ACTIVE SOS BANNER (IF FIRED) */}
        {isSOSActive && (
          <View style={styles.activeSosBanner}>
            <Text style={styles.activeSosTitle}>🚨 SOS BROADCAST ACTIVE</Text>
            <Text style={styles.activeSosSubtitle}>{sosStatus.message}</Text>
            <TouchableOpacity
              style={styles.stopSosButton}
              onPress={() => SOSExecutionEngine.stopSOS()}
            >
              <Text style={styles.stopSosButtonText}>STOP SOS ALARM</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAIN QUICK SOS PANIC BUTTON */}
        <View style={styles.panicContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.panicButton}
              onPress={() => _initiateGracePeriod('button')}
            >
              <View style={styles.panicInnerRing}>
                <Text style={styles.panicSosText}>SOS</Text>
                <Text style={styles.panicSubtext}>ONE-TAP EMERGENCY</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.graceHintText}>
            Triggers 3-second grace countdown before firing SMS, GPS & Siren
          </Text>
        </View>

        {/* PREVENTIVE TOOLS ROW */}
        <Text style={styles.sectionTitle}>Preventive Safety Tools</Text>
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={onOpenJourneyTracker}
            activeOpacity={0.7}
          >
            <Text style={styles.toolIcon}>🚶‍♀️</Text>
            <Text style={styles.toolTitle}>Walk With Me</Text>
            <Text style={styles.toolDesc}>ETA & Safe PIN check</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={onOpenFakeCall}
            activeOpacity={0.7}
          >
            <Text style={styles.toolIcon}>📞</Text>
            <Text style={styles.toolTitle}>Fake Call</Text>
            <Text style={styles.toolDesc}>Escape uncomfortable spots</Text>
          </TouchableOpacity>
        </View>

        {/* EMERGENCY TRIGGER TOGGLES */}
        <Text style={styles.sectionTitle}>Emergency Trigger Channels</Text>
        <View style={styles.togglesCard}>
          {/* Voice Trigger */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Voice Trigger ("Help" × 3)</Text>
              <Text style={styles.toggleDesc}>
                Say "Help" or "Bachao" 3 times in 5 seconds
              </Text>
              {settings.voiceTriggerEnabled && voiceHits > 0 && (
                <Text style={styles.voiceHitBadge}>Listening... Hits: {voiceHits}/3</Text>
              )}
            </View>
            <Switch
              trackColor={{ false: '#2d3748', true: '#e53e3e' }}
              thumbColor={settings.voiceTriggerEnabled ? '#ffffff' : '#a0aec0'}
              value={!!settings.voiceTriggerEnabled}
              onValueChange={handleToggleVoice}
            />
          </View>

          <View style={styles.divider} />

          {/* Shake Trigger */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Rapid Shake to SOS</Text>
              <Text style={styles.toggleDesc}>
                Vigorously shake phone to trigger emergency
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#2d3748', true: '#e53e3e' }}
              thumbColor={settings.shakeTriggerEnabled ? '#ffffff' : '#a0aec0'}
              value={!!settings.shakeTriggerEnabled}
              onValueChange={handleToggleShake}
            />
          </View>
        </View>

        {/* TRUSTED CONTACTS SECTION */}
        <View style={styles.contactsHeader}>
          <Text style={styles.sectionTitle}>Trusted Emergency Contacts</Text>
          <TouchableOpacity
            style={styles.addContactBtn}
            onPress={() => setContactModalVisible(true)}
          >
            <Text style={styles.addContactBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsCard}>
          {contacts.length === 0 ? (
            <Text style={styles.emptyContactsText}>
              No trusted contacts added yet. Add 3-5 contacts for emergency SMS delivery.
            </Text>
          ) : (
            contacts.map((contact, index) => (
              <View key={contact.id || index}>
                <View style={styles.contactItem}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarLetter}>
                      {contact.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>
                      {contact.name} {contact.isPrimary ? '⭐️ (Primary)' : ''}
                    </Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                    <Text style={styles.contactRel}>{contact.relationship}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteContact(contact.id)}
                    style={styles.deleteContactBtn}
                  >
                    <Text style={styles.deleteContactText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {index < contacts.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        {/* BATTERY OPTIMIZATION REMINDER */}
        <TouchableOpacity
          style={styles.batteryNotice}
          onPress={() => PermissionsManager.checkAndPromptBatteryOptimization()}
        >
          <Text style={styles.batteryNoticeIcon}>⚡️</Text>
          <Text style={styles.batteryNoticeText}>
            Ensure "Ignore Battery Optimizations" is enabled so triggers operate when phone is locked.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 3-SECOND FALSE ALARM GRACE COUNTDOWN MODAL */}
      <CountdownModal
        visible={isCountdownVisible}
        durationSeconds={settings.countdownDuration || 3}
        onCancel={handleCancelCountdown}
        onExpire={handleCountdownExpired}
      />

      {/* ADD CONTACT MODAL */}
      <Modal visible={contactModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Add Trusted Contact</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Sister, Mom, Best Friend"
              placeholderTextColor="#718096"
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <Text style={styles.inputLabel}>Mobile Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. +919876543210"
              placeholderTextColor="#718096"
              keyboardType="phone-pad"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
            />

            <Text style={styles.inputLabel}>Relationship</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Family / Friend / Colleague"
              placeholderTextColor="#718096"
              value={newContactRel}
              onChangeText={setNewContactRel}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setContactModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveContact}
              >
                <Text style={styles.saveModalText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b15',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161e31',
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  shieldDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38a169',
    marginRight: 6,
  },
  shieldText: {
    color: '#68d391',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  camouBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2438',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  camouIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  camouText: {
    color: '#cbd5e0',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  activeSosBanner: {
    backgroundColor: '#b91c1c',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'center',
  },
  activeSosTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeSosSubtitle: {
    color: '#fecaca',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  stopSosButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  stopSosButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },
  panicContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  panicButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e53e3e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff2d55',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  panicInnerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#9b1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#feb2b2',
  },
  panicSosText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
  },
  panicSubtext: {
    color: '#fed7d7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  graceHintText: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toolCard: {
    flex: 0.48,
    backgroundColor: '#121a2f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233054',
  },
  toolIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  toolTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  toolDesc: {
    color: '#718096',
    fontSize: 12,
  },
  togglesCard: {
    backgroundColor: '#121a2f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233054',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleDesc: {
    color: '#718096',
    fontSize: 12,
    marginTop: 2,
  },
  voiceHitBadge: {
    color: '#f6ad55',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1a243d',
    marginVertical: 12,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  addContactBtn: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addContactBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  contactsCard: {
    backgroundColor: '#121a2f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233054',
    marginBottom: 16,
  },
  emptyContactsText: {
    color: '#718096',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2c3e66',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  contactPhone: {
    color: '#90cdf4',
    fontSize: 13,
    marginTop: 1,
  },
  contactRel: {
    color: '#718096',
    fontSize: 11,
    marginTop: 1,
  },
  deleteContactBtn: {
    padding: 8,
  },
  deleteContactText: {
    color: '#e53e3e',
    fontSize: 16,
    fontWeight: '700',
  },
  batteryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a202c',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  batteryNoticeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  batteryNoticeText: {
    flex: 1,
    color: '#a0aec0',
    fontSize: 12,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#161f38',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2d3e69',
  },
  modalHeading: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#cbd5e0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#0e1526',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#233054',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#2d3748',
  },
  cancelModalText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  saveModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#3182ce',
  },
  saveModalText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default HomeScreen;
