import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

class PermissionsManager {
  /**
   * Request all critical permissions for mission-critical SOS functionality
   * @returns {Promise<Object>} Map of granted status per permission
   */
  async requestAllPermissions() {
    if (Platform.OS !== 'android') {
      return { success: true };
    }

    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      ];

      // Android 13+ (API 33+) requires explicit notification permission
      if (Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const grantedResults = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      // Check if location granted, then request background location on Android 10+ (API 29+)
      const fineLocationGranted =
        grantedResults[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

      let backgroundLocationGranted = true;
      if (fineLocationGranted && Platform.Version >= 29) {
        const bgResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Access Required',
            message:
              'Women Safety SOS needs background location access to share your live coordinates during emergencies even when your screen is locked.',
            buttonPositive: 'Allow Always',
            buttonNegative: 'Deny',
          }
        );
        backgroundLocationGranted = bgResult === PermissionsAndroid.RESULTS.GRANTED;
      }

      const isAllGranted =
        grantedResults[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED &&
        fineLocationGranted &&
        grantedResults[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;

      return {
        success: isAllGranted,
        audio: grantedResults[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED,
        location: fineLocationGranted,
        backgroundLocation: backgroundLocationGranted,
        sms: grantedResults[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED,
        call: grantedResults[PermissionsAndroid.PERMISSIONS.CALL_PHONE] === PermissionsAndroid.RESULTS.GRANTED,
      };
    } catch (error) {
      console.error('[PermissionsManager] Error requesting permissions:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if battery optimizations are active and prompt user to disable
   * Android OS aggressively kills background sensors/services unless exempted.
   */
  async checkAndPromptBatteryOptimization() {
    if (Platform.OS !== 'android') return;

    try {
      Alert.alert(
        'Critical Safety Notice: Battery Saver',
        'To ensure voice detection and emergency triggers operate uninterrupted when your phone is locked, please allow Women Safety SOS to "Ignore Battery Optimizations".',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open Battery Settings',
            onPress: () => {
              // Open Android battery optimization settings intent
              Linking.openSettings();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[PermissionsManager] Battery optimization prompt error:', error);
    }
  }
}

export default new PermissionsManager();
