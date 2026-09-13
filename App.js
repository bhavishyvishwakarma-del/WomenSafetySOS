import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import CalculatorCamouflageScreen from './src/screens/CalculatorCamouflageScreen';
import FakeCallScreen from './src/screens/FakeCallScreen';
import JourneyTrackerScreen from './src/screens/JourneyTrackerScreen';
import StorageService from './src/services/StorageService';

const App = () => {
  // 'home' | 'calculator' | 'fake_call' | 'journey_tracker'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initMode = async () => {
      const settings = await StorageService.getSettings();
      if (settings.camouflageByDefault) {
        setCurrentScreen('calculator');
      }
      setIsInitialized(true);
    };
    initMode();
  }, []);

  if (!isInitialized) {
    return <View style={styles.splash} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070b15" />

      {currentScreen === 'calculator' && (
        <CalculatorCamouflageScreen
          onUnlockSecret={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen === 'fake_call' && (
        <FakeCallScreen
          callerName="Dad"
          callerNumber="+91 98765 43210"
          onEndCall={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen === 'journey_tracker' && (
        <JourneyTrackerScreen
          onBack={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen === 'home' && (
        <HomeScreen
          onOpenCalculator={() => setCurrentScreen('calculator')}
          onOpenFakeCall={() => setCurrentScreen('fake_call')}
          onOpenJourneyTracker={() => setCurrentScreen('journey_tracker')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b15',
  },
  splash: {
    flex: 1,
    backgroundColor: '#070b15',
  },
});

export default App;
