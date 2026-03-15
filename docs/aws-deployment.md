# MindWeave — AWS Deployment

This document covers the full production deployment of MindWeave on AWS, including every service provisioned, the problems encountered, and how they were resolved.

---

## Live Infrastructure

| Component | AWS Service | Detail |
|---|---|---|
| Frontend (static SPA) | S3 + CloudFront | `d1n2io4499e5zf.cloudfront.net` |
| Backend (REST API) | Elastic Beanstalk | `mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com` |
| Database | RDS PostgreSQL 16.13 | `mindweave-postgres.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com` |
| Secrets | Secrets Manager | `mindweave/prod/rds-master`, `mindweave/prod/app` |
| Region | — | `ap-southeast-1` (Singapore) |
| AWS Account | — | `140023398409` |

---

## Architecture Diagram

```
Internet
  │
  ▼
CloudFront (HTTPS) ──► S3 bucket (static React build)
  │
  │  VITE_API_BASE_URL (set at build time)
  ▼
Elastic Beanstalk ALB (HTTP)
  │
  ▼
Beanstalk EC2 instance (Node.js 20 / AL2023)
  │   sg-0a8c051e836800737
  │
  │  port 5432 (SG rule only)
  ▼
RDS PostgreSQL (mindweave-postgres)
  │   sg-03f94675295dac4af
```

---

## Step 1 — Networking & Security Groups

**VPC used:** `vpc-035bcc2bc144d1522` (default VPC, 3 AZs)

Two security groups were created:

| SG Name | SG ID | Purpose |
|---|---|---|
| `mindweave-app-sg` | `sg-0a91fbfafabcbce97` | Beanstalk / app instances |
| `mindweave-rds-sg` | `sg-03f94675295dac4af` | RDS PostgreSQL |

`mindweave-rds-sg` inbound rules (port 5432):
- Source: `sg-0a91fbfafabcbce97` (app SG)
- Source: `sg-0a8c051e836800737` (Beanstalk auto-created instance SG)

No CIDR-based rules exist on the DB security group — the database is not reachable from the public internet.

**DB Subnet Group:** `mindweave-db-subnet-group` — spans all 3 subnets.

---

## Step 2 — RDS PostgreSQL

```
Instance identifier : mindweave-postgres
Engine              : PostgreSQL 16.13
Instance class      : db.t4g.micro
Storage             : 20 GB gp2
Database name       : mindweave
Master username     : mindweave_admin
Endpoint            : mindweave-postgres.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com
Port                : 5432
```

Credentials are stored in Secrets Manager (`mindweave/prod/rds-master`) as valid JSON:

```json
{
  "username": "mindweave_admin",
  "password": "<stored in Secrets Manager>",
  "host": "mindweave-postgres.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com",
  "port": 5432,
  "dbname": "mindweave"
}
```

---

## Step 3 — Secrets Manager

Two secrets were created:

| Secret name | Description |
|---|---|
| `mindweave/prod/rds-master` | RDS master credentials (username, password, host, port, dbname) |
| `mindweave/prod/app` | Application secrets (DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, CORS_ORIGIN) |

The `DATABASE_URL` stored in `mindweave/prod/app` follows the Prisma PostgreSQL connection string format:
```
postgresql://mindweave_admin:<password>@mindweave-postgres.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com:5432/mindweave?schema=public
```

> These secrets are injected as environment variables by Elastic Beanstalk at runtime. They are never committed to source control.

---

## Step 4 — Database Schema Push

Because the codebase was originally developed with SQLite, the Prisma migration history files referenced `sqlite` as the provider. Switching to `postgresql` caused `prisma migrate deploy` to fail with a lock-file mismatch.

**Solution used:** `prisma db push`

This pushes the current `schema.prisma` directly to the database without using migration history. It is suitable for the initial production provisioning.

```bash
# Run from backend/ with DATABASE_URL pointing to RDS
npx prisma db push

# Seed the 6 built-in think tanks
npx tsx prisma/seed.ts
```

