# Migration Guide: MongoDB → PostgreSQL + Prisma

This guide walks you through the complete migration from MongoDB to PostgreSQL with Prisma ORM.

## ✅ What Changed

### Database
- **Before:** MongoDB
- **After:** PostgreSQL 16 + Prisma ORM

### Key Changes
1. ✅ Replaced Mongoose with Prisma Client
2. ✅ Created Prisma schema with PostgreSQL
3. ✅ Updated all database queries to Prisma syntax
4. ✅ Modified Docker setup for PostgreSQL
5. ✅ Updated environment variables

## 📋 Prerequisites

### Install PostgreSQL

**Option A: Local Installation**

**Windows:**
```bash
# Using Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Option B: Docker (Recommended)**
```bash
# Already configured in docker-compose.yml
docker-compose up -d postgres
```

**Option C: Cloud (Recommended for Production)**
- [Supabase](https://supabase.com/) - Free tier with PostgreSQL
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Railway](https://railway.app/) - Easy deployment
- [Render](https://render.com/) - Managed PostgreSQL

## 🚀 Step-by-Step Migration

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `@prisma/client` - Prisma database client
- `prisma` - Prisma CLI (dev dependency)

### Step 2: Configure Environment

Update `backend/.env`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/google_messages?schema=public

# For Docker
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/google_messages?schema=public

# For Supabase
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# For Neon
# DATABASE_URL=postgresql://[user]:[password]@[hostname]/[database]?sslmode=require

CORS_ORIGIN=http://localhost:5173
```

### Step 3: Create Database

**If using local PostgreSQL:**
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE google_messages;

# Exit
\q
```

**If using Docker:**
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Database is automatically created
```

### Step 4: Generate Prisma Client

```bash
cd backend

# Generate Prisma Client from schema
npx prisma generate
```

This creates the Prisma Client in `node_modules/@prisma/client`.

### Step 5: Run Database Migrations

```bash
# Create and apply migrations
npx prisma migrate dev --name init

# This will:
# 1. Create migration files in prisma/migrations/
# 2. Apply migrations to database
# 3. Generate Prisma Client
```

### Step 6: Verify Database Schema

```bash
# Open Prisma Studio (Database GUI)
npx prisma studio
```

Browser opens at `http://localhost:5555` - verify tables are created:
- ✅ devices
- ✅ sessions
- ✅ messages (optional)
- ✅ conversations (optional)

### Step 7: Start Backend Server

```bash
cd backend
npm run dev
```

Expected output:
```
✅ Connected to PostgreSQL successfully
📊 PostgreSQL + Prisma ready
🚀 Google Messages Backend Server
📡 Server running on port: 3000
```

### Step 8: Test the Migration

**Test 1: Health Check**
```bash
curl http://localhost:3000
```

**Test 2: Generate QR Code**
```bash
curl http://localhost:3000/api/auth/generate-qr
```

**Test 3: Check Database**
```bash
# Using Prisma Studio
npx prisma studio

# Or using psql
psql -U postgres -d google_messages -c "SELECT * FROM devices;"
```

## 📊 Prisma Schema Overview

The Prisma schema is defined in `backend/prisma/schema.prisma`:

```prisma
// Device table (stores mobile devices)
model Device {
  id                  String    @id @default(uuid())
  deviceId            String    @unique
  deviceName          String
  deviceModel         String
  pairingToken        String?
  pairingTokenExpiry  DateTime?
  connectedAt         DateTime  @default(now())
  lastSeen            DateTime  @default(now())
  sessions            Session[]  // Relation to sessions
}

// Session table (stores web sessions)
model Session {
  id             String   @id @default(uuid())
  deviceId       String
  sessionToken   String   @unique
  connectedAt    DateTime @default(now())
  lastSeen       DateTime @default(now())
  expiresAt      DateTime
  device         Device   @relation(fields: [deviceId], references: [deviceId])
}

// Optional: Message history
model Message {
  id              String   @id @default(uuid())
  deviceId        String
  conversationId  String
  phoneNumber     String
  body            String
  timestamp       DateTime
  type            String
  status          String?
  read            Boolean  @default(false)
}

// Optional: Conversation tracking
model Conversation {
  id              String   @id @default(uuid())
  deviceId        String
  phoneNumber     String
  contactName     String?
  lastMessage     String
  lastMessageTime DateTime
  unreadCount     Int      @default(0())
}
```

