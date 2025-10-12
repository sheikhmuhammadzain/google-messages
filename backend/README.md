# Google Messages Backend

Backend server for Google Messages clone with WebSocket support for real-time message synchronization.

## Features

- WebSocket server for real-time communication
- Device authentication and session management
- QR code-based pairing
- Message routing between mobile and web clients
- **PostgreSQL + Prisma ORM** for type-safe database operations

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DATABASE_URL=postgresql://postgres:password@localhost:5432/google_messages?schema=public
CORS_ORIGIN=http://localhost:5173
```

## Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Open Prisma Studio (Database GUI)
npx prisma studio
```

## Development

```bash
npm run dev
```

## Production

```bash
# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start
npm start
```

## API Documentation

### REST Endpoints

#### `GET /api/auth/generate-qr`
Generate QR code for pairing.

**Response:**
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

#### `POST /api/auth/wait-pairing`
Wait for mobile device to scan QR (long-polling).

**Request:**
```json
{
  "token": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionToken": "jwt-token"
  }
}
```

#### `POST /api/auth/verify`
Verify session token.

**Request:**
```json
{
  "sessionToken": "jwt-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-id"
  }
}
```

### WebSocket Events

#### Mobile Events

- `mobile:register` - Register mobile device
- `mobile:scan-qr` - Scan QR code for pairing
- `mobile:messages` - Send messages to web
- `mobile:conversations` - Send conversations to web
- `mobile:message-status` - Update message status

#### Web Events

- `web:authenticate` - Authenticate with session token
- `web:send-message` - Send message via mobile
- `web:mark-read` - Mark conversation as read
- `web:request-sync` - Request data sync

#### Broadcast Events

- `authenticated` - Authentication successful
- `qr:paired` - QR pairing successful
- `message:new` - New message received
- `message:status` - Message status updated
- `conversations:sync` - Conversations synchronized
- `messages:sync` - Messages synchronized
- `mobile:disconnected` - Mobile device disconnected
- `error` - Error occurred

## Prisma Schema

The database schema is defined in `prisma/schema.prisma`:

### Device Table
```prisma
model Device {
  id                  String    @id @default(uuid())
  deviceId            String    @unique
  deviceName          String
  deviceModel         String
  pairingToken        String?
  pairingTokenExpiry  DateTime?
  connectedAt         DateTime  @default(now())
  lastSeen            DateTime  @default(now())
  sessions            Session[]
}
```

### Session Table
```prisma
model Session {
  id             String   @id @default(uuid())
  deviceId       String
  sessionToken   String   @unique
  connectedAt    DateTime @default(now())
  lastSeen       DateTime @default(now())
  expiresAt      DateTime
  device         Device   @relation(fields: [deviceId], references: [deviceId])
}
```

### Optional Tables

**Message** - Store message history
**Conversation** - Track conversations

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

Set these in your hosting platform:

- `PORT` - Server port
- `NODE_ENV` - Environment (production)
- `JWT_SECRET` - Secret key for JWT
- `MONGODB_URI` - MongoDB connection string
- `CORS_ORIGIN` - Allowed CORS origin

## License

MIT
