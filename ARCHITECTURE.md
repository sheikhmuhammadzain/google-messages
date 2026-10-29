# Architecture Documentation

## System Overview

The Google Messages Clone is a distributed messaging system consisting of three main components:

```
┌─────────────────┐
│   Mobile App    │ (Android)
│  React Native   │
└────────┬────────┘
         │
         │ WebSocket + REST
         │
         ▼
┌─────────────────┐
│  Backend Server │
│   Node.js +     │
│   Socket.IO     │
└────────┬────────┘
         │
         │ WebSocket
         │
         ▼
┌─────────────────┐
│    Web App      │
│     React       │
└─────────────────┘
```

## Components

### 1. Mobile App (React Native - Expo 54)

**Responsibilities:**
- Act as default SMS app on Android
- Read/Send SMS messages via native APIs
- Authenticate with backend via QR code
- Sync messages to backend in real-time
- Receive send requests from web app

**Key Technologies:**
- React Native 0.76.5
- Expo 54
- Expo Router (file-based routing)
- React Native Paper (Material UI)
- Socket.IO Client
- react-native-get-sms-android (SMS operations)

**Architecture Pattern:**
- Service-based architecture
- Components → Services → Native APIs
- Event-driven communication with backend

### 2. Backend Server (Node.js + Express)

**Responsibilities:**
- WebSocket server for real-time communication
- Device authentication and session management
- Route messages between mobile and web
- QR code generation and pairing
- Database operations

**Key Technologies:**
- Node.js 18
- Express.js (REST API)
- Socket.IO (WebSocket)
- MongoDB + Mongoose (Database)
- JWT (Authentication)

**Architecture Pattern:**
- MVC-like structure
- Routes → Services → Models
- Event-driven WebSocket architecture

### 3. Web App (React + Vite)

**Responsibilities:**
- Display messages from mobile device
- Send messages via mobile device
- Real-time message synchronization
- QR code authentication

**Key Technologies:**
- React 18
- Material-UI (MUI)
- Socket.IO Client
- Zustand (State Management)
- React Router (Routing)
- Vite (Build Tool)

**Architecture Pattern:**
- Component-based architecture
- Pages → Components → Services → Backend
- Global state management with Zustand

## Data Flow

### Message Send Flow (Web → Mobile)

```
1. User types message in Web App
   ↓
2. Web App sends via WebSocket to Backend
   ↓
3. Backend routes to connected Mobile Device
   ↓
4. Mobile App receives send request
   ↓
5. Mobile App sends SMS via native API
   ↓
6. Mobile App confirms to Backend
   ↓
7. Backend notifies Web App
   ↓
8. Web App updates UI
```

### Message Receive Flow (Mobile → Web)

```
1. SMS arrives on Android device
   ↓
2. Mobile App intercepts via BroadcastReceiver
   ↓
3. Mobile App reads SMS from native API
   ↓
4. Mobile App sends to Backend via WebSocket
   ↓
5. Backend routes to all connected Web sessions
   ↓
6. Web App receives and displays message
```

### Authentication Flow

```
1. Web App requests QR code from Backend
   ↓
2. Backend generates token and QR data
   ↓
3. Web App displays QR code
   ↓
4. Mobile App scans QR code
   ↓
5. Mobile App sends token to Backend
   ↓
6. Backend validates and creates session
   ↓
7. Backend notifies Web App
   ↓
8. Web App receives session token
   ↓
9. Web App connects with session token
   ↓
10. Backend establishes WebSocket connection
```

## Database Schema

### Collections

#### Devices
```typescript
{
  _id: ObjectId,
  deviceId: string,           // Unique device identifier
  deviceName: string,         // e.g., "Pixel 7"
  deviceModel: string,        // e.g., "Google Pixel 7"
  pairingToken: string,       // Temporary pairing token
  pairingTokenExpiry: Date,   // Token expiration
  connectedAt: Date,          // First connection time
  lastSeen: Date             // Last activity time
}
```

#### Sessions
```typescript
{
  _id: ObjectId,
  deviceId: string,          // Reference to device
  sessionToken: string,      // JWT token
  connectedAt: Date,         // Session creation time
  lastSeen: Date,           // Last activity
  expiresAt: Date           // Session expiration
}
```

## WebSocket Events

### Mobile → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `mobile:register` | `{ deviceId, deviceName, deviceModel }` | Register mobile device |
| `mobile:scan-qr` | `{ qrData, deviceId }` | Scan QR code |
| `mobile:messages` | `{ messages: Message[] }` | Sync messages |
| `mobile:conversations` | `{ conversations: Conversation[] }` | Sync conversations |
| `mobile:message-status` | `{ messageId, status }` | Update message status |

