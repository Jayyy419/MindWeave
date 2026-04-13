# MindWeave Changelog

This changelog captures the implementation history from the start of this project session through the most recent deployment.

## 2026-04-14 — AWS Migration (App Runner + Amplify) and Demo Mode

### Infrastructure Migration
- Migrated backend from Elastic Beanstalk to **AWS App Runner** (ECR-based container deployment).
- Migrated frontend from S3 + CloudFront to **AWS Amplify** (manual deploy).
- Configured **AWS CodeBuild** (`mindweave-backend-build`) for Docker image builds pushed to ECR.
- Switched App Runner egress from VPC to DEFAULT to enable outbound internet access (Gemini API).
- Opened RDS security group for public access (database is password-protected, publicly accessible).
- Fixed Dockerfile: copies Prisma generated client from build stage to runtime stage.
- Changed startup command to `prisma db push --skip-generate --accept-data-loss` (bypasses SQLite migration lock mismatch).
- Fixed `migration_lock.toml` provider from `sqlite` to `postgresql`.
- Added `console.error` logging for Gemini API failures in `gemini.ts`.
- Applied SPA redirect rule on Amplify for React Router compatibility.
- Tagged all AWS resources with `Project=MindWeave` for billing tracking.

### Demo Mode
- Added frontend demo mode toggle (`frontend/src/config/demo.ts`) with 5-reframe limit using localStorage.
- Created `DemoLandingPage.tsx` as public entry point.
- Modified `HomePage.tsx` with demo guards: reframe counter, limit enforcement, save disabled.
- Modified `Navbar.tsx` to show DEMO MODE badge and hide auth-only navigation in demo mode.
- Modified `api.ts` to send `x-anonymous-id` header instead of JWT in demo mode.
- Added backend demo rate limiter (10 req/hr per IP) on `/api/entries/reframe-preview`.

### Documentation
- Updated root `README.md` with current AWS deployment architecture.
- Updated `docs/README.md` production URLs and AWS resource inventory.
- Updated `.gitignore` for AWS deployment artifacts.

### Production URLs
- Frontend: `https://main.d2yypbdshi15os.amplifyapp.com`
- Backend: `https://nvzq43knz6.ap-southeast-1.awsapprunner.com`

## 2026-03-22 - Phase 3 Governance, Admin Controls, and Deployment Hardening

### Backend Governance and Admin APIs
- Added governance service and runtime table-ensure support for:
	- AI audit logs
	- API cost ledger
	- Admin role assignments (RBAC scopes)
	- A/B experiments and assignments
- Added scope-aware admin authorization support so admin routes can be protected by explicit scopes.
- Added new Impact governance/admin endpoints:
	- `GET /api/impact/rbac/roles`
	- `POST /api/impact/rbac/roles`
	- `GET /api/impact/ab-tests`
	- `POST /api/impact/ab-tests`
	- `POST /api/impact/ab-tests/:id/assign`
	- `GET /api/impact/ab-tests/:id/summary`
	- `GET /api/impact/ai-audit-summary`
	- `GET /api/impact/cost-monitoring`
	- `GET /api/impact/evidence-pack`

### AI Governance Instrumentation
- Added AI audit and cost logging around journaling and think tank AI paths.
- Added input/output token estimation and cost computation using configurable environment rates:
	- `AI_INPUT_COST_PER_MILLION`
	- `AI_OUTPUT_COST_PER_MILLION`

### Frontend Admin Integration
- Extended Impact Hub to include governance panels for:
	- RBAC role assignment and listing
	- A/B experiment creation, assignment, and summary
	- AI audit summary metrics
	- Cost monitoring metrics and breakdowns
	- Evidence pack CSV export
- Added matching typed API client contracts for all new governance endpoints.

### Integration Smoke Coverage
- Expanded backend integration smoke checks to validate:
	- non-admin access receives `403` on protected governance endpoints
	- optional admin-success route checks when `TEST_ADMIN_TOKEN` is provided

### Deployment and Operations
- Resolved EB source-bundle rollout failures caused by Windows zip path separators by switching bundle creation to tar-generated zip archives.
- Deployed backend version `v20260322144515` to production and confirmed `/api/health` returns `200`.
- Set explicit production AI cost environment values:
	- `AI_INPUT_COST_PER_MILLION=0.15`
	- `AI_OUTPUT_COST_PER_MILLION=0.60`
- Deployed frontend and issued CloudFront invalidation `IAHNY2PHKWOCX21L6GT4DYMSFB`.

### Repository Cleanup
- Removed generated local deployment artifacts (`backend-deploy-*.zip`, including backend-local copies) and transient `eb-tail.log` from the workspace.

## 2026-03-22 — Impact Evidence, Safety Escalation, and Outreach Funnel

