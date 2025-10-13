# How to Build APK Locally - Google Messages App

## Prerequisites

Before building, make sure you have:

1. ✅ **Java Development Kit (JDK)** - Version 17 or 11
2. ✅ **Android SDK** - Installed via Android Studio
3. ✅ **Node.js & npm** - Already installed
4. ✅ **Gradle** - Included in Android folder

---

## Quick Build (Recommended)

### Option 1: Build Debug APK (Fastest)

```powershell
# Navigate to android folder
cd android

# Build debug APK
./gradlew assembleDebug

# Or on Windows
.\gradlew.bat assembleDebug
```

**Output location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Option 2: Build Release APK (Production)

#### Step 1: Generate Signing Key (First Time Only)

```powershell
# Navigate to android/app folder
cd android/app

# Generate keystore (replace YOUR_KEY_ALIAS with your key name)
keytool -genkeypair -v -storetype PKCS12 -keystore google-messages-release.keystore -alias google-messages -keyalg RSA -keysize 2048 -validity 10000

# You'll be asked to enter:
# - Keystore password (remember this!)
# - Key password (remember this!)
# - Your name, organization, etc.
```

**Important:** Save your keystore file and passwords securely!

#### Step 2: Configure Signing

Create or edit `android/gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=google-messages-release.keystore
MYAPP_RELEASE_KEY_ALIAS=google-messages
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password_here
MYAPP_RELEASE_KEY_PASSWORD=your_key_password_here
```

#### Step 3: Update build.gradle

Edit `android/app/build.gradle` and add (if not already present):

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Step 4: Build Release APK

```powershell
# Navigate to android folder
cd android

# Build release APK
./gradlew assembleRelease

# Or on Windows
.\gradlew.bat assembleRelease
```

**Output location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Alternative: Expo EAS Build

If you prefer using Expo's cloud build service:

### Setup EAS Build (One Time)

```powershell
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

### Build APK with EAS

```powershell
# Build for Android
eas build --platform android --profile preview

# Or build APK specifically (not AAB)
eas build --platform android --profile preview --non-interactive
```

---

## Complete Build Commands Reference

### Clean Build (if you have issues)

```powershell
# Clean previous builds
cd android
.\gradlew.bat clean

# Build again
.\gradlew.bat assembleDebug
```

### Build Both Debug and Release

```powershell
cd android
.\gradlew.bat assembleDebug assembleRelease
```

### Check Build Success

```powershell
# List all APKs created
Get-ChildItem -Path "android\app\build\outputs\apk" -Recurse -Filter "*.apk"
```

---

## Install APK on Device

### Via USB (ADB)

```powershell
# Make sure device is connected and USB debugging enabled
adb devices

# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Install release APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Force reinstall (if already installed)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Manual Installation

1. Copy the APK to your device (via USB, email, cloud storage, etc.)
2. On your device, enable "Install from Unknown Sources"
3. Tap the APK file to install

---

## Build Variants

You can create different build variants for different purposes:

```powershell
# Debug variant (for development)
.\gradlew.bat assembleDebug

# Release variant (for production)
.\gradlew.bat assembleRelease
```

---

## Troubleshooting

### Error: "JAVA_HOME not set"

```powershell
# Check Java version
java -version

# Set JAVA_HOME (if needed)
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# Or add permanently via System Environment Variables
```

### Error: "SDK location not found"

Create `android/local.properties`:

```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

Replace `YOUR_USERNAME` with your actual Windows username.

### Error: "Gradle build failed"

```powershell
# Clear Gradle cache
cd android
.\gradlew.bat clean

# Delete build folders
Remove-Item -Recurse -Force android\app\build
Remove-Item -Recurse -Force android\.gradle

# Rebuild
.\gradlew.bat assembleDebug
```

### Error: "Out of memory"

Edit `android/gradle.properties` and add:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

---

## Build Optimization

### Reduce APK Size

Edit `android/app/build.gradle`:

```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
        }
    }
    
    // Optional: Build only for specific architectures
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a"
            universalApk false
        }
    }
}
```

### Speed Up Build

Edit `android/gradle.properties`:

```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
android.enableJetifier=true
android.useAndroidX=true
```

---

## Quick Reference

| Command | Output | Use Case |
|---------|--------|----------|
| `.\gradlew.bat assembleDebug` | `app-debug.apk` | Testing, development |
| `.\gradlew.bat assembleRelease` | `app-release.apk` | Production, distribution |
| `.\gradlew.bat clean` | - | Clear previous builds |
| `.\gradlew.bat bundleRelease` | `app-release.aab` | Google Play Store |

---

## APK vs AAB

- **APK** (Android Package): Direct install on devices
- **AAB** (Android App Bundle): For Google Play Store (optimized)

For local testing and sharing, use **APK**.  
For Google Play Store submission, use **AAB**.

---

## After Building

1. **Test the APK** on multiple devices
2. **Check permissions** work correctly
3. **Verify SMS functionality** (send, receive, mark as read)
4. **Test keyboard behavior** on different devices
5. **Check real-time sync** works properly

---

## Distribution

### Share APK File

You can share the built APK via:
- Direct file transfer (USB, Bluetooth)
- Cloud storage (Google Drive, Dropbox)
- File sharing services
- Internal distribution platforms

### Google Play Store

For Play Store submission:

```powershell
# Build AAB (App Bundle)
cd android
.\gradlew.bat bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

Then upload to Google Play Console.

---

**Note:** The debug APK is signed with a debug key and can be installed immediately. The release APK needs to be signed with your release key for distribution.

**Security:** Never commit your keystore file or passwords to version control! Keep them secure and backed up.
