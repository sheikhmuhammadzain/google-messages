# Building APK with Expo Cloud (EAS Build)

## Why Use EAS Build?

- ✅ No need for local Android SDK or Java installation
- ✅ Build in the cloud on Expo's servers
- ✅ Faster and more reliable builds
- ✅ Can build from any computer (Windows, Mac, Linux)
- ✅ Free tier available (limited builds per month)

## Prerequisites

1. **Expo Account** - Sign up at https://expo.dev
2. **EAS CLI** - Install globally
3. **Project configured** - Already done! ✅

## Step-by-Step Instructions

### Step 1: Install EAS CLI (if not already installed)

```powershell
npm install -g eas-cli
```

### Step 2: Login to Your Expo Account

```powershell
eas login
```

Enter your Expo account credentials when prompted.

### Step 3: Configure Your Project (Optional - Already configured!)

Your project already has `eas.json` configured with these build profiles:
- **development** - Development build with APK
- **preview** - Preview build for internal testing
- **production** - Production build (AAB for Play Store)
- **production-apk** - Production build as APK

### Step 4: Build Your APK

Choose ONE of these options:

#### Option A: Development APK (Recommended for Testing)
```powershell
eas build --profile development --platform android
```

#### Option B: Production APK (For Release)
```powershell
eas build --profile production-apk --platform android
```

#### Option C: Preview Build
```powershell
eas build --profile preview --platform android
```

### Step 5: Monitor Build Progress

After running the build command:
1. The CLI will show a build URL
2. Open the URL in your browser to watch progress
3. Or wait in the terminal for completion

### Step 6: Download Your APK

When build completes:
1. EAS will provide a download link
2. Click the link or download from https://expo.dev/accounts/[your-account]/projects/google-messages-mobile/builds
3. Transfer APK to your Android device
4. Install the APK

## Build Profiles Explained

### Development Build
```json
{
  "developmentClient": true,
  "distribution": "internal",
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleDebug"
  }
}
```
- **Use for**: Testing during development
- **Includes**: Expo Dev Client for hot reload
- **Size**: Larger (includes dev tools)
- **Signing**: Debug keystore

### Production APK Build
```json
{
  "extends": "production",
  "android": {
    "buildType": "apk"
  }
}
```
- **Use for**: Distribution outside Play Store
- **Includes**: Optimized production code
- **Size**: Smaller (optimized)
- **Signing**: Requires credentials

## Setting Up Build Credentials

### For Development Builds
No setup needed - uses debug keystore automatically.

### For Production Builds

First time only, EAS will ask about credentials:

```
? Would you like to automatically create credentials?
> Yes (recommended)
```

EAS will generate:
- Keystore
- Keystore password
- Key alias
- Key password

These are stored securely in Expo's servers.

## Common Build Commands

### Build for specific platform
```powershell
# Android only
eas build --platform android --profile development

# iOS only (requires Mac for local builds)
eas build --platform ios --profile development

# Both platforms
eas build --platform all --profile development
```

### Check build status
```powershell
eas build:list
```

### View build details
```powershell
eas build:view [build-id]
```

### Cancel a build
```powershell
eas build:cancel [build-id]
```

## Build Configuration Options

You can customize your builds in `eas.json`:

```json
{
  "build": {
    "custom-profile": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease",
        "withoutCredentials": false
      },
      "env": {
        "CUSTOM_VAR": "value"
      },
      "distribution": "internal",
      "channel": "preview"
    }
  }
}
```

## Troubleshooting

### Build Fails with "Gradle error"

Check your `build.gradle` files for syntax errors:
```powershell
cd android
.\gradlew clean
.\gradlew assembleDebug --info
```

### "No matching distribution found"

Update your `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  }
}
```

### Build succeeds but APK doesn't work

1. Check AndroidManifest.xml for errors
2. Verify all required permissions are declared
3. Check that all Kotlin/Java files compile correctly
4. Review build logs for warnings

### "Credentials not configured"

For production builds:
```powershell
eas credentials
```

Follow prompts to configure keystore.

## Installation on Android Device

### Method 1: Direct Download
1. Open build URL on your Android device
2. Download APK
3. Tap to install
4. Allow "Install from Unknown Sources" if prompted

### Method 2: ADB Install
```powershell
# Download APK to computer first
adb install path/to/your-app.apk
```

### Method 3: File Transfer
1. Download APK to computer
2. Transfer to device via USB/Bluetooth/Cloud
3. Open file manager on device
4. Tap APK to install

## Build Time Estimates

- **Development builds**: 5-15 minutes
- **Production builds**: 10-20 minutes
- Time varies based on:
  - Queue wait time
  - Project size
  - Dependencies
  - Current server load

## Cost & Limits

### Free Tier
- Limited builds per month
- Check current limits: https://expo.dev/pricing

### Paid Plans
- Unlimited builds
- Priority queue
- Additional features

## Best Practices

1. **Test locally first** (if possible)
   ```powershell
   npx expo run:android
   ```

2. **Use development profile** for testing
   ```powershell
   eas build --profile development --platform android
   ```

3. **Use production profile** only for releases
   ```powershell
   eas build --profile production-apk --platform android
   ```

4. **Version your builds**
   - Update version in `app.json`
   - Use semantic versioning (1.0.0, 1.0.1, etc.)

5. **Keep credentials secure**
   - Never commit keystores to git
   - Use EAS credential manager
   - Backup credentials separately

## Quick Reference

```powershell
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build development APK
eas build --profile development --platform android

# Build production APK
eas build --profile production-apk --platform android

# Check builds
eas build:list

# Download specific build
# Use the link provided in build completion message
```

## Support & Resources

- **EAS Build Documentation**: https://docs.expo.dev/build/introduction/
- **EAS Build Troubleshooting**: https://docs.expo.dev/build/troubleshooting/
- **Expo Forums**: https://forums.expo.dev/
- **Discord**: https://chat.expo.dev/

## Next Steps After Building

1. ✅ Download APK from EAS
2. ✅ Install on Android device
3. ✅ Test message sending functionality
4. ✅ Test setting as default SMS app
5. ✅ Verify all permissions work correctly
6. ✅ Test on multiple Android versions if possible

---

**Ready to build?** Run this command:

```powershell
eas build --profile development --platform android
```

The build will start in the cloud and you'll get a download link when done! 🚀
