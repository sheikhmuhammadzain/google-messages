# PostgreSQL Quick Start Guide

This guide helps you set up PostgreSQL for the Google Messages clone project.

## Option 1: Docker (Recommended - Easiest)

### Step 1: Start PostgreSQL Container

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

PostgreSQL will be available at:
- **Host:** localhost
- **Port:** 5432
- **Database:** google_messages
- **User:** postgres
- **Password:** postgres

### Step 2: Setup Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

✅ Done! Skip to "Verify Setup" section.

---

## Option 2: Local Installation

### Windows

**Method A: PostgreSQL Installer**
1. Download from https://www.postgresql.org/download/windows/
2. Run installer (keep default settings)
3. Remember the password you set for `postgres` user
4. Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

**Method B: Chocolatey**
```powershell
choco install postgresql
```

**Create Database:**
```powershell
# Open PowerShell as Administrator
psql -U postgres
```
```sql
CREATE DATABASE google_messages;
\q
```

### macOS

**Using Homebrew:**
```bash
# Install PostgreSQL
brew install postgresql@16

# Start service
brew services start postgresql@16

# Create database
createdb google_messages
```

### Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database
sudo -u postgres psql
```
```sql
CREATE DATABASE google_messages;
\q
```

### Configure Connection

Update `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/google_messages?schema=public
```

---

## Option 3: Cloud PostgreSQL (Production)

### Supabase (Free Tier)

1. Go to https://supabase.com/
2. Create account and new project
3. Copy connection string from Settings → Database
4. Update `.env`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
```

### Neon (Serverless PostgreSQL)

1. Go to https://neon.tech/
2. Create account and project
3. Copy connection string
4. Update `.env`:
```env
DATABASE_URL=postgresql://[user]:[password]@[hostname]/[database]?sslmode=require
```

### Railway

1. Go to https://railway.app/
2. Create new project → Add PostgreSQL
3. Copy DATABASE_URL from Variables tab
4. Update `.env` with the URL

### Render

1. Go to https://render.com/
2. New → PostgreSQL
3. Copy Internal Database URL
4. Update `.env` with the URL

---

## Setup Backend with PostgreSQL

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

Create `backend/.env`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-change-in-production
DATABASE_URL=postgresql://postgres:password@localhost:5432/google_messages?schema=public
CORS_ORIGIN=http://localhost:5173
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

This creates the Prisma Client with TypeScript types.

### Step 4: Run Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create database tables
- Generate migration files
- Update Prisma Client

### Step 5: Start Server

```bash
npm run dev
```

Expected output:
```
✅ Connected to PostgreSQL successfully
📊 PostgreSQL + Prisma ready
🚀 Google Messages Backend Server
📡 Server running on port: 3000
```

---

## Verify Setup

### 1. Check Database Connection

```bash
# Using Prisma Studio (GUI)
npx prisma studio
```

Opens at http://localhost:5555

### 2. Check Tables Created

**Using psql:**
```bash
psql -U postgres -d google_messages
```
```sql
\dt
-- Should show: devices, sessions, messages, conversations

SELECT * FROM devices;
\q
```

**Using Docker:**
```bash
docker exec -it google-messages-db psql -U postgres -d google_messages -c "\dt"
```

### 3. Test API

```bash
curl http://localhost:3000
```

Expected:
```json
{
  "success": true,
  "message": "Google Messages Backend API"
}
```

```bash
curl http://localhost:3000/api/auth/generate-qr
```

Should return QR data.

---

## Common PostgreSQL Commands

```bash
# Connect to database
psql -U postgres -d google_messages

# List databases
\l

# List tables
\dt

# Describe table
\d devices

# View data
SELECT * FROM devices;
SELECT * FROM sessions;

# Delete all data (DEV ONLY)
TRUNCATE devices, sessions CASCADE;

# Drop database (DEV ONLY)
DROP DATABASE google_messages;

# Create database
CREATE DATABASE google_messages;

# Exit
\q
```

---

## Prisma Commands

```bash
# Generate client (after schema changes)
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (DEV ONLY - deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema
npx prisma format

# Validate schema
npx prisma validate

# Pull existing database schema
npx prisma db pull

# Push schema without migrations (prototyping)
npx prisma db push
```

---

## Troubleshooting

### Issue: "Can't reach database server"

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows:
pg_ctl status

# Mac:
brew services list | grep postgresql

# Linux:
sudo systemctl status postgresql

# Docker:
docker-compose ps
```

### Issue: "Password authentication failed"

**Solution:**
- Check your DATABASE_URL has correct password
- For local PostgreSQL, you may need to update `pg_hba.conf`

### Issue: "Database does not exist"

**Solution:**
```bash
createdb google_messages
# or
psql -U postgres -c "CREATE DATABASE google_messages;"
```

### Issue: "Port 5432 already in use"

**Solution:**
```bash
# Find process using port
# Windows:
netstat -ano | findstr :5432

# Mac/Linux:
lsof -i :5432

# Stop existing PostgreSQL or use different port
```

### Issue: "@prisma/client not found"

**Solution:**
```bash
npm install
npx prisma generate
```

---

## Performance Tips

### 1. Connection Pooling

For production, use connection pooling:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

### 2. Indexes

Prisma automatically creates indexes on:
- `@id` fields
- `@unique` fields
- Fields in `@@index` directives

### 3. Query Optimization

Use Prisma's query optimization features:
```typescript
// Select specific fields
await prisma.device.findMany({
  select: { deviceId: true, deviceName: true }
});

// Use includes carefully
await prisma.device.findMany({
  include: { sessions: true }
});
```

---

## Security Best Practices

1. **Never commit `.env` file**
   - Use `.env.example` as template

2. **Use strong passwords**
   - Especially for production databases

3. **Enable SSL for production**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

4. **Restrict database access**
   - Use firewall rules
   - Whitelist specific IPs only

5. **Regular backups**
```bash
# Backup
pg_dump -U postgres google_messages > backup.sql

# Restore
psql -U postgres google_messages < backup.sql
```

---

## Next Steps

1. ✅ PostgreSQL installed and running
2. ✅ Backend connected to database
3. ✅ Migrations applied
4. 📱 Continue with mobile app setup
5. 🌐 Continue with web app setup

See `MIGRATION_GUIDE_POSTGRESQL.md` for detailed information.

---

## Resources

- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase PostgreSQL Guide](https://supabase.com/docs/guides/database)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)
