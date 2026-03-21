# MindWeave Complete Summary

Last updated: 2026-03-21

## 1) What MindWeave Is (Non-Technical)

MindWeave is an AI-supported reflection platform designed to help users process difficult thoughts, build healthier mental patterns, and discover meaningful communities and opportunities over time.

At its core, MindWeave combines:
- personal journaling
- guided AI reframing
- growth tracking through gamification
- community matching via Think Tanks
- consent-based pathways into competitions, resources, and organizer programs

It is positioned as both a personal wellbeing companion and a development ecosystem for youth growth, confidence, and action.

## 2) MindWeave's Core Value Proposition

MindWeave helps users move from emotional overload to practical clarity by turning private reflection into:
- better self-understanding
- actionable reframed thinking
- sustained motivation and resilience
- community alignment with people of similar themes/goals
- optional access to external opportunities when the user chooses to share

## 3) Main User Experience Journey

### A) Personal Reflection
- User writes journal entries.
- User chooses a reframing framework.
- AI returns a direct reframe (not just emotional commentary) aligned to the selected framework.

### B) Pattern and Identity Building
- Entries generate recurring tags and profile signals.
- MindWeave updates level and badges over time.
- Users can revisit and replay past reflections in Memory Lane.

### C) Community Layer (Think Tanks)
- Think Tanks are curated groups unlocked by consistent journaling signals.
- Joined tanks provide group context and structured chat.
- AI can assist conversations as a facilitator in Think Tank chats.

### D) Opportunity Layer (Consent-Based)
- MindWeave surfaces opportunities (challenge, climate, wellbeing pathways) based on fit signals.
- Users review exactly what data scopes are requested.
- Users can preview what would be shared before approving.
- Access is explicit, revocable, and duration-bound.

## 4) Reframing Philosophy and Frameworks

MindWeave supports both therapeutic and ASEAN cultural frameworks.

### Therapeutic frameworks
- CBT (`cbt`): balanced, distortion-challenging reframes
- Iceberg (`iceberg`): surface thought to deeper need/belief context
- Growth Mindset (`growth`): fixed belief to learning-oriented progression

### ASEAN cultural frameworks
- Singapore, Indonesia, Malaysia, Thailand, Philippines, Vietnam, Brunei, Cambodia, Laos, Myanmar
- Cultural tone strengths: `light`, `medium`, `strong`

Design intent:
- Framework choice changes the angle and voice of the reframe.
- Output remains a direct rewritten thought that users can actually use.

## 5) Trust, Privacy, and Safety Model

MindWeave follows a privacy-first model:
- private writing is not automatically shared externally
- opportunity access requires explicit user consent
- consent is scope-limited (profile basics, interests, summary, excerpts, optional full journal)
- users can set expiry or no expiry
- users can revoke consent later in Settings

This creates user agency over data sharing and avoids silent third-party access to journal-derived context.

## 6) Product Features Snapshot

### Personal and journaling
- journaling with titled entries
- live reframe preview
- enter-to-reframe workflow
- chunk-level journal persistence
- replayable Memory Lane detail views

### Account and settings
- register/login with password policy enforcement
- forgot password and reset password flow
- username availability and update
- email change with OTP verification
- password change flow
- PDF export of entries

### Community and growth
- Think Tanks listing and unlock messaging
- tank joining and member-limited participation
- Think Tank chat with AI facilitator responses
- level and badge progression

### Opportunities and consent
- opportunities listing and detail views
- fit indicators based on journaling/profile signals
- selectable consent scopes
- access preview before grant
- shared access management and revocation

## 7) Technical Architecture (High-Level)

MindWeave uses a full-stack web architecture:

- Frontend: React 18 + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- ORM: Prisma
- Database: PostgreSQL (AWS RDS in production)
- AI: Google Gemini API
- Auth: JWT bearer tokens
- Hosting: CloudFront + S3 (frontend), Elastic Beanstalk (backend)

