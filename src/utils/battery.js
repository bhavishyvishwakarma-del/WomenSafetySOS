import DeviceInfo from 'react-native-device-info';

class BatteryTelemetry {
  /**
   * Fetch current device battery level and charging status
   * @returns {Promise<{ percentage: number, isCharging: boolean, formatted: string }>}
   */
  async getBatteryStatus() {
    try {
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      const isCharging = await DeviceInfo.isBatteryCharging();
      const percentage = Math.round((batteryLevel >= 0 ? batteryLevel : 1) * 100);

      return {
        percentage,
        isCharging,
        formatted: `${percentage}%${isCharging ? ' (Charging)' : ''}`,
      };
    } catch (error) {
      console.warn('[BatteryTelemetry] Could not retrieve battery level:', error);
      return {
        percentage: 100,
        isCharging: false,
        formatted: 'Unknown',
      };
    }
  }
}

export default new BatteryTelemetry();
