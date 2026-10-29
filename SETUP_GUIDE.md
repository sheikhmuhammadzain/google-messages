# Complete Setup Guide

This guide will walk you through setting up the entire Google Messages clone project from scratch.

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18 or higher installed
- ✅ npm or yarn package manager
- ✅ MongoDB installed (local) or MongoDB Atlas account (cloud)
- ✅ Android Studio installed (for mobile development)
- ✅ Physical Android device or emulator
- ✅ Git installed (optional)

## 🚀 Quick Start (5 Steps)

### Step 1: Install MongoDB

#### Option A: Local MongoDB
```bash
# Windows (with Chocolatey)
choco install mongodb

# macOS
brew install mongodb-community

# Start MongoDB
mongod --dbpath /path/to/data/directory
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string

### Step 2: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
echo PORT=3000 > .env
echo NODE_ENV=development >> .env
echo JWT_SECRET=my-super-secret-key-change-in-production >> .env
echo MONGODB_URI=mongodb://localhost:27017/google-messages >> .env
echo CORS_ORIGIN=http://localhost:5173 >> .env

# Start backend server
npm run dev
```

✅ Backend should now be running at `http://localhost:3000`

### Step 3: Setup Web App

Open a **new terminal**:

```bash
# Navigate to web folder
cd web

# Install dependencies
npm install

# Create .env file (optional, defaults are set)
echo VITE_API_URL=http://localhost:3000 > .env
echo VITE_SOCKET_URL=http://localhost:3000 >> .env

# Start web app
npm run dev
```

✅ Web app should open at `http://localhost:5173`

### Step 4: Setup Mobile App

Open a **new terminal**:

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install

# Important: Update API URL in src/config/constants.ts
# For Android Emulator: http://10.0.2.2:3000
# For Physical Device: http://YOUR_COMPUTER_IP:3000

# Start Expo
npm start
```

Press `a` to open on Android device/emulator

✅ Mobile app should launch on your Android device

### Step 5: Pair Devices

1. Open web app in browser (`http://localhost:5173`)
2. QR code will be displayed
3. Open mobile app
4. Tap menu → Settings
5. Tap "Pair with Web"
6. Scan QR code
7. ✅ Devices are now paired!

## 🔧 Detailed Setup Instructions

### A. Backend Server Setup

#### 1. Install Dependencies

```bash
cd backend
npm install
```

Installed packages:
- express (web framework)
- socket.io (WebSocket)
- mongoose (MongoDB)
- jsonwebtoken (JWT auth)
- cors (CORS middleware)
- dotenv (environment variables)

#### 2. Configure Environment

Create `.env` file with:

```env
# Server Port
PORT=3000

# Environment
NODE_ENV=development

# Security
JWT_SECRET=change-this-to-a-random-string-in-production

# Database
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/google-messages

# OR MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/google-messages

# CORS
CORS_ORIGIN=http://localhost:5173
```

#### 3. Start Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

#### 4. Test Backend

Open browser and go to `http://localhost:3000`

You should see:
```json
{
  "success": true,
  "message": "Google Messages Backend API",
  "version": "1.0.0"
}
```

### B. Web App Setup

#### 1. Install Dependencies

```bash
cd web
npm install
```

Installed packages:
- react (UI library)
- react-router-dom (routing)
- @mui/material (Material-UI)
- socket.io-client (WebSocket client)
- zustand (state management)
- qrcode.react (QR code generation)

#### 2. Configure Environment

Create `.env` file (optional, defaults work):

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

#### 3. Start Development Server

```bash
npm run dev
```

#### 4. Build for Production

```bash
npm run build
npm run preview
```

### C. Mobile App Setup

#### 1. Install Dependencies

```bash
cd mobile
npm install
```

#### 2. Configure API URL

**IMPORTANT:** Edit `src/config/constants.ts`

For **Android Emulator**:
```typescript
export const API_URL = 'http://10.0.2.2:3000';
```

For **Physical Device**:
```typescript
// Replace with your computer's local IP
export const API_URL = 'http://192.168.1.100:3000';
```

To find your IP:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

#### 3. Start Expo Development Server

```bash
npm start
```

Options:
- Press `a` - Open on Android
- Press `i` - Open on iOS (limited functionality)
- Press `w` - Open in web browser

#### 4. Install on Device

**Option A: Expo Go (Development)**
1. Install Expo Go from Play Store
2. Scan QR code from terminal
3. App will load

**Option B: Development Build**
```bash
npx expo prebuild
npm run android
```

**Option C: Production APK**
```bash
# Configure EAS
npx eas build:configure

# Build APK
npx eas build --platform android --profile preview
```

## 📱 Setting as Default SMS App

