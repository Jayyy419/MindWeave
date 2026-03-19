# MindWeave Vercel Deployment

This guide explains how the frontend is deployed on Vercel and how to operate `mindweave.vercel.app` safely.

## Current State

- Vercel project: `mindweave`
- Team scope: `jayyy419-2398s-projects`
- Public alias: `https://mindweave.vercel.app`
- Framework preset: `Vite`

## How Vercel Works in This Project

1. Vercel builds the `frontend` app and hosts static assets globally.
2. The frontend calls backend APIs using `VITE_API_BASE_URL`.
3. Production builds should use an HTTPS API base.
4. Aliases map deployment URLs to friendly domains (for example `mindweave.vercel.app`).

## Important Project Settings

- SSO protection must be disabled for public access on hobby projects.
- If pages return `401 Unauthorized`, check `ssoProtection` in project settings.

## Deploy Command (Manual)

Run from `frontend/`:

```bash
vercel --prod --yes --build-env VITE_API_BASE_URL=https://d1n2io4499e5zf.cloudfront.net/api
```

## Alias the Latest Deployment

```bash
vercel alias set <latest-deployment-url> mindweave.vercel.app
```

Example:

```bash
vercel alias set https://mindweave-xxxxx-jayyy419-2398s-projects.vercel.app mindweave.vercel.app
```

## Verify Domain is Public

```bash
curl -I https://mindweave.vercel.app
```

Expected:
- `200` for normal page responses
- If `401`, check project protection settings

## Disable SSO Protection via Vercel API (CLI)

If the domain returns `401`, patch project settings:

```bash
vercel api /v9/projects/<project-id> -X PATCH --input sso-off.json
```

`sso-off.json`:

```json
{
  "ssoProtection": null
}
```

## Recommended Environment Variables

- `VITE_API_BASE_URL=https://d1n2io4499e5zf.cloudfront.net/api`

Set in Vercel Project Settings or via CLI build flag.

## Troubleshooting

### 1. PowerShell blocks `vercel` script

Use `vercel.cmd` instead of `vercel`.

### 2. 401 on `mindweave.vercel.app`

Cause: Vercel SSO protection enabled.

Fix: disable `ssoProtection` (set to `null`) and redeploy.

### 3. App loads but API calls fail

Cause: wrong `VITE_API_BASE_URL`.

Fix: deploy with correct HTTPS API base and verify network requests.

## Notes

- Vercel and S3/CloudFront can coexist during transition.
- Keep CloudFront deployment path as fallback until Vercel confidence is high.
