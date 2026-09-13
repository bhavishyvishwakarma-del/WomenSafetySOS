import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Vibration,
  Animated,
} from 'react-native';
import Sound from 'react-native-sound';

const FakeCallScreen = ({ onEndCall, callerName = 'Dad', callerNumber = '+91 98765 43210' }) => {
  const [callState, setCallState] = useState('incoming'); // 'incoming' | 'active'
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const ringAnim = useRef(new Animated.Value(1)).current;
  const durationTimerRef = useRef(null);
  const ringSoundRef = useRef(null);
  const speechSoundRef = useRef(null);

  useEffect(() => {
    // Start incoming ringtone and vibration loop
    if (callState === 'incoming') {
      Vibration.vibrate([0, 1000, 1000], true);

      // Pulse animation for accept button
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      // Play online ringtone sample
      try {
        const ringtoneUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
        ringSoundRef.current = new Sound(ringtoneUrl, '', (error) => {
          if (!error && ringSoundRef.current) {
            ringSoundRef.current.setNumberOfLoops(-1);
            ringSoundRef.current.play();
          }
        });
      } catch (err) {
        console.warn('Ringtone sound error:', err);
      }
    }

    return () => {
      _cleanupAudio();
    };
  }, [callState]);

  const _cleanupAudio = () => {
    Vibration.cancel();
    if (ringSoundRef.current) {
      ringSoundRef.current.stop();
      ringSoundRef.current.release();
      ringSoundRef.current = null;
    }
    if (speechSoundRef.current) {
      speechSoundRef.current.stop();
      speechSoundRef.current.release();
      speechSoundRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const handleAcceptCall = () => {
    _cleanupAudio();
    setCallState('active');

    // Start in-call duration timer
    durationTimerRef.current = setInterval(() => {
      setCallDurationSeconds(prev => prev + 1);
    }, 1000);

    // Play simulated caller voice conversation audio
    try {
      const voiceAudioUrl = 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3';
      speechSoundRef.current = new Sound(voiceAudioUrl, '', (err) => {
        if (!err && speechSoundRef.current) {
          speechSoundRef.current.setVolume(1.0);
          speechSoundRef.current.play();
        }
      });
    } catch (e) {
      console.warn('Voice simulation error:', e);
    }
  };

  const handleDeclineCall = () => {
    _cleanupAudio();
    if (onEndCall) onEndCall();
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1329" />

      {/* Caller Header Information */}
      <View style={styles.callerInfoContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>{callerName.charAt(0)}</Text>
        </View>
        <Text style={styles.callerNameText}>{callerName}</Text>
        <Text style={styles.callerNumberText}>{callerNumber}</Text>
        <Text style={styles.callStatusText}>
          {callState === 'incoming' ? 'Incoming Call...' : formatDuration(callDurationSeconds)}
        </Text>
      </View>

      {/* INCOMING CALL ACTIONS */}
      {callState === 'incoming' && (
        <View style={styles.incomingControls}>
          {/* Decline Button */}
          <View style={styles.actionCol}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.callBtn, styles.declineBtn]}
              onPress={handleDeclineCall}
            >
              <Text style={styles.btnIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Decline</Text>
          </View>

          {/* Accept Button with Pulse */}
          <View style={styles.actionCol}>
            <Animated.View style={{ transform: [{ scale: ringAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.callBtn, styles.acceptBtn]}
                onPress={handleAcceptCall}
              >
                <Text style={styles.btnIcon}>📞</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.btnLabel}>Accept</Text>
          </View>
        </View>
      )}

      {/* ACTIVE CALL ACTIONS */}
      {callState === 'active' && (
        <View style={styles.activeCallContainer}>
          <View style={styles.inCallGrid}>
            <TouchableOpacity
              style={[styles.inCallFeatureBtn, isMuted && styles.featureActive]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Text style={styles.inCallIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
              <Text style={styles.inCallLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.inCallFeatureBtn}>
              <Text style={styles.inCallIcon}>⌨️</Text>
              <Text style={styles.inCallLabel}>Keypad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inCallFeatureBtn, isSpeakerOn && styles.featureActive]}
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              <Text style={styles.inCallIcon}>🔊</Text>
              <Text style={styles.inCallLabel}>Speaker</Text>
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.callBtn, styles.declineBtn, styles.endCallLarge]}
            onPress={handleDeclineCall}
          >
            <Text style={[styles.btnIcon, { transform: [{ rotate: '135deg' }] }]}>📞</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d1e',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  callerInfoContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#273859',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#486581',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 46,
    fontWeight: 'bold',
  },
  callerNameText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 6,
  },
  callerNumberText: {
    color: '#9fb3c8',
    fontSize: 16,
    marginBottom: 12,
  },
  callStatusText: {
    color: '#627d98',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  actionCol: {
    alignItems: 'center',
  },
  callBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  declineBtn: {
    backgroundColor: '#eb3b5a',
  },
  acceptBtn: {
    backgroundColor: '#20bf6b',
  },
  btnIcon: {
    fontSize: 30,
    color: '#ffffff',
  },
  btnLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  activeCallContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  inCallGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 50,
  },
  inCallFeatureBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#1b2a4a',
    width: 80,
  },
  featureActive: {
    backgroundColor: '#334e68',
  },
  inCallIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  inCallLabel: {
    color: '#d9e2ec',
    fontSize: 13,
    fontWeight: '500',
  },
  endCallLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});

export default FakeCallScreen;