### AI Explainability and Safety Escalation
- Added explainability payloads to journaling reframe responses so users can see framework choice, cultural context usage, and processing steps.
- Added high-risk language detection to journal preview/save flows.
- Added a country-aware support resource directory and response payload for immediate escalation guidance.
- Added new support endpoint:
	- `GET /api/entries/support-resources?culturalFramework=<country>`

### Follow-Up Outcomes and Impact Tracking
- Added follow-up reminder computation for Day 7, Day 14, and Day 30 surveys.
- Added impact endpoint for due follow-up items:
	- `GET /api/impact/follow-up-reminders`
- Expanded impact dashboard aggregation to include outreach funnel totals.

### Learning Effectiveness Metrics
- Added learning assessment event ingestion for lesson-level scoring and pass/fail tracking.
- Added learning effectiveness analytics endpoint with score, pass rate, and outcome-correlation aggregates:
	- `GET /api/impact/learning-effectiveness`

### Outreach Campaign Funnel + Attribution
- Extended outreach campaigns with QR token and referral code generation.
- Added campaign share links (`qrUrl`, `referralUrl`) returned by campaign APIs.
- Added funnel stage counters on campaigns:
	- `funnelImpressions`
	- `funnelScans`
	- `funnelSignups`
	- `funnelActiveUsers`
	- `funnelCompletions`
- Added funnel increment endpoint:
	- `POST /api/impact/campaigns/:id/funnel`

### Frontend Product Surfaces Updated
- Learning Library now submits lesson assessment events on completion.
- Home page now surfaces AI explainability details and high-risk escalation resources.
- Impact Hub now shows follow-up reminders due, learning effectiveness metrics, and campaign funnel controls.

### Deployment Notes
- Frontend deployed to S3 and CloudFront invalidated (`I6SX4GGNT3HO74JMMB8F8ZHTCG`).
- Backend application version `v20260322043808` created and submitted to Elastic Beanstalk rollout queue.

## 2026-03-21 — Cultural Overlay in Settings + Learning Library

### Cultural Framework Experience
- Moved cultural framework selection out of the journal framework selector and into Settings as a persistent user preference.
- Kept journal framework selection focused on therapeutic models (`cbt`, `iceberg`, `growth`) for per-entry reframing intent.
- Added settings-level controls for:
	- preferred cultural context overlay
	- preferred cultural tone strength (`light`, `medium`, `strong`)
- Updated journal flow so therapeutic reframes can be culturally tuned using the user's saved cultural overlay.

### Cultural Context and Language Intelligence
- Expanded backend framework metadata with country-specific context anchors and local language markers.
- Added cultural overlay prompt instructions so the reframe model can:
	- interpret local references in the selected country context
	- inject light, natural local phrasing/slang without caricature
	- preserve readability and emotional safety
- Enabled explicit cultural context passing in entry preview/save APIs.

### Learning Library (New Feature)
- Added a new Learning Library product area and route (`/learning-library`).
- Added therapeutic framework learning tracks with lesson metadata and progress summaries.
- Added lesson detail views with objectives, estimated durations, and difficulty tags.
- Added lesson completion actions and progress refresh flows.

### Learning Progress and Gamification
- Added new `LearningLessonProgress` persistence model.
- Added backend learning APIs for:
	- listing framework tracks
	- fetching framework lesson details
	- marking lessons as completed
- Updated gamification calculations so completed lessons contribute to level progression and learning badges.
- Added learning-focused badges:
	- `Learning Explorer`
	- `CBT Learner`
	- `Iceberg Learner`
	- `Growth Learner`
	- `Mind Scholar`

### Navigation and UX
- Added Learning Library to top navigation.
- Added a journal sidebar summary card showing active cultural tuning from Settings, with link-back to Settings for changes.

## 2026-03-20 — Dedicated Consent Flow and Opportunities

### Opportunities and Competition Access
- Added a new Opportunities product area with dedicated routes and navigation.
- Seeded organiser-facing opportunity records for challenge, climate, and wellbeing pathways.
- Surfaced opportunity cards based on journaling activity, recurring tags, and profile level.

### Consent Flow
- Implemented explicit consent grant flow for opportunities instead of automatic profile sharing.
- Added selectable data scopes for organiser access:
	- profile basics
	- interest profile
	- reflection summary
	- selected journal excerpts
	- optional full journal access
- Added access duration selection and revocable consent records.
- Added live access-package preview so users can inspect what would be shared before granting consent.

### Settings and Privacy Controls
- Added Shared Access management inside Settings.
- Users can now review active and historical consent records and revoke access directly.

### Backend and Data Model
- Added `Opportunity` and `DataAccessConsent` Prisma models.
- Added backend opportunity APIs for:
	- listing surfaced opportunities
	- viewing a single opportunity
	- previewing consent-scoped access packages
	- granting consent
- Added user consent APIs for listing and revoking shared-access records.

