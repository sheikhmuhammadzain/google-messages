# Google Messages Clone

A full-stack SMS messaging application that works as a default SMS app on Android and syncs with a web interface. Built with React Native (Expo), React, and Node.js.

## 🚀 Features

### Mobile App (Android)
- ✅ Default SMS app functionality
- ✅ Send and receive SMS messages
- ✅ Real-time message sync with web
- ✅ QR code pairing
- ✅ Material Design UI
- ✅ Contact management
- ✅ Message delivery status

### Web App
- ✅ QR code authentication
- ✅ Real-time message sync
- ✅ Send messages from browser
- ✅ Conversation management
- ✅ Desktop notifications
- ✅ Responsive design

### Backend
- ✅ WebSocket server for real-time sync
- ✅ Device authentication
- ✅ Session management
- ✅ Message routing
- ✅ MongoDB database

## 📁 Project Structure

```
google-messages/
├── backend/          # Node.js + Express + Socket.IO server
├── mobile/           # React Native Expo app
└── web/             # React web app
```

## 🛠️ Tech Stack

### Backend
- Node.js
- Express
- Socket.IO
- MongoDB
- TypeScript

### Mobile
- React Native (Expo 54)
- Expo Router
- React Native Paper
- Socket.IO Client
- TypeScript

### Web
- React 18
- Material-UI (MUI)
- Socket.IO Client
- Zustand (State Management)
- Vite
- TypeScript

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- **PostgreSQL** (local, Docker, or cloud)
- Android Studio (for mobile development)
- Physical Android device or emulator

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# PORT=3000
# DATABASE_URL=postgresql://postgres:password@localhost:5432/google_messages
# JWT_SECRET=your-secret-key
# CORS_ORIGIN=http://localhost:5173

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start development server
npm run dev

# Or build and start production
npm run build
npm start
```

### Mobile App Setup

```bash
cd mobile
npm install

# Update API URL in src/config/constants.ts
# For Android Emulator: http://10.0.2.2:3000
# For Physical Device: http://YOUR_LOCAL_IP:3000

# Start Expo development server
npm start

# Run on Android
npm run android

# Build APK
npx eas build --platform android
```

### Web App Setup

```bash
cd web
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:3000" > .env
echo "VITE_SOCKET_URL=http://localhost:3000" >> .env

# Start development server
npm run dev

# Build for production
npm run build
npm run preview
```

## 🚀 Usage

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

Server will run on `http://localhost:3000`

### 2. Start Mobile App

```bash
cd mobile
npm start
```

Then press `a` to open on Android device/emulator

### 3. Start Web App

```bash
cd web
npm run dev
```

Web app will open at `http://localhost:5173`

### 4. Pair Devices

1. Open web app in browser
2. A QR code will be displayed
3. Open mobile app and go to Settings
4. Tap "Pair with Web"
5. Scan the QR code
6. Messages will sync automatically

## 📱 Setting as Default SMS App

1. Install the mobile app on your Android device
2. Open the app
3. When prompted, tap "Set as default SMS app"
4. Select this app from Android settings
5. Grant all required permissions (READ_SMS, SEND_SMS, RECEIVE_SMS)

## 🔧 Configuration

### Backend Environment Variables

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/google_messages?schema=public
CORS_ORIGIN=http://localhost:5173
```

### Mobile Configuration

Edit `mobile/src/config/constants.ts`:

```typescript
export const API_URL = __DEV__ 
  ? 'http://10.0.2.2:3000' // For Android emulator
  : 'https://your-production-api.com';
```

### Web Configuration

Edit `web/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### Mobile App Issues

**Permission Denied:**
- Ensure all SMS permissions are granted in Android settings
- Check that app is set as default SMS app

**Connection Failed:**
- For emulator: Use `http://10.0.2.2:3000`
- For physical device: Use your computer's local IP (e.g., `http://192.168.1.100:3000`)
- Ensure both devices are on the same network
- Check firewall settings

### Web App Issues

**QR Code Not Loading:**
- Check backend server is running
- Verify API_URL in configuration
- Check browser console for errors

**Messages Not Syncing:**
- Ensure mobile device is connected to internet
- Check WebSocket connection status
- Verify mobile app is running in foreground

### Backend Issues

**MongoDB Connection Failed:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify network connectivity

**CORS Errors:**
- Update CORS_ORIGIN in .env to match your web app URL

## 🔐 Security Notes

- Change JWT_SECRET in production
- Use HTTPS for production deployment
- Implement rate limiting for API endpoints
- Add authentication middleware
- Encrypt sensitive data in database

## 📄 API Endpoints

### Authentication

- `GET /api/auth/generate-qr` - Generate QR code for pairing
- `POST /api/auth/wait-pairing` - Wait for mobile to scan QR
- `POST /api/auth/verify` - Verify session token

### WebSocket Events

**Mobile → Server:**
- `mobile:register` - Register device
- `mobile:scan-qr` - Scan QR code
- `mobile:messages` - Sync messages
- `mobile:conversations` - Sync conversations

**Web → Server:**
- `web:authenticate` - Authenticate session
- `web:send-message` - Send message
- `web:mark-read` - Mark as read

**Server → Clients:**
- `message:new` - New message received
- `message:status` - Message status update
- `conversations:sync` - Conversations synced
- `messages:sync` - Messages synced

## 🚀 Deployment

### Backend Deployment (Railway/Render/Heroku)

```bash
cd backend
npm run build

# Set environment variables in hosting platform
# Deploy dist/ folder
```

### Web Deployment (Vercel/Netlify)

```bash
cd web
npm run build

# Deploy dist/ folder
# Set environment variables in hosting platform
```

### Mobile Deployment (Google Play Store)

```bash
cd mobile

# Configure EAS
npx eas build:configure

# Build APK/AAB
npx eas build --platform android

# Submit to Play Store
npx eas submit --platform android
```

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

## ✨ Acknowledgments

- Inspired by Google Messages
- Built with modern web technologies
- Community contributions welcome

---

**Note:** This is a clone project for educational purposes. It is not affiliated with or endorsed by Google.
