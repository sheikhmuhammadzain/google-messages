# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Google Messages Clone** is a distributed SMS messaging system that replicates Google Messages functionality. It consists of three main components working together: an Android mobile app that acts as the default SMS handler, a web interface for desktop messaging, and a Node.js backend server that orchestrates real-time communication between devices.

**Architecture**: Monorepo with three directories
- **Backend**: Node.js + Express + Socket.IO + Prisma + PostgreSQL
- **Mobile**: React Native (Expo 54) + React Native Paper
- **Web**: React + Vite + Material-UI + Socket.IO Client

## Common Commands

### Backend (Node.js + Express)

**Setup & Run**:
```powershell
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration:
# - DATABASE_URL for PostgreSQL connection
# - JWT_SECRET for authentication
# - CORS_ORIGIN for web app URL

# Generate Prisma Client (required after schema changes)
npx prisma generate

# Run database migrations (first time setup)
npx prisma migrate dev --name init

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint TypeScript code
npm run lint
```

**Database Commands**:
```powershell
# Reset database and apply all migrations
npx prisma migrate reset

# Deploy migrations to production database
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate new migration after schema changes
npx prisma migrate dev --name migration_name
```

### Mobile (React Native - Expo 54)

**Setup & Run**:
```powershell
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Update API URL in src/config/constants.ts:
# - For Android Emulator: http://10.0.2.2:3000
# - For Physical Device: http://YOUR_LOCAL_IP:3000

# Start Expo development server
npm start
# Then press 'a' to open on Android

# Run directly on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Prebuild native code (required for custom native modules)
npm run prebuild

# Build APK for distribution
npm run build:android
# This uses EAS Build - requires EAS CLI setup

# Lint code
npm run lint
```

**EAS Build Commands**:
```powershell
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build profiles
eas build:configure

# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### Web (React + Vite)

**Setup & Run**:
```powershell
# Navigate to web directory
cd web

# Install dependencies
npm install

# Create .env file (optional - defaults work for local dev)
echo "VITE_API_URL=http://localhost:3000" > .env
echo "VITE_SOCKET_URL=http://localhost:3000" >> .env

# Start development server
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint TypeScript code
npm run lint
```

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────┐
│                Mobile App (Android)                     │
│  React Native + Expo → SMS APIs → Socket.IO           │
│  - Default SMS app functionality                       │
│  - QR code pairing                                      │
│  - Real-time message sync                              │
│  - Contact management                                   │
└──────────────────┬──────────────────────────────────────┘
                   │ WebSocket + REST API
┌──────────────────▼──────────────────────────────────────┐
│                Backend Server (Node.js)                 │
│  Express + Socket.IO + Prisma → PostgreSQL             │
│  - WebSocket server for real-time sync                 │
│  - Device authentication & session management          │
│  - QR code generation and pairing                      │
│  - Message routing between mobile and web              │
└──────────────────┬──────────────────────────────────────┘
                   │ WebSocket
┌──────────────────▼──────────────────────────────────────┐
│                 Web App (React)                         │
│  Vite + React + Material-UI + Socket.IO Client         │
│  - QR code authentication                               │
│  - Real-time message display                            │
│  - Send messages via mobile device                      │
│  - Desktop notifications                                │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

**Message Send Flow (Web → Mobile → SMS)**:
1. User types message in web interface
2. Web app sends via WebSocket to backend server
3. Backend routes message to connected mobile device
4. Mobile app receives send request and uses native SMS API
5. Mobile app confirms delivery to backend
6. Backend notifies web app of status update

**Message Receive Flow (SMS → Mobile → Web)**:
1. SMS arrives on Android device (intercepted by BroadcastReceiver)
2. Mobile app reads SMS via native API
3. Mobile app sends message data to backend via WebSocket
4. Backend routes to all connected web sessions
5. Web app displays message in real-time

**Authentication Flow**:
1. Web app requests QR code from backend
2. Backend generates time-limited pairing token and QR data
3. Mobile app scans QR code
4. Backend validates token and creates session
5. JWT tokens exchanged for persistent authentication

### Key Architectural Patterns

**Backend (Node.js)**:
- **Express + Socket.IO**: HTTP API + WebSocket server
- **Prisma ORM**: Type-safe database operations with PostgreSQL
- **JWT Authentication**: Session management with time-limited tokens
- **Event-driven Architecture**: WebSocket events for real-time communication

**Mobile (React Native)**:
- **Expo Router**: File-based routing system
- **Service Architecture**: Components → Services → Native APIs
- **Socket.IO Client**: Real-time communication with backend
- **SecureStore**: Encrypted storage for authentication tokens

**Web (React)**:
- **Zustand**: Lightweight global state management
- **Material-UI**: Google Material Design components
- **Socket.IO Client**: WebSocket connection management
- **React Router**: Client-side routing

### Database Schema (PostgreSQL + Prisma)

**Key Models**:
- **Device**: Mobile device registration and pairing
- **Session**: Web authentication sessions
- **Message**: SMS message history (optional storage)
- **Conversation**: Contact conversations with metadata

**Important Indexes**:
- `devices`: deviceId, pairingToken
- `sessions`: sessionToken, expiresAt
- `messages`: deviceId, conversationId, timestamp
- `conversations`: deviceId, lastMessageTime

## Development Workflows

### Setting up Full Development Environment

1. **Start PostgreSQL database** (Docker recommended):
```powershell
docker run --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=google_messages -p 5432:5432 -d postgres:15
```

2. **Setup backend** (in backend/):
```powershell
npm install
cp .env.example .env
# Edit .env with database connection
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

