# Women Safety SOS (Shakti SOS) 🚨🛡️

A production-grade, mission-critical Women Safety SOS mobile application developed with **React Native (CLI)** and native **Android Systems** architecture.

---

## 📱 Features Overview

### 1. Multi-Modal Emergency Triggers
- **Voice Command Trigger ("Help" × 3)**:
  - Continuous background speech recognition with state machine sliding window.
  - Detecting "Help" / "Bachao" 3 times within a 5-second window automatically initiates SOS.
  - Haptic feedback (vibration) on each speech detection so the user knows the app is listening.
- **Rapid Shake-to-Trigger**:
  - Accelerometer vector monitoring: $\sqrt{x^2 + y^2 + z^2} - 9.8\text{ m/s}^2$.
  - Multi-spike rapid direction reversal threshold (> 25 m/s²) to prevent accidental triggers while walking/jogging.
- **One-Tap Quick SOS**:
  - High-urgency pulsating panic button on the home screen.
- **False Alarm Grace Period (3 Seconds)**:
  - High-visibility modal with pulsating countdown, loud beeps, and a prominent "CANCEL (FALSE ALARM)" button.

### 2. SOS Execution Engine
Once triggered and the grace period elapses:
- **High-Accuracy GPS**: Obtains live GPS coordinates via `react-native-geolocation-service` and creates a Google Maps pin link (`https://maps.google.com/?q=lat,lng`).
- **Device Battery Telemetry**: Reads battery percentage and appends it to emergency dispatch.
- **Direct Multi-Recipient SMS**: Dispatches direct cellular SMS to 3-5 pre-configured trusted contacts using Android `SmsManager`, with WhatsApp fallback.
- **Auto-Dial Helpline**: Automatically dials national emergency helpline (`112`) or primary guardian.
- **Loud Siren & Flashing Strobe**: Maximum volume audio loop + blinking camera flashlight (200ms intervals) to disorient aggressors and alert the public.
- **Silent Evidence Recording**: Discreetly records 30-60 seconds of ambient audio in `.mp4`/`.aac` format and archives it locally in the evidence vault.

### 3. Preventive & Daily Travel Safety
- **"Walk With Me" Journey Tracker**:
  - Set destination and estimated travel time (ETA in minutes).
  - Background watchdog countdown.
  - If the safe 4-digit PIN is not entered before arrival ETA expires, SOS raises automatically with last known GPS coordinates.
  - Includes **Duress PIN**: entering the duress PIN appears to disarm the screen, but silently alerts contacts in the background.
- **Realistic Fake Call Simulator**:
  - Photorealistic incoming call interface (customizable caller name e.g. "Dad", phone number, avatar, looped ringtone, and vibration).
  - Answering the call plays a natural conversational audio recording ("Hey, where are you? I'm waiting outside in the car...") with an active call timer to safely exit uncomfortable situations.

### 4. Stealth & Privacy (Camouflage Mode)
- **Calculator Disguise**:
  - Looks, feels, and calculates like a standard arithmetic calculator.
  - Typing the secret PIN (`9999=`) unlocks the real Safety Dashboard.
  - Option to set calculator disguise as default launch screen.

### 5. Android System-Level Reliability
- **Sticky Foreground Service (`SafetyForegroundService.java`)**:
  - Sticky ongoing notification ("Safety Shield Active") with Android 14+ foreground service types (`location`, `microphone`).
- **Battery Optimization Whitelist**:
  - Integrated prompt for `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- **Complete Android Permissions**:
  - Full configuration in `AndroidManifest.xml` with runtime permission verification.

---

## 📦 Project Structure

```
WomenSafetySOS/
├── .github/workflows/
│   └── build-apk.yml               # Automated 1-click cloud APK builder
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml # All permissions & foreground services
│   │   │   └── java/com/womensafety/
│   │   │       ├── MainActivity.java
│   │   │       ├── MainApplication.java
│   │   │       ├── SafetyForegroundService.java
│   │   │       ├── SafetyModule.java
│   │   │       └── SafetyPackage.java
│   │   └── build.gradle
│   ├── build.gradle
│   └── settings.gradle
├── src/
│   ├── components/
│   │   └── CountdownModal.js       # 3s false-alarm grace countdown
│   ├── screens/
│   │   ├── HomeScreen.js           # Safety Dashboard & Emergency Panic Button
│   │   ├── CalculatorCamouflageScreen.js # Functional calculator with stealth unlock
│   │   ├── FakeCallScreen.js       # Realistic incoming & active call simulation
│   │   └── JourneyTrackerScreen.js # Walk With Me ETA countdown & safe PIN
│   ├── services/
│   │   ├── VoiceTriggerService.js  # Speech wake-word 3x in 5s sliding window
│   │   ├── ShakeTriggerService.js  # Accelerometer shake detection
│   │   ├── SOSExecutionEngine.js   # Orchestrator (Location + SMS + Call + Siren + Audio)
│   │   ├── JourneyTrackerService.js# Background ETA timer & Safe PIN watchdog
│   │   ├── AudioRecorderService.js # Background ambient audio recording
│   │   ├── SirenStrobeService.js   # Siren alarm loop & camera LED strobe
│   │   └── StorageService.js       # Contacts, settings & evidence storage
│   └── utils/
│       ├── permissions.js          # Android runtime permission requests
│       ├── battery.js              # Battery level reader
│       └── smsHelper.js            # Cellular SMS & WhatsApp fallback
├── App.js                          # Root navigator & stealth mode gate
├── package.json
└── build-apk-local.bat             # Windows local compilation script
```

---

## 🚀 How to Get the Testable APK on Your Phone (APK Kaise Banayein)

### Method 1: Instant 1-Click Cloud Build with GitHub Actions (Recommended ⭐)
*No need to install 10GB Android SDK or Android Studio on your PC!*

1. Initialize git and push this repository to GitHub:
   ```bash
   cd C:\Users\ASUS\.gemini\antigravity-ide\scratch\WomenSafetySOS
   git init
   git add .
   git commit -m "Initial commit of Women Safety SOS"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```
2. Open your repository on GitHub in your browser.
3. Click on the **Actions** tab at the top.
4. You will see the **Build Android APK** workflow running.
5. In ~4 minutes when the build finishes, click on the completed workflow run.
6. Under **Artifacts** at the bottom of the page, download **`WomenSafetySOS-APK.zip`**.
7. Extract the `.apk` file and transfer/install it directly on your Android phone!

---

### Method 2: Local Compilation on PC (Using Android Studio)
If you have Android Studio & Android SDK installed:

1. Open a terminal in the project folder:
   ```bash
   cd C:\Users\ASUS\.gemini\antigravity-ide\scratch\WomenSafetySOS
   ```
2. Double click or run:
   ```cmd
   build-apk-local.bat
   ```
   Or manually:
   ```bash
   npm install --legacy-peer-deps
   cd android
   ./gradlew assembleDebug
   ```
3. Your generated APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
