# MindWeave Hosting and Stack Decisions (Objective)

This document explains why the current stack was chosen, how it compares with AWS Amplify hosting patterns, and when each option is the better fit.

## Executive Summary
- Current production architecture is intentionally split:
  - Frontend: S3 + CloudFront (static SPA delivery)
  - Backend API: Elastic Beanstalk (Node/Express long-running server)
  - Database: RDS PostgreSQL
- This choice optimized for speed-to-production with minimal refactor of an existing Express + Prisma app.
- Amplify is not worse. It is often easier for frontend-first delivery and CI/CD UX, but backend fit depends on architecture style.

---

## 1. Current Architecture at a Glance

User Browser (HTTPS)
-> CloudFront
-> S3 (React/Vite static files)
-> CloudFront behavior /api/*
-> Elastic Beanstalk (Express API)
-> Prisma
-> RDS PostgreSQL

### Why this architecture works for MindWeave
- Existing backend was already a traditional server process (Express), not serverless handlers.
- Existing ORM and DB shape (Prisma + PostgreSQL) fit naturally into VPC-attached compute.
- Needed direct control over CORS, ALB health checks, SG rules, and deployment packaging during fast iteration.

---

## 2. Why PostgreSQL (Objective Rationale)

## Product/data reasons
- MindWeave data is relational by nature:
  - users, entries, memberships, think tanks, messages, reset tokens
- Requires consistent joins and integrity constraints.
- Supports predictable querying for feed/profile/history scenarios.

## Operational reasons
- PostgreSQL on RDS provides mature backups, monitoring, and automated maintenance options.
- Easy to scale from small instance sizes to larger classes as traffic grows.
- Strong ecosystem support with Prisma.

## Compared to alternatives
- SQLite:
  - Great for local/dev, not ideal for concurrent production workloads.
  - Limited operational features for cloud-scale multi-user traffic.
- NoSQL-only approach:
  - Could work, but relationship-heavy access patterns become more complex.
  - More application-side consistency logic required.

## Why PostgreSQL specifically with Prisma
- Prisma supports robust schema modeling and type-safe client generation.
- PostgreSQL provides strong transactional behavior for auth, message writes, and token lifecycle logic.
- Smooth path for future features: analytics queries, indexing, reporting, potential full-text search extensions.

---

## 3. Why Elastic Beanstalk for Backend

## Technical fit
- Beanstalk directly runs Node/Express apps without rewriting to serverless patterns.
- Good fit for long-lived API server behavior and familiar deployment mental model.
- ALB health checks, autoscaling policies, and environment variables are straightforward.

## Delivery fit
- Faster migration path from local Express app to production than re-architecting.
- Allowed immediate reuse of existing API routes and middleware stack.
- Reduced implementation risk during deadlines.

## Control and troubleshooting fit
- Easy to inspect deployment events, logs, and environment status.
- Directly configurable networking (VPC + SG interactions with RDS).
- Clear rollback path by app version labels.

---

## 4. Why S3 + CloudFront for Frontend

## Technical fit
- Vite build outputs static assets, ideal for object storage + CDN.
- CloudFront gives global caching, HTTPS delivery, and invalidation control.

## Security and routing fit
- Browser calls remain HTTPS through CloudFront.
- /api/* behavior can forward to backend origin, avoiding mixed-content issues.

## Operational fit
- Low-cost static hosting model.
- Deterministic deploy artifacts and cache controls.

---

## 5. Amplify vs Current Method (Objective Comparison)

## Amplify strengths
- Excellent Git-integrated frontend hosting workflow.
- Very low-friction CI/CD and preview environments.
- Great developer experience for frontend teams.
- Useful for apps aligned with Amplify ecosystem features.

## Current method strengths (Beanstalk + S3/CloudFront)
- More direct infrastructure control and explicit networking behavior.
- No forced backend architecture migration from existing Express server.
- Easier incremental migration from traditional server deployments.
- Works well with custom deployment packaging and explicit release steps.

## Tradeoff matrix

| Area | Amplify | Current Method |
|---|---|---|
| Frontend deploy UX | Simpler | More manual |
| Backend Express compatibility | Depends on chosen Amplify backend pattern | Native fit via Beanstalk |
| Infra control granularity | Moderate | High |
| Learning curve | Lower for frontend | Higher overall |
| Release automation | Built-in flow | Script/runbook driven |
| Refactor required from existing code | Potentially more | Minimal |

---

## 6. Why Not “Amplify for Everything” Immediately

This is not a rejection of Amplify. It is sequencing based on risk.

Reasons a full immediate switch was not selected:
- Existing backend was already stable as Express server routes.
- Needed fast production launch with minimal behavioral change.
- Team needed reliable RDS connectivity and SG control during setup and hardening.
- Avoided introducing backend architecture migration at the same time as cloud go-live.

---

## 7. When Amplify Is Likely Better

Amplify is likely the better default if:
- Team prioritizes minimal ops and streamlined frontend deployments.
- Backend requirements are simple or already aligned with Amplify-managed patterns.
- You want branch previews and integrated deployment UX quickly.

Current method remains better if:
- You need explicit networking and low-level runtime control.
- You already run a traditional server and want minimal refactor.
- You need custom deployment behavior and detailed environment-level control.

---

## 8. Recommended Practical Path for MindWeave

## Option A (lowest risk)
- Keep backend on Beanstalk + RDS.
- Move frontend hosting to Amplify for simpler CI/CD.
- Keep API endpoint architecture unchanged.

## Option B (current state, continue)
- Keep current stack and automate deploys further.
- Add one-command release scripts and stronger smoke tests.

## Option C (highest change)
- Plan phased backend migration to an Amplify-aligned model.
- Do only after clear ROI in team velocity or ops simplification.

---

## 9. Decision Quality Criteria (for future reviews)

Use these criteria when revisiting hosting decisions:
- Engineering effort to migrate.
- Production risk and rollback complexity.
- Cost profile at expected traffic.
- Team familiarity and support load.
- Required observability and governance controls.
- Required deployment speed and environment management UX.

---

## 10. Bottom Line

The current stack is technically sound and justified for MindWeave’s present architecture and delivery timeline.
Amplify is also a valid and strong choice, especially for frontend deployment simplicity.
The right choice is contextual, and a hybrid approach (Amplify frontend + Beanstalk backend) is often the best bridge strategy.