3. **Setup web app** (in web/):
```powershell
npm install
npm run dev
```

4. **Setup mobile app** (in mobile/):
```powershell
npm install
# Edit src/config/constants.ts with your local IP
npm start
```

### Adding New WebSocket Events

1. **Define event types** in backend `src/types/socket.ts`
2. **Add server handlers** in backend `src/websocket/handlers/`
3. **Update client handlers** in mobile and web Socket.IO implementations
4. **Test real-time functionality** across all three components

### Database Schema Changes

1. **Edit Prisma schema** in `backend/prisma/schema.prisma`
2. **Generate migration**: `npx prisma migrate dev --name descriptive_name`
3. **Update TypeScript types**: `npx prisma generate`
4. **Update application code** to use new schema
5. **Test with fresh database**: `npx prisma migrate reset`

### Adding Mobile Features

1. **Check Expo compatibility** for native modules
2. **Update mobile app** with new React Native components
3. **Handle native permissions** in app.json or expo-config
4. **Test on physical device** (emulator limitations with SMS)
5. **Update backend API** if new endpoints needed

### Deployment Workflow

**Backend (Railway/Render/Heroku)**:
1. Set environment variables in hosting platform
2. Add DATABASE_URL for production PostgreSQL
3. Deploy from backend/ directory
4. Run `npx prisma migrate deploy` on first deploy

**Web App (Vercel/Netlify)**:
1. Deploy from web/ directory
2. Set VITE_API_URL and VITE_SOCKET_URL environment variables
3. Build automatically triggers `npm run build`

**Mobile App (Play Store)**:
1. Configure EAS Build with `eas build:configure`
2. Build APK: `eas build --platform android`
3. Submit: `eas submit --platform android`

## Important Technical Details

### SMS Permissions & Default App Setup

The mobile app requires specific Android permissions and setup:
- **READ_SMS, SEND_SMS, RECEIVE_SMS**: Core SMS operations
- **READ_CONTACTS**: Contact name resolution
- **Default SMS App**: Must be set as system default to intercept all SMS

**Critical**: The app only works as default SMS app. This is by Android design for security.

### Real-time Communication

- **WebSocket Events**: Defined in `backend/src/types/socket.ts`
- **Automatic Reconnection**: Socket.IO handles connection drops
- **Session Management**: JWT tokens with 30-day expiry
- **Rate Limiting**: Consider implementing for production

### Security Considerations

