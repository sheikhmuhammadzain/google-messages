# Building and Running the Mobile App

## ⚠️ Important: Expo Go vs Development Build

Your app uses **native modules** (SMS, Camera, Contacts) that require a **development build**.

**Expo Go** ❌ - Won't work (red screen error)  
**Development Build** ✅ - Required for this app

---

## 🚀 Quick Start - Development Build

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 2: Build and Run

**Option A - Android Emulator:**
```bash
npx expo run:android
```

**Option B - Physical Device:**
```bash
# Make sure USB debugging is enabled
npx expo run:android --device
```

This will:
1. Generate native Android code
2. Build the APK
3. Install on device/emulator
4. Start Metro bundler
5. Connect and run the app

---

## 📱 First Time Setup

### Prerequisites

1. **Android Studio** installed
2. **Android SDK** configured
3. **Java JDK** installed (included with Android Studio)
4. **ADB** in PATH

### Environment Setup

**Windows:**
```bash
# Add to environment variables:
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
Path=%Path%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```

**Mac/Linux:**
```bash
# Add to ~/.zshrc or ~/.bashrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 🔨 Build Commands

### Clean Build
```bash
# Remove previous builds
rm -rf android ios

# Clean prebuild
npx expo prebuild --clean

# Build
npx expo run:android
```

### Development Build
```bash
# Fast development build
npx expo run:android --variant debug
```

### Release Build
```bash
# Production build
npx expo run:android --variant release
```

---

## 🐛 Troubleshooting

### Error: "Unable to locate Android SDK"

**Solution:**
1. Install Android Studio
2. Open Android Studio → SDK Manager
3. Install:
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools

### Error: "No connected devices"

**Solution:**

**For Emulator:**
1. Open Android Studio
2. AVD Manager → Create Virtual Device
3. Run the emulator
4. Then run: `npx expo run:android`

**For Physical Device:**
1. Enable USB Debugging in Developer Options
2. Connect via USB
3. Run: `adb devices` (should show your device)
4. Run: `npx expo run:android --device`

### Error: "Task :app:installDebug FAILED"

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Error: "Metro bundler port in use"

**Solution:**
```bash
# Kill Metro on port 8081
# Windows:
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8081 | xargs kill -9

# Then restart
npm start
```

---

## 🎯 Recommended Workflow

### Daily Development:

1. **Start Metro bundler:**
   ```bash
   npm start
   ```

2. **In another terminal, run app:**
   ```bash
   npx expo run:android
   ```

3. **Make changes** to your code

4. **Fast Refresh** will auto-reload (no rebuild needed!)

5. **Only rebuild if:**
   - Changed native code
   - Added new native module
   - Changed app.json significantly

---

## 🔄 Making Changes

### Code Changes (JS/TS)
- ✅ Fast Refresh auto-reloads
- No rebuild needed

### Native Code Changes
- ❌ Requires rebuild
- Run: `npx expo run:android`

### Dependencies Added
- If native module: Rebuild
- If JS only: No rebuild

---

## 📦 Building APK for Testing

### Development APK
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Unsigned)
```bash
cd android
./gradlew assembleRelease
```

### Release APK with EAS (Signed)
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

---

## 🚀 EAS Build (Cloud Build)

### Setup EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure
```

### Build Profiles

Create `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Build Commands

```bash
# Development build
eas build --profile development --platform android

# Preview APK
eas build --profile preview --platform android

# Production AAB
eas build --profile production --platform android
```

---

## 📱 Installing on Device

### Via USB
```bash
# Check device connected
adb devices

# Install APK
adb install app-debug.apk
```

### Via QR Code (EAS)
After EAS build completes, scan the QR code to download.

### Via ADB Wireless
```bash
# Enable wireless debugging on device
# Get device IP from Settings

adb tcpip 5555
adb connect <DEVICE_IP>:5555
adb install app-debug.apk
```

---

## 🔍 Debugging

### View Logs
```bash
# All logs
adb logcat

# Filter by app
adb logcat | grep GoogleMessages

# Filter errors only
adb logcat | grep -i error
```

### Open Dev Menu
- Shake device
- Or: `adb shell input keyevent 82`
- Or: Press `Ctrl+M` (emulator)

### Reload App
- In Dev Menu: "Reload"
- Or: Press `r` in Metro bundler terminal

---

## 📊 Performance

### Check Bundle Size
```bash
npx expo export --platform android
# Check: dist/assets
```

### Enable Hermes (Already configured)
Hermes is enabled in `app.json`:
```json
"jsEngine": "hermes"
```

Benefits:
- ✅ Faster startup
- ✅ Smaller bundle
- ✅ Lower memory usage

---

## 🎯 Common Commands Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start Metro bundler |
| `npx expo run:android` | Build & run on Android |
| `npx expo prebuild --clean` | Clean native folders |
| `adb devices` | List connected devices |
| `adb logcat` | View device logs |
| `adb shell input keyevent 82` | Open dev menu |
| `eas build` | Cloud build (signed) |

---

## ✅ Success Checklist

Before running app:
- [ ] Node.js 18+ installed
- [ ] Android Studio installed
- [ ] Android SDK configured
- [ ] Emulator running OR device connected
- [ ] Backend server running (port 3000)
- [ ] Dependencies installed (`npm install`)

To run:
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start Metro
cd mobile
npm start

# Terminal 3: Run app
cd mobile
npx expo run:android
```

---

## 🎉 You're Ready!

The app should now build and run successfully with all native features working:
- ✅ SMS reading/sending
- ✅ QR code scanning
- ✅ Contact access
- ✅ WebSocket sync
- ✅ Full debugging support

Happy coding! 🚀
