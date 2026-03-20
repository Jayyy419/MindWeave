# Behind The Scenes (2026-03-20)

This is a practical log of what happened, why each step mattered, and what I learned while fixing the production login issue on iOS Safari.

## Problem observed

- Symptom: Login on mindweave.vercel.app failed on iOS Safari with "Load Failed".
- User impact: Authentication requests could not complete from the Vercel-hosted frontend.

## Root causes identified

1. Frontend API base URL was not reliably present for Vercel production builds.
2. Backend CORS policy only allowed the CloudFront frontend origin and did not include mindweave.vercel.app.

## What I changed

## 1) Backend CORS logic (code fix)

- File changed: backend/src/index.ts
- Before:
  - CORS accepted one origin string or "*".
- After:
  - Supports comma-separated origins from CORS_ORIGIN.
  - Trims and validates origin list.
  - Allows requests without an Origin header (non-browser/server requests).
  - Checks incoming browser Origin against allowlist.

Why this matters:
- This enables one backend deployment to serve both production frontends:
  - https://d1n2io4499e5zf.cloudfront.net
  - https://mindweave.vercel.app

## 2) Frontend production API target (build-time fix)

- File added: frontend/.env.production
- Value set:
  - VITE_API_BASE_URL="https://d1n2io4499e5zf.cloudfront.net/api"

Why this matters:
- Vite injects VITE_ variables at build time.
- Committing this file makes production builds deterministic (including Vercel builds).
- If this is missing, frontend may fall back to relative /api, which fails when no matching API route exists on the frontend host.

## Validation done locally

- Backend build: npm run build (success)
- Frontend build: npm run build (success)

## Deployment steps performed

## Backend deploy to Elastic Beanstalk

1. Built backend and created zip bundle with source, dist, prisma, package files.
2. Uploaded bundle to Elastic Beanstalk S3 storage bucket.
3. Created new application version:
   - v20260320041913
4. Updated environment to new version.
5. Updated environment variable CORS_ORIGIN to:
   - https://d1n2io4499e5zf.cloudfront.net,https://mindweave.vercel.app
6. Verified environment reached:
   - Status: Ready
   - Health: Green

## Frontend deploy to Vercel

1. Linked frontend directory to correct project:
   - jayyy419-2398s-projects/mindweave
2. Deployed production build.
3. Updated alias:
   - mindweave.vercel.app -> latest deployment URL

## Runtime checks

- mindweave.vercel.app returned auth page content.
- CloudFront API health returned:
  - {"status":"ok", ...}

## Important gotcha encountered

- During one Vercel CLI run from the wrong context, Vercel auto-detected services and generated local repo artifacts:
  - vercel.json
  - .gitignore update
  - backend-deploy-v20260320041913.zip

These are not required for the app logic fix itself, but they are currently present in this repository state and were requested to be committed.

## Key takeaways (for learning)

1. Separate build-time config from runtime config:
   - Frontend Vite env vars are build-time.
   - Backend env vars are runtime.

2. CORS must match every frontend origin that will call the API:
   - Deploying a new frontend host without updating backend CORS causes immediate auth and API failures.

3. Deploy context matters for Vercel CLI:
   - Running from the wrong directory can create an unintended project/link configuration.

4. Always verify health after infra changes:
   - Build success is not enough; verify live endpoint behavior and environment status.

## Related commit that introduced core fix

- Commit: 37da0a8
- Message: fix: support multi-origin CORS and pin Vercel API base URL
