# MindWeave Sprint Plan

This sprint plan is structured as a practical delivery roadmap based on completed work and the next critical milestones.

## Planning Horizon
- Current stage: Post-auth upgrade, post-AWS deployment, password reset flow added.
- Primary objective: Stabilize production quality and complete account recovery readiness.
- Cadence assumption: 1-week sprints.

---

## Sprint 0 (Completed): Foundation and Cloud Go-Live

## Goals
- Deliver journaling core product loop.
- Add auth and think tank collaboration.
- Deploy full stack to AWS.

## Delivered
- User registration/login with JWT.
- AI-assisted journal reframing and tag extraction.
- Think tanks, memberships, and chat.
- RDS + Beanstalk + S3 + CloudFront deployment.
- API proxy fix through CloudFront /api behavior.

## Exit Criteria
- User can register and fetch think tanks in production.
- API health endpoint returns ok through CloudFront.

---

## Sprint 1 (In Progress): Account Recovery and UX Polish

## Goals
- Improve authentication UX branding.
- Ship forgot-password and reset-password flows end-to-end.

## Completed in this sprint
- Branded MindWeave auth page with enhanced login/register UX.
- Forgot-password request form in login screen.
- Reset-password page and route.
- Password reset token model and secure backend handlers.
- SMTP integration via nodemailer.

## Remaining work
- Configure SMTP vars in Beanstalk production environment.
- Validate delivery to real inbox and reset link click-through.
- Add success/error tracking around email delivery failures.

## Exit Criteria
- Existing user receives reset email in production.
- Reset token can update password successfully.
- User can log in with new password.

---

## Sprint 2 (Next): Reliability and Security Hardening

## Goals
- Improve observability, deployment safety, and secrets hygiene.

## Planned stories
- Add structured request logging and error IDs.
- Add rate limiting for auth and forgot-password endpoints.
- Add account lockout or progressive delay on repeated login failures.
- Add SMTP provider health check endpoint (internal/admin only).
- Add delivery telemetry for forgot-password emails.

## Technical tasks
- Add API integration tests for auth + reset flow.
- Add smoke test script for production after each deploy.
- Add deployment checklist automation script.

## Exit Criteria
- No silent 500 errors on password-reset path.
- Repeatable post-deploy verification in under 5 minutes.

---

## Sprint 3 (Planned): Domain, TLS, and Release Maturity

## Goals
- Move from default AWS domains to production-grade domain setup.

## Planned stories
- Configure custom domain for frontend (CloudFront + Route53 or external DNS).
- Configure HTTPS custom domain for backend access path where needed.
- Rotate and standardize secrets naming and environment templates.
- Publish release notes from changelog automatically.

## Exit Criteria
- User-facing app uses branded domain.
- TLS and CORS settings are fully aligned to final domain.

---

## Sprint 4 (Planned): Product Enhancements

## Goals
- Improve retention and collaboration quality.

## Planned stories
- Think tank recommendation quality improvements.
- Better bot response controls (length, tone, guardrails).
- User-facing notifications for think tank events.
- Enhanced profile insights and progression milestones.

## Exit Criteria
- Measurable increase in session depth and return rate.

---

## Risks and Mitigations

## Risk: SMTP misconfiguration blocks password resets
- Mitigation: pre-release env validation checklist and test email endpoint.

## Risk: Schema drift due to mixed migration approaches
- Mitigation: create clean PostgreSQL migration baseline and enforce deploy-only migrations.

## Risk: CloudFront stale cache after frontend release
- Mitigation: mandatory invalidation step in release checklist.

## Risk: Manual deploy inconsistency
- Mitigation: codify AWS CLI runbook and console runbook with fixed command templates.

---

## Definition of Done Template
For each sprint item:
- Code merged and builds passing locally.
- Production deploy completed.
- Smoke tests passed on live URL.
- Documentation updated in docs folder.
- Rollback path documented.
