# MindWeave — System Architecture

## Overview

MindWeave is a mental-wellness journaling application that uses AI to reframe negative thoughts into constructive perspectives. Users write journal entries, choose a cognitive framework, receive an AI-reframed version, and can collaborate with matched peers inside themed discussion groups called **Think Tanks**.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                       User Browser                       │
│          React 18 + TypeScript SPA (Vite build)          │
└───────────────────┬──────────────────────────────────────┘
                    │  HTTPS
                    ▼
┌──────────────────────────────────────────────────────────┐
│  AWS CloudFront CDN  ←── S3 Bucket (static files)        │
│  d1n2io4499e5zf.cloudfront.net                           │
└───────────────────┬──────────────────────────────────────┘
                    │  API requests  (VITE_API_BASE_URL)
                    ▼
┌──────────────────────────────────────────────────────────┐
│  AWS Elastic Beanstalk  (Node.js 20 / Amazon Linux 2023) │
│  mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1      │
│  .elasticbeanstalk.com                                   │
│                                                          │
│  Express 4  ──►  Prisma ORM  ──►  PostgreSQL             │
│              ──►  Google Gemini API (AI reframing)        │
└───────────────────┬──────────────────────────────────────┘
                    │  port 5432 (SG-restricted)
                    ▼
┌──────────────────────────────────────────────────────────┐
│  AWS RDS PostgreSQL 16.13  (db.t4g.micro)                │
│  mindweave-postgres.cd0g6meus64n.ap-southeast-1          │
│  .rds.amazonaws.com                                      │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js 20, Express 4, TypeScript |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 (local SQLite in dev) |
| AI | Google Gemini API (`@google/generative-ai`) |
| Auth | JWT (jsonwebtoken) + bcrypt password hashing |
| Hosting — Frontend | AWS S3 + CloudFront |
| Hosting — Backend | AWS Elastic Beanstalk |
| Database — Prod | AWS RDS PostgreSQL |
| Secrets | AWS Secrets Manager |

---

## Component Breakdown

### Frontend (`/frontend`)

```
src/
  pages/          ← One file per route/screen
    AuthPage.tsx           Register / login form
    HomePage.tsx           Dashboard after login
    ThinkTanksPage.tsx     Browse all think tanks
    ThinkTankDetailPage.tsx Group chat + member list
    HistoryPage.tsx        User's past journal entries
    EntryDetailPage.tsx    Single entry view
    ProfilePage.tsx        Gamification stats
  components/     ← Reusable UI components
  context/        ← React context (auth state)
  services/
    api.ts         ← All backend calls (fetch wrappers)
  lib/            ← Utility helpers
```

API calls are centralised in `api.ts`. The base URL is driven by the `VITE_API_BASE_URL` environment variable (set at build time for production; falls back to `/api` in dev via the Vite proxy).

### Backend (`/backend`)

```
src/
  index.ts          ← Express app bootstrap, middleware, route mounting
  middleware/
    auth.ts          ← JWT Bearer token verification
  routes/
    auth.ts          ← POST /api/auth/register, POST /api/auth/login
    entries.ts       ← POST /api/entries, GET /api/entries, GET /api/entries/:id
    thinktanks.ts    ← GET /api/thinktanks, GET /api/thinktanks/available,
                        POST /api/thinktanks/:id/join, GET /api/thinktanks/:id/messages,
                        POST /api/thinktanks/:id/messages
    user.ts          ← GET /api/user/profile
  services/
    gemini.ts        ← Gemini API calls (reframe text, extract tags, bot replies)
    gamification.ts  ← Level + badge update logic
prisma/
  schema.prisma     ← DB models
  seed.ts           ← Seeds 6 think tanks
```

### AI Integration

All AI work is routed through `services/gemini.ts`:

| Function | Trigger | Purpose |
|---|---|---|
| `reframeText(text, framework)` | New journal entry | Rewrites thought using chosen cognitive model |
| `extractTags(text)` | New journal entry | Extracts 1–5 topic tags for matching |
| `generateChatBotReply(messages, tankName)` | Think tank message | Posts an empathetic bot reply |

Framework options:
- `cbt` — Cognitive Behavioural Therapy (challenge distortions)
- `iceberg` — Surface belief → underlying core belief
- `growth` — Fixed mindset → growth mindset reframe

### Authentication

- Registration: email + username + password → bcrypt hash stored in DB → JWT returned
- Login: email + password → bcrypt compare → JWT returned
- All protected routes require `Authorization: Bearer <token>` header
- JWT is stored in `localStorage` on the frontend under key `mindweave-auth-token`
- Token validity: 7 days

### Gamification

Tracked per user:
- **Level**: increments every 5 entries
- **Badges**: unlocked at milestone entry counts (1st, 5th, 10th, 25th, 50th)
- **Tags**: accumulated from all entries; used for think tank matching

Think tank matching unlocks after 3+ entries and requires at least 1 overlapping tag between user and tank.

---

## Data Flow — Journal Entry

```
User types text + picks framework
         │
         ▼
POST /api/entries  (JWT in header)
         │
         ├─► Gemini: reframeText()   ─► reframed text
         ├─► Gemini: extractTags()   ─► tag array
         │
         ▼
Prisma: create Entry row
         │
         ▼
updateUserGamification()  ─► update level/badges/tags
         │
         ▼
Return { id, reframedText, tags, ... } → frontend
```

## Data Flow — Think Tank Chat

```
User sends message in chat
         │
         ▼
POST /api/thinktanks/:id/messages  (JWT in header)
         │
         ├─► Save user message to DB
         │
         └─► Gemini: generateChatBotReply()  (last 10 messages as context)
                  │
                  ▼
             Save bot message to DB
                  │
                  ▼
         Return [ userMessage, botMessage ]
```

---

## Security Notes

- Passwords are never stored in plaintext — always bcrypt-hashed (cost factor 10)
- JWT secret is loaded from environment; never hardcoded in production
- CORS origin is restricted to the CloudFront domain via `CORS_ORIGIN` env var in production
- RDS security group only allows inbound port 5432 from the Beanstalk instance security group — no public access
- All production secrets (DB password, JWT secret, Gemini API key) are stored in AWS Secrets Manager
