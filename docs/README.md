# MindWeave — Documentation

Welcome to the MindWeave documentation. Use the links below to navigate.

---

## Contents

| Document | Description |
|---|---|
| [Architecture](architecture.md) | System overview, tech stack, component breakdown, data flows, security model |
| [API Reference](api-reference.md) | Full REST API documentation — all endpoints, request/response shapes, error codes |
| [Database Schema](database-schema.md) | Prisma models, ER diagram, JSON fields, gamification logic, migration guide |
| [Local Development](local-development.md) | How to run the project locally — setup, env vars, scripts, common issues |
| [AWS Deployment](aws-deployment.md) | Full production deployment runbook — services provisioned, issues resolved, redeploy commands |
| [Changelog](changelog.md) | Detailed, granular timeline of all major app and infrastructure additions |
| [Tech Stack](tech-stack.md) | Complete technology inventory, dependency map, env vars, and AWS resource stack |
| [Sprint Plan](sprint-plan.md) | Sprint-by-sprint delivery plan with goals, risks, and definition-of-done |
| [AWS Redeploy (Console)](aws-redeploy-console.md) | End-to-end deployment steps using AWS Console |
| [AWS Redeploy (CLI)](aws-redeploy-cli.md) | Command-based deployment runbook with verification and rollback |
| [Release Checklist](release-checklist.md) | Pre-release and post-release checklist for reliable production deployments |

---

## Quick Reference

**Local URLs**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

**Production URLs**
- Frontend: `https://d1n2io4499e5zf.cloudfront.net`
- Backend: `http://mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com`

**AWS Resources (ap-southeast-1)**
- RDS endpoint: `mindweave-postgres.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com`
- S3 bucket: `mindweave-frontend-140023398409-20260315213625`
- CloudFront ID: `E1IH3MH6OBUQU`
- Beanstalk app: `mindweave-backend` / env: `mindweave-backend-prod`
- Secrets Manager: `mindweave/prod/rds-master`, `mindweave/prod/app`

## Recommended Reading Order

1. Start with [Architecture](architecture.md)
2. Continue to [Tech Stack](tech-stack.md)
3. Review [API Reference](api-reference.md)
4. Read [AWS Redeploy (Console)](aws-redeploy-console.md) or [AWS Redeploy (CLI)](aws-redeploy-cli.md)
5. Use [Release Checklist](release-checklist.md) before every production release
6. Track delivery history in [Changelog](changelog.md)