> **Future improvement:** Delete the old SQLite migration files, run `prisma migrate dev --name init` against a PostgreSQL dev database to create a clean migration, then use `prisma migrate deploy` in production. This gives proper migration history for future schema changes.

---

## Step 5 — Frontend (S3 + CloudFront)

### Build

The frontend is built with Vite. The backend URL is baked in at build time via an environment variable:

```bash
# frontend/.env.production
VITE_API_BASE_URL=http://mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com/api
```

```bash
cd frontend
npm run build        # produces frontend/dist/
```

### S3 Bucket

```
Bucket name : mindweave-frontend-140023398409-20260315213625
Region      : ap-southeast-1
Access      : Public read (static website hosting)
```

The bucket has a public-read bucket policy allowing `s3:GetObject` for all principals. All build output from `frontend/dist/` is uploaded with `aws s3 sync`.

### CloudFront Distribution

```
Distribution ID : E1IH3MH6OBUQU
Domain          : d1n2io4499e5zf.cloudfront.net
Origin          : mindweave-frontend-140023398409-20260315213625.s3.amazonaws.com
Default root    : index.html
```

After any frontend redeploy, a CloudFront cache invalidation is required:

```bash
aws cloudfront create-invalidation \
  --distribution-id E1IH3MH6OBUQU \
  --paths "/*"
```

---

## Step 6 — Backend (Elastic Beanstalk)

### IAM Roles

Two IAM roles are required by Elastic Beanstalk that did not exist by default in this AWS account:

| Role | Purpose |
|---|---|
| `aws-elasticbeanstalk-ec2-role` | Instance profile — policies: `AWSElasticBeanstalkWebTier`, `AWSElasticBeanstalkMulticontainerDocker`, `AWSElasticBeanstalkWorkerTier` |
| `aws-elasticbeanstalk-service-role` | Service role — policies: `AWSElasticBeanstalkEnhancedHealth`, `AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy` |

### Deployment Package

Elastic Beanstalk expects a zip archive of the application source. The archive **must** use POSIX-compatible paths. On Windows, use `tar` instead of `Compress-Archive`:

```powershell
# Run from backend/
tar -a -c -f ..\backend-deploy.zip `
  package.json package-lock.json tsconfig.json `
  src\ prisma\ .env
```

> `Compress-Archive` (PowerShell default) produces backslash paths in the zip, which Linux's `unzip` cannot handle. `tar` creates POSIX-compatible archives.

### App & Environment

```
Application   : mindweave-backend
Environment   : mindweave-backend-prod
Platform      : Node.js 20 running on 64bit Amazon Linux 2023
CNAME         : mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com
Health        : Ready
```

Environment variables set in Beanstalk (under Configuration → Software):

| Key | Value source |
|---|---|
| `DATABASE_URL` | From Secrets Manager `mindweave/prod/app` |
| `JWT_SECRET` | From Secrets Manager `mindweave/prod/app` |
| `GEMINI_API_KEY` | From Secrets Manager `mindweave/prod/app` |
| `CORS_ORIGIN` | `https://d1n2io4499e5zf.cloudfront.net` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

### Health Check

The Beanstalk ALB health check hits `GET /`. The root route was added to `backend/src/index.ts` specifically for this purpose:

```typescript
app.get("/", (_req, res) => {
  res.status(200).send("MindWeave backend is running");
});
```

Without this route, the ALB returned 404, Beanstalk reported the environment as degraded, and instance replacement loops occurred.

---

## Redeploying the Backend

When backend code changes:

```powershell
# 1. Build TypeScript
cd backend
npm run build

# 2. Package (POSIX-compatible zip using tar)
tar -a -c -f ..\backend-deploy.zip `
  package.json package-lock.json tsconfig.json `
  src\ prisma\ .env

# 3. Upload bundle to S3 (update version label)
$VERSION = "v$(Get-Date -Format 'yyyyMMddHHmmss')"
aws s3 cp ..\backend-deploy.zip `
  s3://<your-eb-source-bucket>/backend-deploy-$VERSION.zip

