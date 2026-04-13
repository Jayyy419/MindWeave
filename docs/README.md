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
| [Hosting and Stack Decisions](hosting-and-stack-decisions.md) | Objective comparison of Amplify vs current hosting and rationale for PostgreSQL, Beanstalk, and CloudFront |
| [Sprint Plan](sprint-plan.md) | Sprint-by-sprint delivery plan with goals, risks, and definition-of-done |
| [AWS Redeploy (Console)](aws-redeploy-console.md) | End-to-end deployment steps using AWS Console |
| [AWS Redeploy (CLI)](aws-redeploy-cli.md) | Command-based deployment runbook with verification and rollback |
| [Vercel Deployment](vercel-deployment.md) | Frontend deployment flow for mindweave.vercel.app, aliasing, protection, env vars |
| [Developer Workflow](developer-workflow.md) | How to implement, test, commit, push, and deploy changes safely |
| [Release Checklist](release-checklist.md) | Pre-release and post-release checklist for reliable production deployments |
| [Framework Catalog](framework-catalog.md) | Canonical list of therapeutic and ASEAN cultural frameworks, including maintenance checklist |
| [29 Improvement Roadmap](improvements-roadmap-29.md) | Prioritized list of 29 product and outreach upgrades aligned to competition judging |
| [Proposal Improvement Draft](proposal-improvement.md) | Ready-to-use 5-page proposal structure with rubric-aligned content checklist |
| [Pitch Video Improvement Draft](pitch-video-improvements.md) | 3-minute pitch storyboard and script guide aligned to judging criteria |

---

## Quick Reference

**Local URLs**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

**Production URLs**
- Frontend (Amplify): `https://main.d2yypbdshi15os.amplifyapp.com`
- Backend (App Runner): `https://nvzq43knz6.ap-southeast-1.awsapprunner.com`

**AWS Resources (ap-southeast-1)**
- RDS endpoint: `mindweave-db.cd0g6meus64n.ap-southeast-1.rds.amazonaws.com`
- ECR repo: `140023398409.dkr.ecr.ap-southeast-1.amazonaws.com/mindweave-backend`
- CodeBuild project: `mindweave-backend-build`
- Amplify app ID: `d2yypbdshi15os`
- App Runner service: `mindweave-backend`
- S3 (CodeBuild source): `mindweave-codebuild-source-140023398409`

## Recommended Reading Order

1. Start with [Architecture](architecture.md)
2. Continue to [Tech Stack](tech-stack.md)
3. Read [Hosting and Stack Decisions](hosting-and-stack-decisions.md)
4. Review [API Reference](api-reference.md)
5. Read [AWS Redeploy (Console)](aws-redeploy-console.md) or [AWS Redeploy (CLI)](aws-redeploy-cli.md)
6. Use [Release Checklist](release-checklist.md) before every production release
7. Track delivery history in [Changelog](changelog.md)
