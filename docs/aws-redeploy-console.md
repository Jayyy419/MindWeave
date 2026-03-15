# AWS Redeploy Guide (Console)

This guide explains how to redeploy MindWeave through the AWS Console only.

## What This Covers
- Backend redeploy (Elastic Beanstalk)
- Frontend redeploy (S3 + CloudFront)
- Required environment updates for password reset emails
- Post-deploy verification

---

## Prerequisites
- AWS account access with permissions for Elastic Beanstalk, S3, CloudFront, RDS, and Secrets Manager.
- Local project source code to generate deploy artifacts.
- Built frontend files from frontend/dist.

---

## Part A: Redeploy Backend in Elastic Beanstalk

## 1. Build backend artifact locally
From backend folder:
- Install dependencies
- Build TypeScript
- Create zip containing required runtime files

Recommended zip contents:
- package.json
- package-lock.json
- tsconfig.json
- src/
- prisma/
- dist/

## 2. Open Beanstalk Console
- Service: Elastic Beanstalk
- Application: mindweave-backend
- Environment: mindweave-backend-prod

## 3. Upload and deploy
- Click Upload and deploy
- Choose the backend zip artifact
- Set a clear version label (example: vYYYYMMDDHHmmss)
- Deploy

## 4. Wait for environment recovery
- Status should return to Ready
- Health should be Green

---

## Part B: Configure Environment Variables (Critical)

In the same Beanstalk environment:
- Go to Configuration
- Open Updates, monitoring, and logging or Software section where Environment properties are managed
- Ensure these variables exist:

## Core
- DATABASE_URL
- JWT_SECRET
- GEMINI_API_KEY
- CORS_ORIGIN
- PORT

## Password reset link generation
- FRONTEND_BASE_URL=https://d1n2io4499e5zf.cloudfront.net

## SMTP email sending
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

If SMTP variables are missing, forgot-password for existing users will fail with 500.

---

## Part C: Redeploy Frontend to S3

## 1. Build frontend locally
- Ensure VITE_API_BASE_URL is /api
- Run frontend build so output is in dist/

## 2. Upload dist to S3
- Open S3 console
- Bucket: mindweave-frontend-140023398409-20260315213625
- Upload all files from frontend/dist to bucket root
- Overwrite existing files

---

## Part D: Invalidate CloudFront Cache

- Open CloudFront console
- Distribution id: E1IH3MH6OBUQU
- Go to Invalidations
- Create invalidation with path: /*
- Wait until status becomes Completed

---

## Part E: Database Schema Sync (Needed for New Models)

AWS Console does not directly run Prisma db push.
You still need one CLI execution for schema sync.

Required when schema changed:
- PasswordResetToken model addition
- Any future Prisma model/field updates

If skipped, runtime endpoints that depend on new tables may fail.

---

## Part F: Post-Deploy Verification Checklist

## Health and routing
- Open https://d1n2io4499e5zf.cloudfront.net
- Open https://d1n2io4499e5zf.cloudfront.net/api/health
- Expect status ok

## Auth flow
- Register and login
- Confirm entries/profile/think tanks load

## Password reset flow
- Trigger forgot-password with an existing user email
- Confirm no 500 error
- Confirm email arrives and reset link opens reset page
- Confirm password reset and login with new password

---

## Troubleshooting

## Beanstalk stuck Updating
- Check Events tab for deployment errors.
- Verify uploaded zip structure and runtime files.

## Frontend still old
- Confirm invalidation completed.
- Hard refresh browser.

## Forgot-password 500
- Confirm SMTP vars are set in Beanstalk.
- Confirm FRONTEND_BASE_URL is correct.
- Check Beanstalk logs for nodemailer errors.