Runtime flow:
- Browser -> CloudFront
- CloudFront serves static frontend from S3
- API calls route to backend
- Backend uses Prisma + PostgreSQL and Gemini integrations

## 8) Frontend Architecture and Responsibilities

Key frontend responsibilities:
- route-level screens for Auth, Journal, Memory Lane, Profile, Settings, Think Tanks, Opportunities
- centralized API client service
- auth session state via context
- token persistence in local storage
- UI built with Tailwind and shadcn components

Current route map includes:
- `/auth`, `/reset-password`
- `/` (journal)
- `/memory-lane`, `/memory-lane/:id`
- `/profile`, `/settings`
- `/thinktanks`, `/thinktanks/:id`
- `/opportunities`, `/opportunities/:id`

## 9) Backend Architecture and Responsibilities

Key backend modules:
- auth routes (register, login, forgot/reset password)
- entries routes (create/list/detail, reframe preview)
- user routes (profile, username/email/password updates, consent listing/revocation)
- think tanks routes (list, available matching, join, messages)
- opportunities routes (list/detail/access-preview/consent grant)
- auth middleware for JWT protection
- AI service layer for reframing/tags/chat responses
- gamification service layer for level/badge/tag progression

## 10) Data Model Summary

Major entities:
- `User`
- `Entry`
- `ThinkTank`
- `Membership`
- `Message`
- `PasswordResetToken`
- `Opportunity`
- `DataAccessConsent`

Data highlights:
- entries store original/reframed text, framework, tags, title, chunk replay data
- users accumulate tags, levels, badges
- consent records track status, scopes, snapshots, grant/revoke timestamps, expiry

## 11) AI Integration Summary

Gemini is used for:
- entry reframing based on selected framework
- tag extraction for matching and profile signal generation
- Think Tank facilitator/bot messages in chat context

Behavioral principle:
- AI is used as a thought-reframing and reflection aid, not as diagnosis or clinical treatment.

## 12) Deployment and Infrastructure Summary

Production setup (AWS + Vercel/CloudFront routing history):
- frontend served via CloudFront and S3
- backend deployed to Elastic Beanstalk
- database on RDS PostgreSQL
- secrets managed via AWS Secrets Manager
- CORS configured for deployed frontend origins

Operational practices documented in the repo include:
- build validation before deploy
- backend versioned deploy artifacts
- CloudFront cache invalidation after frontend updates
- production health checks after deployment

## 13) Security and Reliability Practices

Security controls include:
- bcrypt password hashing
- JWT-based protected APIs
- restricted database network access via security groups
- environment-based secrets
- one-time reset token hashing and expiry
- explicit CORS controls

Reliability controls include:
- API health endpoint
- deployment runbooks and checklists
- changelog tracking by release phase

## 14) Current Product Positioning

MindWeave is currently a hybrid platform that combines:
- reflective journaling for personal wellbeing
- AI-assisted cognitive reframing
- social learning/community spaces (Think Tanks)
- youth opportunity bridging with explicit consent governance

In practical terms, it is both:
- a personal growth and mental resilience tool
- an opportunity-discovery layer for high-fit youth pathways

## 15) Known Constraints and Open Areas

Known or documented operational caveats:
- SMTP must be correctly configured for full forgot-password email reliability in production
- some deployment steps still require careful manual sequencing (schema sync, cache invalidation)
- migration baseline/history hygiene may require periodic cleanup strategy as schema evolves

Natural next maturity areas:
- deeper analytics and observability
- automated consent expiry workflows and reminders
- expanded testing coverage (especially end-to-end consent and opportunity flows)
- richer moderation and safety guardrails for community interactions

## 16) One-Sentence Summary

MindWeave is an AI-powered reflection-to-growth platform that helps users reframe thoughts, track progress, join aligned communities, and optionally unlock external opportunities through transparent, user-controlled data consent.