- **QR Code Pairing**: 5-minute time-limited tokens
- **JWT Authentication**: Secure token storage (SecureStore/localStorage)
- **CORS Configuration**: Restrict origins in production
- **Input Validation**: All WebSocket events should be validated
- **SMS Privacy**: Messages never stored on backend by design

### Development vs Production Configuration

**Development**:
- CORS open to `http://localhost:5173`
- Local PostgreSQL database
- HTTP connections (http://)
- Detailed logging enabled

**Production**:
- Restrictive CORS origins
- PostgreSQL cloud instance (Railway, Supabase, etc.)
- HTTPS/WSS connections (wss://)
- Structured logging with error tracking

## Mobile-Specific Considerations

### Android Development

**Required Tools**:
- Android Studio (for emulator and debugging)
- Physical Android device (recommended for SMS testing)
- USB debugging enabled

**Key Configuration Files**:
- `app.json`: Expo configuration and permissions
- `src/config/constants.ts`: API endpoints
- `eas.json`: Build profiles for EAS Build

**Testing SMS Functionality**:
- Use physical device (emulator can't handle SMS)
- Grant all permissions during first launch
- Set as default SMS app in Android settings
- Test with second phone for end-to-end functionality

### Common Mobile Issues

**Connection Problems**:
- For emulator: Use `http://10.0.2.2:3000` (Android bridge)
- For physical device: Use local computer IP address
- Ensure both devices on same WiFi network
- Check Windows Firewall/antivirus blocking connections

**Permission Issues**:
- Ensure app is set as default SMS app
- Grant all SMS-related permissions
- Some Android versions require manual permission granting

**Build Issues**:
- Use EAS Build for production APKs
- Local builds may fail due to native dependencies
- Ensure Expo CLI and EAS CLI are updated

## Troubleshooting

### Backend Issues

**Database Connection Failed**:
- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check DATABASE_URL format in .env
- Test connection with `npx prisma studio`

**WebSocket Connection Issues**:
- Verify CORS_ORIGIN matches web app URL
- Check firewall settings on port 3000
- Test with WebSocket client tools

### Mobile App Issues

**App Won't Install/Run**:
- Clear Expo cache: `npm start -- --clear`
- Rebuild with `npm run prebuild`
- Check Expo CLI version compatibility

**SMS Not Working**:
- Verify app is set as default SMS app
- Check all permissions granted
- Test on physical device (not emulator)

### Web App Issues

**QR Code Not Loading**:
- Verify backend server running on port 3000
- Check browser console for API errors
- Ensure VITE_API_URL points to correct backend

**Messages Not Syncing**:
- Check WebSocket connection in browser dev tools
- Verify mobile app is connected and in foreground
- Test backend WebSocket events directly

## File Structure

```
google-messages/
├── backend/                     # Node.js backend server
│   ├── src/
│   │   ├── routes/             # Express API routes
│   │   ├── websocket/          # Socket.IO event handlers
│   │   ├── middleware/         # Authentication & validation
│   │   ├── services/           # Business logic
│   │   ├── types/              # TypeScript type definitions
│   │   └── server.ts           # Main server entry point
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── package.json            # Dependencies & scripts
│   └── .env.example           # Environment template
├── mobile/                      # React Native mobile app
│   ├── src/
│   │   ├── app/                # Expo Router pages
│   │   ├── components/         # Reusable UI components
│   │   ├── services/           # API and WebSocket services
│   │   ├── config/             # Configuration constants
│   │   └── types/              # TypeScript types
│   ├── app.json               # Expo configuration
│   └── package.json           # Dependencies & scripts
└── web/                        # React web application
    ├── src/
    │   ├── components/         # React components
    │   ├── pages/              # Route pages
    │   ├── services/           # API clients
    │   ├── store/              # Zustand state management
    │   └── types/              # TypeScript types
    ├── index.html             # Vite entry point
    └── package.json           # Dependencies & scripts
```

This architecture provides a production-ready foundation for real-time SMS messaging with web synchronization, following modern development practices and scalable patterns.