# 4. Create new application version
aws elasticbeanstalk create-application-version `
  --application-name mindweave-backend `
  --version-label $VERSION `
  --source-bundle S3Bucket=<your-eb-source-bucket>,S3Key=backend-deploy-$VERSION.zip

# 5. Deploy
aws elasticbeanstalk update-environment `
  --environment-name mindweave-backend-prod `
  --version-label $VERSION
```

---

## Redeploying the Frontend

```powershell
# 1. Rebuild (env var must point to Beanstalk URL)
cd frontend
npm run build

# 2. Sync to S3
aws s3 sync dist/ s3://mindweave-frontend-140023398409-20260315213625/ --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation `
  --distribution-id E1IH3MH6OBUQU `
  --paths "/*"
```

---

## Issues Encountered & Resolutions

| # | Problem | Root Cause | Resolution |
|---|---|---|---|
| 1 | RDS engine version `16.3` not found | Invalid version string | Used `aws rds describe-db-engine-versions` to find `16.13` |
| 2 | Secrets stored as non-JSON by PowerShell | `ConvertTo-Json` added extra formatting | Wrote JSON to temp file; passed `file://path` to AWS CLI |
| 3 | `prisma migrate deploy` failed | `migration_lock.toml` declared `sqlite` | Used `prisma db push` to bypass migration history |
| 4 | S3 bucket policy JSON rejected | PowerShell string escaping broke JSON | Wrote policy JSON to temp file; used `file://` reference |
| 5 | Beanstalk env creation failed: no instance profile | Account had no default EB EC2 role | Created `aws-elasticbeanstalk-ec2-role` IAM role + instance profile |
| 6 | Beanstalk env creation failed: no service role | Account had no default EB service role | Created `aws-elasticbeanstalk-service-role` |
| 7 | Beanstalk instance deployment failed (unzip error) | `Compress-Archive` creates backslash paths | Switched to `tar -a -c -f` for POSIX-compatible archives |
| 8 | Backend returned 503 / ALB health check failed | ALB checks `GET /`, app only had `/api/health` | Added root `GET /` route returning 200 |
| 9 | DB SG rules lost after revoke attempt | `--cidr` vs `--source-group` flag confusion | Restored rules using `--source-group` (SG-based, no JSON) |

---

## Security Hardening Applied

- Database security group has **no CIDR rules** — only SG-to-SG rules for port 5432
- `CORS_ORIGIN` is set to the exact CloudFront domain (not `*`) in production
- All secrets are stored in AWS Secrets Manager, not in source control
- JWT tokens expire after 7 days
- Passwords are bcrypt-hashed with cost factor 10

---

## Smoke Test

End-to-end validation against the live stack:

```powershell
# Register a user
$BODY = '{"email":"test@example.com","username":"testuser","password":"password123"}'
$RESPONSE = Invoke-RestMethod `
  -Uri "http://mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com/api/auth/register" `
  -Method POST -Body $BODY -ContentType "application/json"
$TOKEN = $RESPONSE.token

# Fetch think tanks using the JWT
Invoke-RestMethod `
  -Uri "http://mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com/api/thinktanks" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
# Expected: array of 6 think tanks
```

---

## Pending / Future Work

| Task | Notes |
|---|---|
| Custom domain + HTTPS for backend | Request ACM cert, attach to Beanstalk ALB listener on port 443 |
| Custom domain for frontend | Add CNAME/A record pointing to CloudFront domain |
| Prisma migration history cleanup | Delete SQLite migration files, create fresh PostgreSQL-native migration |
| ECS / Fargate migration | Replace Beanstalk with container-based deployment (requires Docker) |
| Amplify Hosting for frontend | Git-triggered builds; simpler than S3 + CloudFront manual workflow |