## 🔄 Code Changes Summary

### 1. Database Configuration (`src/config/database.ts`)

**Before (MongoDB):**
```typescript
import mongoose from 'mongoose';
await mongoose.connect(mongoUri);
```

**After (Prisma):**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.$connect();
```

### 2. Auth Service (`src/services/AuthService.ts`)

**Before (Mongoose):**
```typescript
import Device from '../models/Device';
const device = await Device.findOne({ deviceId });
await device.save();
```

**After (Prisma):**
```typescript
import Database from '../config/database';
const prisma = Database.getClient();
const device = await prisma.device.findUnique({ where: { deviceId } });
await prisma.device.update({ where: { deviceId }, data: { ... } });
```

### 3. Models (Deprecated)

**Before:**
- `src/models/Device.ts` - Mongoose schema
- `src/models/Session.ts` - Mongoose schema

**After:**
- Models generated automatically by Prisma
- Import types: `import { Device, Session } from '@prisma/client';`

## 🛠️ Common Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (DEV ONLY - deletes all data)
npx prisma migrate reset

# Open Prisma Studio (DB GUI)
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from existing database
npx prisma db pull

# Push schema to database (prototyping)
npx prisma db push
```

## 🐳 Docker Setup

The `docker-compose.yml` is updated for PostgreSQL:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: google_messages
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Start everything:**
```bash
docker-compose up -d
```

## 🔍 Query Comparison

### Find One

**Mongoose:**
```typescript
await Device.findOne({ deviceId: 'abc' });
```

**Prisma:**
```typescript
await prisma.device.findUnique({ where: { deviceId: 'abc' } });
```

### Create

**Mongoose:**
```typescript
const device = new Device({ deviceId, deviceName });
await device.save();
```

**Prisma:**
```typescript
await prisma.device.create({
  data: { deviceId, deviceName }
});
```

### Update

**Mongoose:**
```typescript
device.lastSeen = new Date();
await device.save();
```

**Prisma:**
```typescript
await prisma.device.update({
  where: { deviceId },
  data: { lastSeen: new Date() }
});
```

### Delete

**Mongoose:**
```typescript
await Session.deleteMany({ expiresAt: { $lt: new Date() } });
```

**Prisma:**
```typescript
await prisma.session.deleteMany({
  where: { expiresAt: { lt: new Date() } }
});
```

### Find Many with Relations

**Prisma:**
```typescript
await prisma.device.findMany({
  where: { deviceName: { contains: 'Pixel' } },
  include: { sessions: true },
  orderBy: { lastSeen: 'desc' },
  take: 10
});
```

## 🚨 Troubleshooting

### Issue: "Can't reach database server"

**Solution:**
```bash
# Check PostgreSQL is running
# Linux/Mac:
pg_isready

# Windows:
pg_ctl status

# Or check Docker:
docker-compose ps
```

### Issue: "Migration failed"

**Solution:**
```bash
# Reset and re-run migrations (DEV ONLY)
npx prisma migrate reset
npx prisma migrate dev
```

### Issue: "@prisma/client not found"

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate
```

### Issue: "Schema parsing failed"

**Solution:**
```bash
# Validate and format schema
npx prisma validate
npx prisma format
```

### Issue: "Prisma Client is not generated"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npx prisma generate
```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Migrate Guide](https://www.prisma.io/docs/guides/migrate)

## ✅ Migration Checklist

- [ ] PostgreSQL installed and running
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env`)
- [ ] Database created
- [ ] Prisma Client generated (`npx prisma generate`)
- [ ] Migrations applied (`npx prisma migrate dev`)
- [ ] Backend server starts successfully
- [ ] API endpoints working
- [ ] QR authentication tested
- [ ] Device registration working
- [ ] Session management working

## 🎉 Migration Complete!

Your app is now running on **PostgreSQL + Prisma**!

**Benefits:**
- ✅ Type-safe database queries
- ✅ Auto-completion in IDE
- ✅ Built-in migration system
- ✅ Database GUI (Prisma Studio)
- ✅ Better performance for relational data
- ✅ ACID compliance
- ✅ Easier to scale

**Next Steps:**
1. Test all functionality
2. Update documentation
3. Deploy to production with cloud PostgreSQL
4. Set up automated backups
