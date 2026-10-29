# 🚀 Build Your APK Now - Quick Start

## You're Ready to Build! ✅

Your project is fully configured and ready for cloud build:
- ✅ EAS CLI installed (v16.20.1)
- ✅ Logged in as: **zainafzal**
- ✅ Project configured with EAS
- ✅ All SMS fixes applied

## Two Ways to Build

### Method 1: Using the Script (Easiest) 🎯

**Just double-click:** `build-apk.bat`

The script will:
1. Show you build options
2. Start the build for you
3. Monitor progress
4. Give you the download link

### Method 2: Using Commands (Manual) 💻

Open PowerShell in this directory and run:

#### For Testing (Development APK)
```powershell
eas build --profile development --platform android
```

#### For Release (Production APK)
```powershell
eas build --profile production-apk --platform android
```

## What Happens During Build?

1. **Upload** (30 seconds)
   - Your code uploads to Expo's servers
   - Project configuration is validated

2. **Queue** (0-5 minutes)
   - Waiting for available build server
   - Free tier may have longer wait

3. **Build** (5-15 minutes)
   - Android environment setup
   - Dependencies installed
   - Native code compiled
   - APK generated

4. **Complete** ✅
   - You get a download link
   - APK ready to install

## Monitoring Your Build

After running the build command, you'll see:

```
✔ Build started, it may take a few minutes to complete.
You can monitor the build at:

https://expo.dev/accounts/zainafzal/projects/google-messages-mobile/builds/[BUILD_ID]
```

**Options:**
- Open the URL in browser to watch live progress
- Or wait in terminal for completion notification

## After Build Completes

### Step 1: Download APK
You'll receive a download link like:
```
https://expo.dev/artifacts/eas/[artifact-id].apk
```

### Step 2: Install on Device

**Option A: Direct Install (Easiest)**
1. Open the download link on your Android phone
2. Download the APK
3. Tap to install
4. Enable "Install from Unknown Sources" if prompted

**Option B: Transfer from PC**
1. Download APK to your computer
2. Connect phone via USB
3. Copy APK to phone
4. Open file manager on phone
5. Tap APK to install

### Step 3: Test the App
1. Open the app
2. Grant SMS permissions
3. Try sending a message
4. Go to Settings → Apps → Default apps → SMS app
5. Your app should now appear in the list!
6. Set it as default

## Check Build Status Anytime

```powershell
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

## Build Profiles Available

### 🔧 Development
- **Command**: `eas build --profile development --platform android`
- **Best for**: Testing, debugging
- **Size**: ~60-100MB (includes dev tools)
- **Build time**: 5-15 minutes
- **Signing**: Debug keystore (automatic)

### 🚀 Production APK
- **Command**: `eas build --profile production-apk --platform android`
- **Best for**: Release, distribution
- **Size**: ~30-50MB (optimized)
- **Build time**: 10-20 minutes
- **Signing**: Production keystore (EAS manages)

### 👀 Preview
- **Command**: `eas build --profile preview --platform android`
- **Best for**: Internal testing
- **Size**: ~30-50MB
- **Build time**: 10-20 minutes

## Common Issues & Solutions

### "No Android build credentials"
**Solution:** EAS will prompt you:
```
? Would you like to automatically create credentials?
> Yes
```
Just select "Yes" - EAS handles everything!

### "Build failed"
**Solutions:**
1. Check the build logs (click the build URL)
2. Look for specific error messages
3. Common fixes:
   - Update dependencies: `npm install`
   - Clear cache: `npm cache clean --force`
   - Try again: same build command

### "Can't download APK"
**Solution:**
```powershell
# List builds and copy download URL
eas build:list
```
Right-click the URL and "Open in browser"

### "APK won't install"
**Solutions:**
1. Enable "Unknown Sources" in Android settings
2. Make sure you have enough storage
3. Uninstall old version first
4. Check Android version (minimum API 21/Android 5.0)

## Build Commands Cheat Sheet

```powershell
# Start development build
eas build --profile development --platform android

# Start production build
eas build --profile production-apk --platform android

# Check all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Cancel running build
eas build:cancel

# Check credentials
eas credentials

# Check account info
eas whoami

# Update EAS CLI
npm install -g eas-cli@latest
```

## Cost & Limits

**Free Tier:**
- Limited builds per month
- Check your usage: https://expo.dev/accounts/zainafzal/settings/billing

**If you run out of builds:**
- Wait for next month's reset
- Or upgrade to paid plan

## Build Logs

Each build generates detailed logs:
- View in browser at build URL
- Or download locally:
  ```powershell
  eas build:view [BUILD_ID] --log
  ```

## Version Management

Before building for release, update version:

**File:** `app.json`
```json
{
  "expo": {
    "version": "1.0.0",  // <- Update this
    "android": {
      "versionCode": 1   // <- Auto-increments with "autoIncrement"
    }
  }
}
```

## Troubleshooting Checklist

Before building, verify:
- [ ] All files saved
- [ ] No syntax errors in code
- [ ] package.json dependencies are correct
- [ ] eas.json exists and is valid
- [ ] app.json is properly configured
- [ ] Logged in: `eas whoami`
- [ ] Internet connection stable

## Ready to Build? 🎉

### Quick Command (Copy & Paste):
```powershell
eas build --profile development --platform android
```

### Or double-click:
**`build-apk.bat`**

---

## Expected Timeline

| Step | Time | What You See |
|------|------|--------------|
| Upload | 30s | Uploading project... |
| Queue | 0-5m | Waiting in queue... |
| Setup | 2m | Installing dependencies... |
| Build | 5-10m | Building Android... |
| Finish | - | Build complete! |

**Total: ~10-15 minutes** ⏱️

---

## After Your First Build

The APK will include all the SMS fixes:
- ✅ Permission checks before sending
- ✅ Proper error handling
- ✅ Default SMS app support
- ✅ All BroadcastReceivers
- ✅ Native SMS module
- ✅ Enhanced security

## Questions?

- **Documentation**: `EAS_BUILD_GUIDE.md`
- **Troubleshooting**: `SMS_TROUBLESHOOTING.md`
- **Fixes Applied**: `FIXES_APPLIED.md`
- **Expo Docs**: https://docs.expo.dev/build/

---

## 🎯 Start Building Now!

Run this in PowerShell:
```powershell
eas build --profile development --platform android
```

Or double-click: **`build-apk.bat`**

The cloud will handle everything! ☁️🚀
