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

## AWS Deployment Sequence

## 1) Create RDS PostgreSQL and Security Groups

1. Create RDS PostgreSQL instance (or Aurora PostgreSQL).
2. Create security group `mindweave-rds-sg`:
- inbound `5432` from backend security group only.
3. Create backend/app security group `mindweave-app-sg`.
4. Set RDS to private subnets if possible.

## 2) Prisma + Postgres Configuration

Already done in this repo:
- Prisma datasource provider switched to `postgresql`.

Set runtime `DATABASE_URL` to your RDS connection string.

## 3) Run Migrations in Target Environment

In deployed backend container/instance:

```bash
npm run db:deploy
```

Seed think tanks once (optional per environment):

```bash
npm run db:seed
```

## 4) Containerize Backend and Deploy (ECS or Elastic Beanstalk)

Backend Docker artifacts are included:
- `backend/Dockerfile`
- `backend/.dockerignore`

### ECS Fargate path (recommended)

1. Create ECR repo:

```bash
aws ecr create-repository --repository-name mindweave-backend
```

2. Build and push image:

```bash
cd backend
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t mindweave-backend .
docker tag mindweave-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/mindweave-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/mindweave-backend:latest
```

3. Create ECS task definition using that image.
4. Inject secrets/env vars from Secrets Manager.
5. Run ECS service behind an Application Load Balancer.

### Elastic Beanstalk path (simpler)

1. Use Docker platform in Beanstalk.
2. Point app to `backend/Dockerfile`.
3. Configure environment variables/secrets.

## 5) Deploy Frontend to S3 + CloudFront

1. Build frontend:

```bash
cd frontend
npm install
npm run build
```

2. Upload `frontend/dist` to S3 static bucket.
3. Create CloudFront distribution with S3 as origin.
4. Configure `VITE_API_BASE_URL` before build using `frontend/.env.production.example`.

Example value:

```env
VITE_API_BASE_URL="https://api.your-domain.com/api"
```

## 6) Store Secrets in AWS Secrets Manager

Store these keys:
- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CORS_ORIGIN`

Grant ECS/Beanstalk IAM role permissions to read only required secrets.

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

- Use `npm run db:deploy` in production, not `prisma migrate dev`.
- Restrict CORS in production to your CloudFront/custom domain.
- Keep RDS private and only reachable from backend services.
- Rotate secrets regularly.
