# MindWeave Developer Workflow

This document describes day-to-day change management for MindWeave.

## 1. Make a Change Safely

1. Pull latest main branch.
2. Implement code changes in focused files.
3. Run local builds before commit.

Frontend build:

```bash
cd frontend
npm run build
```

Backend build:

```bash
cd backend
npm run build
```

## 2. Route and URL Conventions

- Auth page: `/auth`
- Journal page: `/`
- Memory Lane list: `/memory-lane`
- Memory Lane detail: `/memory-lane/:id`
- Think Tanks: `/thinktanks`

Legacy `/history` links should redirect to `/memory-lane`.

## 3. Commit and Push Workflow

From repository root or current project folder:

```bash
git add -A
git commit -m "feat: short clear summary"
git push origin main
```

Commit message tips:
- `feat:` for new features
- `fix:` for bug fixes
- `style:` for visual-only changes
- `chore:` for maintenance/docs/config

## 4. Frontend Deploy Workflow (CloudFront)

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://mindweave-frontend-140023398409-20260315213625 --delete --region ap-southeast-1
aws cloudfront create-invalidation --distribution-id E1IH3MH6OBUQU --paths "/*" --region ap-southeast-1
```

## 5. Frontend Deploy Workflow (Vercel)

```bash
cd frontend
vercel --prod --yes --build-env VITE_API_BASE_URL=https://d1n2io4499e5zf.cloudfront.net/api
vercel alias set <deployment-url> mindweave.vercel.app
```

## 6. Backend Deploy Workflow (Elastic Beanstalk)

1. Build backend.
2. Package deployment bundle.
3. Upload zip to EB source bucket.
4. Create app version.
5. Update environment to new version.
6. Monitor EB events and health.

## 7. Common Change Types

### UI-only changes
- Usually frontend deploy only.
- Backend redeploy not required unless API contract changed.

### API and auth changes
- Update backend routes and frontend API service.
- Build both frontend and backend.
- Redeploy backend and frontend.

### Settings/account changes
- Keep frontend form validation aligned with backend policy.
- Ensure API errors are surfaced clearly in UI.

## 8. Validation Checklist Before Release

- Frontend builds without TypeScript errors.
- Backend builds without TypeScript errors.
- Login and logout flow works.
- Memory Lane routes resolve correctly.
- Think Tank access behavior matches product policy.
- Changelog/docs updated for user-visible changes.

## 9. Rollback Basics

### Frontend
- Re-upload previous `dist` artifact to S3 and invalidate CloudFront.
- Or promote previous Vercel deployment.

### Backend
- Redeploy previous Elastic Beanstalk version label.

## 10. Documentation Discipline

For every meaningful delivery:
- update `docs/changelog.md`
- update docs affected by architecture/deploy/route changes
- keep commands current with actual production resources
