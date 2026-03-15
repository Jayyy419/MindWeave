# MindWeave — Local Development Guide

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x |
| npm | 9.x |
| Git | any recent version |

No Docker or AWS credentials are needed for local development. The backend uses a local **SQLite** database by default.

---

## Repository Structure

```
MindWeave_App/
  backend/    ← Express + Prisma + TypeScript API server
  frontend/   ← React + Vite SPA
  docs/       ← Project documentation
  README.md
```

---

## Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env
```

Edit `backend/.env`:

```env
# SQLite for local dev (no RDS needed)
DATABASE_URL="file:./prisma/dev.db"

PORT=3001
JWT_SECRET="any-local-secret-you-choose"
GEMINI_API_KEY="your-google-gemini-api-key"

# Leave blank or "*" for local dev — CORS is unrestricted
CORS_ORIGIN="*"
```

> **Getting a Gemini API key:** Visit [Google AI Studio](https://makersuite.google.com/app/apikey), sign in, and create a key. The free tier is sufficient for development.

```bash
# Push the Prisma schema to the local SQLite database
npx prisma db push

# Seed the 6 built-in think tanks
npx tsx prisma/seed.ts

# Start the dev server (auto-restarts on file changes)
npm run dev
```

The backend listens on `http://localhost:3001`.

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend listens on `http://localhost:5173`.

The Vite dev server is configured to **proxy** all `/api` requests to `http://localhost:3001`, so the frontend talks to the local backend automatically without any extra configuration.

---

## Running Both Together

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend**
```bash
cd frontend && npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite: `file:./prisma/dev.db`  PostgreSQL: full connection string |
| `JWT_SECRET` | Yes | Any random string; used to sign auth tokens |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |
| `PORT` | No | HTTP port (default: `3001`) |
| `CORS_ORIGIN` | No | Allowed CORS origin; `*` allows all (default in dev) |

### Frontend (`frontend/.env` or `frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Full backend URL (e.g. `http://localhost:3001/api`). Falls back to `/api` (Vite proxy) if unset. |

In local development you typically do **not** need `VITE_API_BASE_URL` — the Vite proxy handles it.

---

## Useful NPM Scripts

### Backend

| Script | Command | Description |
|---|---|---|
| `dev` | `tsx watch src/index.ts` | Start dev server with hot reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/index.js` | Run compiled production build |
| `db:migrate` | `prisma migrate dev` | Create and apply a new migration |
| `db:deploy` | `prisma migrate deploy` | Apply pending migrations (production) |
| `db:generate` | `prisma generate` | Regenerate Prisma client |
| `db:seed` | `tsx prisma/seed.ts` | Seed the database with initial think tanks |
| `db:studio` | `prisma studio` | Open Prisma Studio GUI at port 5555 |

### Frontend

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start Vite dev server |
| `build` | `vite build` | Build production bundle to `dist/` |
| `preview` | `vite preview` | Preview the production build locally |

---

## Testing the API Locally

You can test the backend with any HTTP client (`curl`, Postman, etc.) or a PowerShell snippet:

```powershell
# Register
$BODY = '{"email":"dev@test.com","username":"devuser","password":"password123"}'
$R = Invoke-RestMethod -Uri http://localhost:3001/api/auth/register `
     -Method POST -Body $BODY -ContentType "application/json"
$TOKEN = $R.token

# Create a journal entry
$ENTRY = '{"text":"I always mess up presentations.","framework":"cbt"}'
Invoke-RestMethod -Uri http://localhost:3001/api/entries `
  -Method POST -Body $ENTRY -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
```

---

## Switching to PostgreSQL Locally (Optional)

If you want to test against a local PostgreSQL instance:

1. Install PostgreSQL and create a database:
   ```sql
   CREATE DATABASE mindweave;
   CREATE USER mindweave_user WITH PASSWORD 'localpass';
   GRANT ALL PRIVILEGES ON DATABASE mindweave TO mindweave_user;
   ```

2. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://mindweave_user:localpass@localhost:5432/mindweave?schema=public"
   ```

3. Push the schema:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

> The Prisma schema (`backend/prisma/schema.prisma`) uses `provider = "postgresql"`. SQLite works locally because Prisma 6 supports the `file:` scheme for local file-based databases through the SQLite provider. If you switch to PostgreSQL locally, there is no config change needed in the schema beyond the `DATABASE_URL`.

> **Note:** The current `schema.prisma` specifies `provider = "postgresql"`. To use SQLite, you would need to temporarily change this. For simplicity, most contributors use the PostgreSQL provider even locally with a Docker Postgres instance, or keep the `DATABASE_URL=file:./prisma/dev.db` with SQLite on a separate branch.

---

## Common Issues

### `GEMINI_API_KEY` not set
AI features (reframing, tag extraction, bot replies) will fail with a 500 error. Make sure the key is in `backend/.env`.

### Port already in use
```bash
# Kill whatever is on port 3001
npx kill-port 3001
```

### Prisma client out of sync after schema changes
```bash
cd backend
npx prisma generate
```

### Frontend shows blank page or auth errors
Ensure the backend is running. Check the browser console for network errors. The Vite proxy only applies during `npm run dev` — if you run `npm run preview`, you need `VITE_API_BASE_URL` set.
