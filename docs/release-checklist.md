# MindWeave Release Checklist

Use this checklist before every production release.

## A. Code Readiness
- Pull latest branch and confirm intended changes only.
- Run backend build successfully.
- Run frontend build successfully.
- Verify route updates (auth, memory-lane, think tanks) are consistent across nav and page links.
- Confirm docs updates for any feature or infra changes.
- Confirm changelog updated.

## B. Environment Readiness
- Verify AWS credentials and account context.
- Confirm Beanstalk environment status is Ready/Green.
- Confirm CloudFront distribution exists and is deployable.
- Confirm secrets are present in Secrets Manager.

## C. Required Env Variables

## Core runtime
- DATABASE_URL
- JWT_SECRET
- GEMINI_API_KEY
- CORS_ORIGIN
- PORT

## Password reset
- FRONTEND_BASE_URL
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

## D. Backend Deploy Steps
- Build backend and package artifact.
- Upload artifact to Beanstalk source bucket.
- Create application version.
- Update Beanstalk environment.
- Wait for Ready/Green.

## E. Frontend Deploy Steps
- Build frontend with VITE_API_BASE_URL=/api.
- Sync dist to S3 bucket.
- Create CloudFront invalidation path /*.
- Wait for invalidation completion.

## E2. Vercel Deploy Steps
- Deploy production build with HTTPS API base.
- Confirm alias points to latest production deployment (`mindweave.vercel.app`).
- Verify `mindweave.vercel.app` returns 200.
- If 401 occurs, verify Vercel project `ssoProtection` is disabled.

## F. Database Sync
- If schema changed, run prisma db push or migrate deploy per strategy.
- Verify expected tables/columns exist.
- Remove temporary DB ingress rules if used.

## G. Smoke Tests
- GET /api/health through CloudFront.
- Open `https://mindweave.vercel.app` and verify auth page for unauthenticated user.
- Register and login.
- Fetch think tanks.
- Fetch profile and entries.
- Trigger forgot-password with existing email.
- Verify reset page link works.

## H. Post-Release Audit
- Check Beanstalk logs for errors.
- Confirm no temporary security group rules remain.
- Capture deployed version labels and invalidation ID.
- Update changelog with final deployment record.

## I. Rollback Plan
- Identify previous backend version label.
- Keep previous frontend build artifact available.
- Be ready to redeploy prior backend version and prior frontend asset set.
