import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import JourneyTrackerService from '../services/JourneyTrackerService';

const JourneyTrackerScreen = ({ onBack }) => {
  const [destination, setDestination] = useState('');
  const [etaMinutes, setEtaMinutes] = useState('20');
  const [journeyStatus, setJourneyStatus] = useState(JourneyTrackerService.getStatus());
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    const unsubscribe = JourneyTrackerService.subscribe((status) => {
      setJourneyStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleStartJourney = async () => {
    if (!destination.trim()) {
      Alert.alert('Required', 'Please enter your travel destination.');
      return;
    }
    const mins = parseInt(etaMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid ETA', 'Please enter a valid ETA in minutes (e.g., 20).');
      return;
    }
    await JourneyTrackerService.startJourney(destination.trim(), mins);
  };

  const handleSafeArrivalPress = () => {
    setPinInput('');
    setShowPinModal(true);
  };

  const handleVerifyPin = async () => {
    if (pinInput.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN.');
      return;
    }
    const result = await JourneyTrackerService.verifyPin(pinInput);
    if (result.success) {
      setShowPinModal(false);
      Alert.alert('Safe Arrival Confirmed', result.message);
    } else {
      Alert.alert('Verification Failed', result.message);
      setPinInput('');
    }
  };

  const formatRemainingTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk With Me</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {journeyStatus.isActive ? (
          /* ACTIVE JOURNEY CARD */
          <View style={styles.activeCard}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>SAFETY WATCH ACTIVE</Text>
            </View>

            <Text style={styles.destLabel}>Heading to:</Text>
            <Text style={styles.destValue}>{journeyStatus.destination}</Text>

            {/* Countdown Display */}
            <View style={styles.timerBox}>
              <Text style={styles.timeRemainingText}>
                {formatRemainingTime(journeyStatus.remainingSeconds)}
              </Text>
              <Text style={styles.timeSubtext}>Remaining until automated SOS trigger</Text>
            </View>

            <Text style={styles.infoNote}>
              If you don't enter your Safe PIN before time expires, the app automatically broadcasts your GPS location to emergency contacts and helpline 112.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.safeArrivalBtn}
              onPress={handleSafeArrivalPress}
            >
              <Text style={styles.safeArrivalBtnText}>✓ I Have Arrived (Enter Safe PIN)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* SETUP JOURNEY FORM */
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>Start Protected Journey</Text>
            <Text style={styles.setupDesc}>
              Heading home late or traveling alone? Enter your destination and estimated travel time. If you do not disarm the timer with your Safe PIN upon arrival, SOS triggers automatically.
            </Text>

            <Text style={styles.inputLabel}>Where are you going?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Home, Metro Station, Hostels"
              placeholderTextColor="#718096"
              value={destination}
              onChangeText={setDestination}
            />

            <Text style={styles.inputLabel}>Estimated Travel Time (Minutes):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 25"
              placeholderTextColor="#718096"
              keyboardType="number-pad"
              value={etaMinutes}
              onChangeText={setEtaMinutes}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.startBtn}
              onPress={handleStartJourney}
            >
              <Text style={styles.startBtnText}>Start Journey Watch</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* SAFE PIN ENTRY MODAL */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Safety PIN</Text>
            <Text style={styles.modalSubtitle}>
              Enter your 4-digit Safe PIN to verify safe arrival and disarm the watch.
            </Text>

            <TextInput
              style={styles.pinInput}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#a0aec0"
              value={pinInput}
              onChangeText={setPinInput}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleVerifyPin}
              >
                <Text style={styles.modalConfirmText}>Disarm</Text>
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
    backgroundColor: '#0a0f1d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2238',
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    color: '#63b3ed',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  setupCard: {
    backgroundColor: '#121a2f',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#233054',
  },
  setupTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  setupDesc: {
    color: '#a0aec0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputLabel: {
    color: '#cbd5e0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a243d',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  startBtn: {
    backgroundColor: '#3182ce',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  activeCard: {
    backgroundColor: '#16192b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#4299e1',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 153, 225, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#48bb78',
    marginRight: 8,
  },
  statusBadgeText: {
    color: '#63b3ed',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  destLabel: {
    color: '#a0aec0',
    fontSize: 13,
  },
  destValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  timerBox: {
    width: '100%',
    backgroundColor: '#0d111d',
    paddingVertical: 24,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2b3956',
  },
  timeRemainingText: {
    color: '#f6ad55',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timeSubtext: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 4,
  },
  infoNote: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  safeArrivalBtn: {
    backgroundColor: '#38a169',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  safeArrivalBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1a202c',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#a0aec0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  pinInput: {
    backgroundColor: '#2d3748',
    color: '#ffffff',
    fontSize: 32,
    letterSpacing: 14,
    textAlign: 'center',
    width: '70%',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#4a5568',
    borderRadius: 12,
  },
  modalCancelText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#38a169',
    borderRadius: 12,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default JourneyTrackerScreen;
