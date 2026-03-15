# MindWeave Changelog

This changelog captures the implementation history from the start of this project session through the most recent deployment.

## Scope and Notes
- This document tracks feature-level and infrastructure-level changes.
- Dates use local session chronology and deployment timestamps.
- Where exact commit SHAs were not created, entries are grouped by delivery phase.

---

## 2026-03-15 — Phase 1: Core Product Foundations

### Added: Authentication and Identity
- Added user registration endpoint with email, username, password validation.
- Added secure password hashing with bcrypt.
- Added login endpoint with credential verification.
- Added JWT issuance and 7-day token expiry.
- Added auth middleware to protect API routes.
- Added frontend session handling via localStorage token and user object.

### Added: User Personalization
- Added username support and persistence.
- Added profile endpoint for gamification stats.
- Added user-level metadata storage (level, badges, tags).

### Added: Journaling and AI Reframing
- Added journal entry creation endpoint.
- Added framework selector support: cbt, iceberg, growth.
- Added AI reframing integration via Gemini API.
- Added tag extraction from user entries.
- Added history listing and entry detail endpoints.

### Added: Think Tanks and Group Chat
- Added think tank listing and detail endpoints.
- Added membership join flow with capacity controls.
- Added available-think-tank matching based on user tags.
- Added think tank messages endpoint with membership checks.
- Added bot-assisted chat reply generation in group rooms.

### Added: Gamification
- Added level calculation logic.
- Added badge accrual logic.
- Added cumulative tag profile updates from entries.

---

## 2026-03-15 — Phase 2: AWS Readiness Refactor

### Changed: Database Target
- Changed Prisma datasource provider from sqlite to postgresql.
- Updated deployment approach to support RDS production target.

### Added: Backend Deployment Scripts
- Added npm script db:deploy for Prisma migrate deploy.
- Added npm script db:generate for Prisma client generation.

### Changed: CORS Configuration
- Replaced fixed CORS logic with CORS_ORIGIN environment-based logic.
- Enabled production restriction to CloudFront domain.

### Changed: Frontend API Base
- Unified frontend API calls on API_BASE_URL abstraction.
- Added support for VITE_API_BASE_URL production override.
- Kept /api fallback for local proxy routing.

### Added: Containerization Assets
- Added backend Dockerfile (multi-stage build).
- Added backend .dockerignore.
- Added backend .env.example template.
- Added frontend .env.production.example template.

### Added: Documentation Baseline
- Rewrote root README with AWS deployment runbook.

---

## 2026-03-15 — Phase 3: AWS Infrastructure Provisioning

### Added: VPC and Network Controls
- Identified and used VPC vpc-035bcc2bc144d1522.
- Created application security group mindweave-app-sg.
- Created database security group mindweave-rds-sg.
- Created DB subnet group mindweave-db-subnet-group.

### Added: Production Database
- Provisioned RDS PostgreSQL instance mindweave-postgres (16.13, db.t4g.micro).
- Established DB endpoint and connectivity via SG rules.

### Added: Secrets Management
- Created Secrets Manager secret mindweave/prod/rds-master.
- Created Secrets Manager secret mindweave/prod/app.
- Corrected secret JSON formatting and validated structure.

### Added: Data Initialization
- Pushed schema to RDS with Prisma db push.
- Seeded six think tanks.

### Added: Frontend Hosting
- Created S3 bucket mindweave-frontend-140023398409-20260315213625.
- Uploaded built frontend assets.
- Created CloudFront distribution E1IH3MH6OBUQU.
- Verified frontend URL availability over HTTPS.

### Added: Backend Hosting
- Created Elastic Beanstalk app mindweave-backend.
- Created environment mindweave-backend-prod.
- Added root health route for ALB health checks.
- Resolved packaging compatibility for Linux deploy target.

### Added: IAM Dependencies
- Created aws-elasticbeanstalk-ec2-role instance profile.
- Created aws-elasticbeanstalk-service-role.

### Security Hardening
- Restricted DB ingress to SG sources only.
- Removed temporary CIDR access after deployment.

### Validation
- Completed end-to-end smoke tests: register, auth, thinktanks.
- Confirmed full path: CloudFront -> S3 -> Beanstalk -> RDS.

---

## 2026-03-15 — Phase 4: Production Connectivity Fix

### Fixed: Mixed Content API Failures
- Diagnosed production issue where HTTPS frontend called HTTP backend directly.
- Added CloudFront backend origin for Beanstalk endpoint.
- Added /api/* cache behavior in CloudFront routing.
- Forwarded Authorization header and disabled API caching.
- Rebuilt frontend with VITE_API_BASE_URL=/api.
- Invalidated CloudFront cache and verified /api/health.

### Result
- Entries/profile/think tanks fetch restored through CloudFront HTTPS API path.

---

## 2026-03-15 — Phase 5: Auth UX Upgrade + Password Reset Flow

### Added: New Branded Authentication UI
- Replaced plain auth card with full MindWeave-branded auth experience.
- Added product value panel, visual identity, and improved form interactions.
- Added inline forgot-password request UI in login mode.

### Added: Password Reset Backend
- Added POST /api/auth/forgot-password endpoint.
- Added POST /api/auth/reset-password endpoint.
- Added secure one-time reset token generation and SHA-256 token hashing.
- Added single-use and expiry enforcement (1-hour TTL).
- Added transaction-based password update and token invalidation.

### Added: Password Reset Database Model
- Added PasswordResetToken model in Prisma schema.
- Added relation from User to PasswordResetToken.
- Added indexes on userId and expiresAt.

### Added: Password Reset Frontend
- Added Reset Password page and route.
- Added token-from-query handling for reset link flow.
- Added password and confirm-password validation UX.

### Added: Email Sending Capability
- Added nodemailer dependency.
- Added SMTP and FRONTEND_BASE_URL environment variable support.

---

## 2026-03-15 — Phase 6: Latest Production Redeploy

### Backend Redeployed
- New Beanstalk version deployed: v20260315234654.
- Environment stabilized at Ready/Green.

### Frontend Redeployed
- New frontend build uploaded to S3.
- CloudFront invalidation completed.

### Database Updated
- Applied Prisma schema to production RDS.
- Verified PasswordResetToken table exists.

### Post-Deploy Runtime Status
- API health endpoint returns ok.
- Forgot-password endpoint works for non-existing emails (generic response).
- Forgot-password for existing users currently returns 500 until SMTP env vars are configured in Beanstalk.

---

## Follow-Up Items (Open)
- Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in Beanstalk.
- Optionally migrate Beanstalk backend to HTTPS custom domain + ACM.
- Optionally normalize Prisma migration history from sqlite legacy to clean PostgreSQL baseline.