## 2026-03-20 — Journal Replay, Faster Reframing, and Hidden Think Tanks

### Journal Writing Flow
- Added Enter-to-reframe behavior in the main journal editor so users can immediately commit a live reframe without waiting for the countdown.
- Preserved Shift+Enter for newline insertion while drafting.
- Persisted journal entry titles with each saved entry.
- Persisted chunk-level journal replay data so each saved entry can retain the exact block-by-block user text and live AI reframes shown during writing.

### Memory Lane
- Updated Memory Lane cards to show saved entry titles.
- Reworked Memory Lane detail view to replay saved journal chunks instead of only showing one flattened original text block.
- Added legacy fallback so older entries without chunk data still render correctly.

### Think Tanks
- Changed Think Tanks discovery to a stronger concealment model:
	- only joined tanks are shown directly
	- non-joined tanks appear as teaser cards
	- hidden tank dialogs no longer reveal real group names
- Added stronger unlock messaging that encourages continued journaling instead of exposing matching details.

### Layout and Density
- Reduced side whitespace across the main app shell and widened key pages including Journal, Memory Lane, Think Tanks, Profile, and Settings.

### Backend and Data Model
- Added `Entry.title` to support named journal entries.
- Added `Entry.chunks` to store chunk-level replay data as JSON.
- Updated entry create/list/detail APIs to return title and chunk replay data.

## 2026-03-20 — Product, UX, and Hosting Overhaul

### Journal UX and Writing Flow
- Removed draft-saved indicator above the journal title to reduce clutter.
- Added mood option `Other` and enabled deselect-on-second-click behavior for mood chips.
- Upgraded intention placeholder copy to professional wording.
- Added mood context info modal (mini `i` button) explaining purpose of mood and intention fields.
- Updated check-in summary copy to natural sentence flow:
	- Example: "I'm feeling hopeful today and want to process my thoughts."
- Added local subtitle persistence from mood/intention summary and surfaced subtitle in Memory Lane cards.
- Improved editor textarea behavior so it fills available writing area naturally.
- Reduced unintended homepage overflow/scroll by adjusting viewport height calculation.

### Settings and Account Management
- Fixed settings runtime rendering issue caused by empty string select item values by introducing a sentinel select value.
- Replaced JSON export with fully working PDF export for entries.
- Removed bottom logout button in settings.
- Right-aligned `Save Settings` action.
- Removed user-facing strict journal-only mode setting.
- Implemented account update workflows in settings:
	- Username change with live availability checking.
	- Email change with OTP send + verify before save.
	- Password change with current/new/repeat fields.
	- Dynamic password requirement checker added to settings (same pattern as signup).

### Auth and Routing Improvements
- Redesigned auth page into journal-themed UI aligned with product visual identity.
- Added registration-time dynamic password checklist (uppercase/lowercase/number/symbol/min length).
- Added registration-time live username availability checker.
- Fixed logout URL behavior so users are redirected to `/auth` instead of staying on prior protected path.
- Introduced explicit auth route handling:
	- Unauthenticated `/` redirects to `/auth`.
	- Authenticated `/auth` redirects to app root.

### Memory Lane URL Migration
- Migrated user-facing history routes from `/history` to `/memory-lane`.
- Added compatibility redirects from legacy `/history` routes.
- Updated navigation and page links to use `/memory-lane` and `/memory-lane/:id`.

### Think Tanks Product Controls
- Redesigned Think Tanks listing UI to match notebook/amber visual language used across Journal, Memory Lane, and Settings.
- Introduced lock-first discovery model:
	- Split into accessible groups and locked groups.
	- Locked groups are clickable but do not reveal exact unlock criteria.
	- Modal messaging explains criteria is intentionally hidden to discourage behavior engineering.

### Backend API Additions (Auth + User)
- Added public username availability endpoint in auth routes.
- Enforced stronger password policy on registration/reset flows (uppercase/lowercase/number/symbol + length).
- Added user account endpoints:
	- Check username availability for current user.
	- Update username.
	- Send email OTP for email change.
	- Verify email OTP and update email.
	- Change password with current password verification.

### Hosting and Deployment Changes
- Deployed repeated frontend releases to S3 + CloudFront with cache invalidations.
- Initialized Vercel project and deployed frontend production builds.
- Assigned custom Vercel alias:
	- `https://mindweave.vercel.app`
- Diagnosed and resolved Vercel 401 protection issue by disabling SSO protection via project API settings.
- Configured Vercel production builds to use HTTPS API base for frontend API calls.

### Backend Deployment Notes
- Backend code changes were built successfully locally.
- Elastic Beanstalk deployments repeatedly failed due source bundle/engine deployment issues and rolled back.
- Added Prisma CLI to backend production dependencies to reduce deployment-time runtime tool mismatch risk.
- Captured ongoing EB diagnostics as follow-up work.

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