1. Open mobile app
2. Tap "Set as default" when prompted
3. In Android settings, select this app
4. Grant SMS permissions:
   - Read SMS
   - Send SMS
   - Receive SMS
   - Read Contacts

## 🧪 Testing the Application

### Test 1: Backend Health Check

```bash
curl http://localhost:3000
```

Expected response:
```json
{
  "success": true,
  "message": "Google Messages Backend API"
}
```

### Test 2: QR Code Generation

```bash
curl http://localhost:3000/api/auth/generate-qr
```

Expected response:
```json
{
  "success": true,
  "data": {
    "qrData": "{...}",
    "token": "uuid",
    "expiresIn": 300000
  }
}
```

### Test 3: Web App Loading

Open `http://localhost:5173` in browser

- Should show QR code
- No console errors
- Proper Material-UI styling

### Test 4: Mobile App

- App launches without crashes
- Can see inbox (may be empty initially)
- Settings screen accessible
- QR scanner works

### Test 5: Device Pairing

1. Web app displays QR code
2. Mobile app scans QR code
3. Web app redirects to messages page
4. Mobile device appears connected

### Test 6: Message Sync

1. Send SMS from another phone to your device
2. Message appears in mobile app
3. Message syncs to web app automatically

## 🐛 Common Issues & Solutions

### Issue: Backend won't start

**Error:** `Cannot connect to MongoDB`

**Solution:**
```bash
# Start MongoDB
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Or use MongoDB Atlas (cloud)
```

**Error:** `Port 3000 already in use`

**Solution:**
```bash
# Change PORT in backend/.env
PORT=3001

# Update web/.env
VITE_API_URL=http://localhost:3001
```

### Issue: Web app can't connect to backend

**Error:** `Network Error` or `CORS Error`

**Solution:**
1. Check backend is running
2. Verify CORS_ORIGIN in backend/.env
3. Check firewall settings
4. Try without HTTPS

### Issue: Mobile can't connect to backend

**Error:** `Connection failed`

**Solution for Emulator:**
```typescript
// Use 10.0.2.2 instead of localhost
export const API_URL = 'http://10.0.2.2:3000';
```

**Solution for Physical Device:**
1. Find your computer's IP address
2. Update API_URL in constants.ts
3. Ensure both devices on same WiFi network
4. Disable firewall or allow port 3000

### Issue: SMS permissions denied

**Solution:**
1. Go to Android Settings
2. Apps → Messages → Permissions
3. Grant all SMS permissions
4. Set as default SMS app in:
   Settings → Apps → Default Apps → SMS app

### Issue: QR code not scanning

**Solution:**
1. Grant camera permission
2. Ensure QR code is clearly visible
3. Try adjusting brightness and distance
4. Check QR code hasn't expired (5 min timeout)

## 🔄 Development Workflow

### Making Changes

1. **Backend Changes**
   - Edit files in `backend/src/`
   - Server auto-reloads with `npm run dev`
   - Test with curl or Postman

2. **Web App Changes**
   - Edit files in `web/src/`
   - Browser auto-reloads with Vite
   - Check browser DevTools console

3. **Mobile App Changes**
   - Edit files in `mobile/src/` or `mobile/app/`
   - Shake device → Reload
   - Or press `r` in Expo terminal

### Running All Services

Use 3 separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 - Web:**
```bash
cd web && npm run dev
```

**Terminal 3 - Mobile:**
```bash
cd mobile && npm start
```

## 🚀 Production Deployment

### Backend (Railway/Render)

```bash
cd backend
npm run build

# Set environment variables in hosting platform
# Deploy dist/ folder
```

### Web (Vercel)

```bash
cd web
npm run build

# Connect GitHub repo to Vercel
# Or use Vercel CLI:
vercel --prod
```

### Mobile (Play Store)

```bash
cd mobile

# Build production APK/AAB
npx eas build --platform android --profile production

# Submit to Play Store
npx eas submit --platform android
```

## 📚 Next Steps

1. ✅ Complete setup
2. ✅ Test basic functionality
3. 📚 Read individual README files for each component
4. 🔧 Customize UI and features
5. 🚀 Deploy to production
6. 📱 Publish to Play Store

## 💡 Tips

- Use MongoDB Atlas for easier setup
- Test on physical device for SMS functionality
- Keep all services running during development
- Check console/terminal for errors
- Use React DevTools and Redux DevTools

## 🆘 Getting Help

If you encounter issues:

1. Check console/terminal for error messages
2. Verify all services are running
3. Check environment variables
4. Review README files
5. Check firewall and network settings

## 📄 License

MIT License - Free to use and modify

---

**Happy coding! 🎉**
