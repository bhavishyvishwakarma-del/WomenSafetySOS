import { Linking, NativeModules, Platform, Alert } from 'react-native';

const { SafetyModule } = NativeModules;

class SMSHelper {
  /**
   * Dispatches direct emergency SMS to trusted contacts with cellular & WhatsApp fallback
   * @param {Array<string>} phoneNumbers List of recipient phone numbers
   * @param {string} message SOS emergency message with location link & battery status
   * @returns {Promise<{ success: boolean, method: string, details: string }>}
   */
  async sendEmergencySMS(phoneNumbers, message) {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.warn('[SMSHelper] No phone numbers provided for SMS alert.');
      return { success: false, method: 'none', details: 'No contacts configured' };
    }

    // Attempt direct native Android SMS sending without opening user app if NativeModule is available
    if (Platform.OS === 'android' && SafetyModule && typeof SafetyModule.sendDirectSMS === 'function') {
      try {
        const results = await Promise.allSettled(
          phoneNumbers.map(phone => SafetyModule.sendDirectSMS(phone, message))
        );
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[SMSHelper] Native direct SMS sent: ${successful}/${phoneNumbers.length}`);
        return { success: true, method: 'native_direct_sms', details: `Sent to ${successful} contacts` };
      } catch (nativeError) {
        console.warn('[SMSHelper] Native direct SMS failed, falling back to SMS Intent:', nativeError);
      }
    }

    // Fallback 1: System SMS Intent URI (sms:number?body=...)
    try {
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const recipients = phoneNumbers.join(';');
      const encodedMsg = encodeURIComponent(message);
      const url = `sms:${recipients}${separator}body=${encodedMsg}`;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return { success: true, method: 'sms_intent', details: 'Opened SMS intent' };
      }
    } catch (intentError) {
      console.warn('[SMSHelper] SMS intent failed:', intentError);
    }

    // Fallback 2: WhatsApp Emergency Broadcast Intent
    try {
      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = `whatsapp://send?text=${encodedMsg}`;
      const canOpenWhatsapp = await Linking.canOpenURL(whatsappUrl);
      if (canOpenWhatsapp) {
        await Linking.openURL(whatsappUrl);
        return { success: true, method: 'whatsapp_fallback', details: 'Dispatched via WhatsApp' };
      }
    } catch (waError) {
      console.warn('[SMSHelper] WhatsApp fallback failed:', waError);
    }

    return { success: false, method: 'failed', details: 'All SMS dispatch channels failed' };
  }
}

export default new SMSHelper();
