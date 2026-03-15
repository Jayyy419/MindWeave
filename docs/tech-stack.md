# MindWeave Tech Stack and Architecture Inventory

This document is a detailed inventory of all major technologies, runtime dependencies, infrastructure services, and configuration surfaces used in MindWeave.

## 1. Application Layers

## Frontend Layer
- Framework: React 18
- Language: TypeScript
- Build tool: Vite
- Routing: react-router-dom
- Styling: Tailwind CSS
- UI components: shadcn/ui primitives
- Icon library: lucide-react
- Runtime auth storage: localStorage
- Hosted as static assets on S3 + CloudFront

## Backend Layer
- Runtime: Node.js 20
- Framework: Express 4
- Language: TypeScript
- API style: JSON REST
- Auth: JWT bearer token validation
- Password hashing: bcryptjs
- Email transport: nodemailer
- AI integration: @google/generative-ai (Gemini)

## Data Layer
- ORM: Prisma 6
- Production database: PostgreSQL 16 on AWS RDS
- Local development database: file-based sqlite path in env (legacy local usage)
- Seed strategy: Prisma seed script for predefined think tanks

## Cloud Infrastructure Layer
- AWS account: 140023398409
- Region: ap-southeast-1
- Frontend hosting: S3 bucket + CloudFront CDN
- Backend hosting: Elastic Beanstalk (AL2023 / Node.js 20)
- Database: RDS PostgreSQL instance
- Secrets: AWS Secrets Manager
- Security boundaries: VPC + security groups

---

## 2. Frontend Dependency Breakdown

## Core
- react
- react-dom
- typescript
- vite

## Navigation and State
- react-router-dom
- context-based auth state in UserContext

## Styling and UI
- tailwindcss
- postcss
- shadcn/ui component set
- lucide-react icons

## Frontend Runtime Environment Variables
- VITE_API_BASE_URL
  - Local typical value: omitted (falls back to /api)
  - Production value: /api when CloudFront /api behavior is configured

---

## 3. Backend Dependency Breakdown

## Core runtime
- express
- cors
- dotenv

## Auth and security
- jsonwebtoken
- bcryptjs

## ORM and database
- prisma
- @prisma/client

## AI integration
- @google/generative-ai

## Email
- nodemailer

## TypeScript and tooling
- typescript
- tsx
- @types/* packages for node, express, jwt, cors, bcryptjs, nodemailer

## Backend Environment Variables

## Required for core app
- DATABASE_URL
- JWT_SECRET
- GEMINI_API_KEY
- CORS_ORIGIN
- PORT

## Required for password reset links
- FRONTEND_BASE_URL

## Required for forgot-password email send
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

---

## 4. API Surface Overview

## Public auth routes
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

## Authenticated user routes
- POST /api/entries
- GET /api/entries
- GET /api/entries/:id
- GET /api/user/profile

## Authenticated think tank routes
- GET /api/thinktanks
- GET /api/thinktanks/available
- GET /api/thinktanks/:id
- POST /api/thinktanks/:id/join
- GET /api/thinktanks/:id/messages
- POST /api/thinktanks/:id/messages

## Health routes
- GET /
- GET /api/health

---

## 5. Data Model Inventory

## User
- Identity: email, username
- Auth: passwordHash
- Profile: level, badges, tags
- Relations: entries, memberships, messages, resetTokens

## PasswordResetToken
- Fields: tokenHash, expiresAt, usedAt
- Security: raw token never stored in DB
- Constraints: unique tokenHash, indexed by userId and expiresAt

## Entry
- Stores original text, reframed text, framework, tags

## ThinkTank
- Predefined communities with tags and maxMembers

## Membership
- User to think tank join table

## Message
- Group chat messages for users and bot

---

## 6. AWS Resource Inventory

## Networking
- VPC: vpc-035bcc2bc144d1522
- App SG: sg-0a91fbfafabcbce97
- RDS SG: sg-03f94675295dac4af

## Database
- RDS instance: mindweave-postgres
- Endpoint: mindweave-postgres.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com

## Backend Hosting
- Beanstalk app: mindweave-backend
- Beanstalk env: mindweave-backend-prod
- CNAME: mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com

## Frontend Hosting
- S3 bucket: mindweave-frontend-140023398409-20260315213625
- CloudFront distribution id: E1IH3MH6OBUQU
- CloudFront domain: d1n2io4499e5zf.cloudfront.net

## Secrets
- mindweave/prod/rds-master
- mindweave/prod/app

---

## 7. Deployment and Runtime Topology

Browser (HTTPS)
-> CloudFront
-> S3 for static frontend assets
-> CloudFront behavior /api/* to backend origin
-> Elastic Beanstalk app
-> Prisma
-> RDS PostgreSQL

This topology avoids browser mixed-content issues by ensuring API calls stay on CloudFront HTTPS while backend origin can remain HTTP behind CloudFront routing.

---

## 8. Known Constraints and Operational Notes

- Forgot-password endpoint requires SMTP variables in production. If missing, existing-user reset requests return 500.
- Prisma migration history originated from sqlite and production initialization used db push for provider transition speed.
- CloudFront cache invalidation is required after each frontend asset deploy.
- Beanstalk deployment packaging on Windows should use tar-generated zip for Linux-compatible paths.