### Web → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `web:authenticate` | `{ sessionToken }` | Authenticate session |
| `web:send-message` | `{ phoneNumber, message, tempId }` | Send message |
| `web:mark-read` | `{ conversationId }` | Mark as read |
| `web:request-sync` | `{}` | Request data sync |

### Server → Clients

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticated` | `{ success, deviceId }` | Authentication result |
| `qr:paired` | `{ success }` | QR pairing result |
| `message:new` | `Message` | New message received |
| `message:status` | `{ messageId, status }` | Message status |
| `conversations:sync` | `{ conversations }` | Sync conversations |
| `messages:sync` | `{ messages }` | Sync messages |
| `mobile:disconnected` | `{}` | Mobile offline |
| `error` | `{ message }` | Error occurred |

## Security

### Authentication

1. **QR Code Pairing:**
   - Time-limited tokens (5 minutes)
   - One-time use
   - Encrypted in transit

2. **Session Management:**
   - JWT tokens with 30-day expiry
   - Stored securely (SecureStore on mobile, localStorage on web)
   - Automatic cleanup of expired sessions

3. **WebSocket Security:**
   - Session token verification
   - Device ID validation
   - Rate limiting (planned)

### Data Protection

- SMS data never stored on backend (privacy)
- Encrypted WebSocket connections (wss:// in production)
- CORS protection
- XSS protection with React
- Input validation on all endpoints

## Scalability Considerations

### Current Architecture

- Single backend instance
- In-memory WebSocket connections
- MongoDB for persistence

### Scaling Strategy

1. **Horizontal Scaling:**
   - Use Redis for WebSocket state sharing
   - Implement Socket.IO Redis adapter
   - Load balancer with sticky sessions

2. **Database Scaling:**
   - MongoDB replica set for high availability
   - Indexes on frequently queried fields
   - Implement caching layer (Redis)

3. **Message Queue:**
   - Implement message queue (RabbitMQ/Redis)
   - Async processing for heavy operations
   - Better fault tolerance

## Performance Optimization

### Mobile App

- Lazy loading of conversations
- Virtual scrolling for large message lists
- Image compression for MMS
- Background sync optimization

### Backend

- Connection pooling for MongoDB
- Gzip compression for API responses
- Rate limiting
- WebSocket ping/pong for connection health

### Web App

- Code splitting with React.lazy
- Memoization of expensive computations
- Virtual scrolling for conversations
- Service worker for offline support (planned)

## Monitoring & Logging

### Metrics to Track

- Active WebSocket connections
- Message throughput
- API response times
- Error rates
- Database query performance

### Logging

- Structured logging (JSON format)
- Log levels (error, warn, info, debug)
- Separate logs per service
- Log rotation and archival

## Deployment Architecture

### Development

```
Local Machine
├── MongoDB (local)
├── Backend (localhost:3000)
├── Web (localhost:5173)
└── Mobile (Expo Dev)
```

### Production

```
Cloud Infrastructure
├── MongoDB Atlas (Cloud DB)
├── Backend (Railway/Render)
├── Web (Vercel/Netlify)
└── Mobile (Play Store APK)
```

## Future Enhancements

1. **Multi-device support:**
   - Multiple web sessions per device
   - Tablet/desktop apps

2. **Advanced features:**
   - Group messaging
   - Media messages (MMS)
   - Voice messages
   - Message encryption (E2E)

3. **Performance:**
   - Message caching
   - Offline support
   - Background sync

4. **User experience:**
   - Rich text formatting
   - Emoji picker
   - Typing indicators
   - Read receipts

## Technology Decisions

### Why Expo?

- Cross-platform development
- Easy native module access
- Over-the-air updates
- Great developer experience

### Why Socket.IO?

- Real-time bidirectional communication
- Automatic reconnection
- Room support for multi-device
- Fallback to long-polling

### Why MongoDB?

- Flexible schema
- Easy to scale
- Good performance for document storage
- Native JSON support

### Why Material-UI?

- Comprehensive component library
- Consistent design system
- Accessibility built-in
- Good documentation

## Conclusion

This architecture provides:
- ✅ Real-time message synchronization
- ✅ Scalable WebSocket infrastructure
- ✅ Clean separation of concerns
- ✅ Easy to maintain and extend
- ✅ Production-ready foundation
