import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Animated,
} from 'react-native';

const CountdownModal = ({ visible, onCancel, onExpire, durationSeconds = 3 }) => {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setSecondsLeft(durationSeconds);

      // Trigger urgency vibration pulse on appearance
      Vibration.vibrate([0, 150, 100, 150]);

      // Interval for countdown
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (onExpire) onExpire();
            return 0;
          }
          // Pulse vibration on each second
          Vibration.vibrate(200);

          // Animate number pulse
          scaleAnim.setValue(1.4);
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }).start();

          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.warningTitle}>⚠️ EMERGENCY SOS TRIGGERED</Text>
          <Text style={styles.subtitle}>
            Emergency alerts will be dispatched in:
          </Text>

          <Animated.View style={[styles.countdownCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.countdownNumber}>{secondsLeft}</Text>
            <Text style={styles.countdownLabel}>SECONDS</Text>
          </Animated.View>

          <Text style={styles.instructions}>
            If this was accidental, tap the button below immediately.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.cancelButton}
            onPress={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              Vibration.vibrate(50);
              onCancel();
            }}
          >
            <Text style={styles.cancelButtonText}>CANCEL (FALSE ALARM)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    backgroundColor: '#260404',
    borderColor: '#ff1744',
    borderWidth: 2,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#ff1744',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  warningTitle: {
    color: '#ff5252',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#ffcdd2',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  countdownCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ff1744',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#ff1744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 12,
  },
  countdownNumber: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 58,
  },
  countdownLabel: {
    color: '#ffebee',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  instructions: {
    color: '#ef9a9a',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  cancelButtonText: {
    color: '#b71c1c',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default CountdownModal;
