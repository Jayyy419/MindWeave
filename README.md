# MindWeave

MindWeave is an AI-enhanced journaling and group reflection app with:
- personal journal reframing (CBT, Iceberg, Growth)
- gamification (level and badges)
- think tanks (group matching)
- authenticated group chat with AI facilitator responses

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Node.js, TypeScript, Express, Prisma
- Database: PostgreSQL (AWS RDS/Aurora ready)
- AI: Google Gemini API

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL (local Docker/Postgres app or AWS RDS)
- Gemini API key

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` values.

Run migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

Start backend:

```bash
npm run dev
```

Backend runs on `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Core API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Journal

- `POST /api/entries`
- `GET /api/entries`
- `GET /api/entries/:id`

### User

- `GET /api/user/profile`

### Think Tanks

- `GET /api/thinktanks`
- `GET /api/thinktanks/available`
- `GET /api/thinktanks/:id`
- `POST /api/thinktanks/:id/join`

### Chat

- `GET /api/thinktanks/:id/messages`
- `POST /api/thinktanks/:id/messages`

Authenticated endpoints expect `Authorization: Bearer <token>`.

## AWS Deployment (Current)

All services run in **ap-southeast-1** (Singapore). Every resource is tagged `Project=MindWeave`.

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | AWS Amplify | `https://main.d2yypbdshi15os.amplifyapp.com` |
| Backend | AWS App Runner (ECR image) | `https://nvzq43knz6.ap-southeast-1.awsapprunner.com` |
| Database | Amazon RDS PostgreSQL 16 | `mindweave-db.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com` |
| Container Registry | Amazon ECR | `140023398409.dkr.ecr.ap-southeast-1.amazonaws.com/mindweave-backend` |
| CI/CD (backend) | AWS CodeBuild | Project: `mindweave-backend-build` |

### Backend Redeployment

1. Make code changes in `backend/`.
2. Package and upload to S3, then trigger CodeBuild to build and push Docker image to ECR.
3. Deploy the new image to App Runner:

```bash
aws apprunner start-deployment --service-arn <service-arn> --region ap-southeast-1
```

### Frontend Redeployment

1. Build locally: `cd frontend && npm run build`
2. Zip `frontend/dist` and deploy to Amplify via `create-deployment` + `start-deployment` API.

Alternatively, connect Amplify to the GitHub repo for auto-deploys on push.

## Production Env Variables

Backend expects:
- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CORS_ORIGIN`
- `PORT` (optional, default `3001`)

Frontend build expects:
- `VITE_API_BASE_URL`

## Deployment Notes

- The Dockerfile runs `prisma db push` on container startup to sync the schema.
- Demo mode is enabled via `DEMO_MODE=true` env var on App Runner.
- Frontend `.env.production` must point to the App Runner backend URL.
- Restrict CORS in production to your CloudFront/custom domain.
- Keep RDS private and only reachable from backend services.
- Rotate secrets regularly.
