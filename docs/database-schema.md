# MindWeave — Database Schema

ORM: **Prisma 6**  
Production database: **PostgreSQL 16.13** (AWS RDS)  
Local database: **SQLite** (file: `prisma/dev.db`)

---

## Entity Relationship Diagram

```
┌──────────────┐        ┌─────────────────┐
│     User     │        │    ThinkTank     │
│──────────────│        │─────────────────│
│ id (PK)      │◄──┐    │ id (PK)         │
│ anonymousId  │   │    │ name (unique)    │
│ email        │   │    │ description     │
│ username     │   │    │ tags (JSON)     │
│ passwordHash │   │    │ maxMembers      │
│ level        │   │    └────────┬────────┘
│ badges (JSON)│   │             │
│ tags (JSON)  │   │    ┌────────▼────────┐
│ createdAt    │   │    │   Membership    │
│ updatedAt    │   │    │─────────────────│
└──────┬───────┘   │    │ id (PK)         │
       │           └────┤ userId (FK)     │
       │                │ thinkTankId (FK)│
       │ 1:many         │ joinedAt        │
       ▼                └─────────────────┘
┌──────────────┐
│    Entry     │        ┌─────────────────┐
│──────────────│        │    Message      │
│ id (PK)      │        │─────────────────│
│ userId (FK)  │        │ id (PK)         │
│ framework    │        │ thinkTankId (FK)│
│ originalText │        │ userId (FK?)    │
│ reframedText │        │ role            │
│ tags (JSON)  │        │ usernameSnapshot│
│ createdAt    │        │ content         │
└──────────────┘        │ createdAt       │
                        └─────────────────┘
```

---

## Models

### `User`

Represents a registered account.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` PK | `cuid()` — generated automatically |
| `anonymousId` | `String?` unique | Legacy field; set to `acct-<uuid>` on register |
| `email` | `String?` unique | Normalised to lowercase on registration |
| `username` | `String?` unique | Display name shown in think tanks and chat |
| `passwordHash` | `String?` | bcrypt hash (cost 10); never exposed via API |
| `level` | `Int` | Gamification level; starts at 1, increases every 5 entries |
| `badges` | `String` | JSON array of badge name strings |
| `tags` | `String` | JSON array of accumulated interest tags from all entries |
| `createdAt` | `DateTime` | Auto-set on creation |
| `updatedAt` | `DateTime` | Auto-updated on any change |

**Relations:** one-to-many with `Entry`, `Membership`, `Message`

---

### `Entry`

A single journal entry created by a user.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` PK | `cuid()` |
| `userId` | `String` FK | References `User.id` |
| `framework` | `String` | `"cbt"` \| `"iceberg"` \| `"growth"` |
| `title` | `String` | User-supplied entry title; defaults to empty string for legacy rows |
| `originalText` | `String` | The user's raw journal text (max 5 000 chars enforced at API layer) |
| `reframedText` | `String` | AI-generated reframe from Gemini |
| `chunks` | `String` | JSON array of saved replay blocks: `{ id, userText, aiText }[]` |
| `tags` | `String` | JSON array of topic tags extracted by Gemini |
| `createdAt` | `DateTime` | Auto-set on creation |

**Relations:** many-to-one with `User`

---

### `ThinkTank`

A predefined interest-based discussion group. Created by the seed script; not user-created.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` PK | `cuid()` |
| `name` | `String` unique | Display name |
| `description` | `String` | Short description of the group's theme |
| `tags` | `String` | JSON array of interest tags used for user matching |
| `maxMembers` | `Int` | Default 5; think tank becomes full when reached |

**Relations:** one-to-many with `Membership`, `Message`

---

### `Membership`

Join table linking a user to a think tank.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` PK | `cuid()` |
| `userId` | `String` FK | References `User.id` |
| `thinkTankId` | `String` FK | References `ThinkTank.id` |
| `joinedAt` | `DateTime` | Auto-set on creation |

**Unique constraint:** `(userId, thinkTankId)` — a user can only join each tank once.

---

### `Message`

A single chat message inside a think tank, posted either by a user or the AI bot.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` PK | `cuid()` |
| `thinkTankId` | `String` FK | References `ThinkTank.id` |
| `userId` | `String?` FK | `null` for bot messages; references `User.id` for user messages |
| `role` | `String` | `"user"` or `"bot"` |
| `usernameSnapshot` | `String` | Username at the time the message was sent (preserved even if username changes) |
| `content` | `String` | Message body |
| `createdAt` | `DateTime` | Auto-set on creation |

**Relations:** many-to-one with `ThinkTank`; optional many-to-one with `User`

---

## Runtime-Created Analytics Tables

The current production backend also creates several tables with guarded `CREATE TABLE IF NOT EXISTS` SQL at runtime (inside route initializers). These are not yet represented as Prisma models but are active in production analytics flows.

### `UserImpactProfile`

Stores each user's selected beneficiary segment.

| Column | Type | Notes |
|---|---|---|
| `userId` | `TEXT` PK/FK | References `User.id` |
| `beneficiaryGroup` | `TEXT` | Default `university-students` |
| `updatedAt` | `TIMESTAMP` | Last profile update time |

### `UserOutcomeSurvey`

Stores baseline and follow-up impact surveys.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | UUID |
| `userId` | `TEXT` FK | References `User.id` |
| `surveyType` | `TEXT` | `baseline` \| `day7` \| `day14` \| `day30` |
| `stressScore` | `INTEGER` | 1-10 score |
| `copingConfidenceScore` | `INTEGER` | 1-10 score |
| `helpSeekingConfidenceScore` | `INTEGER` | 1-10 score |
| `createdAt` | `TIMESTAMP` | Survey submission time |

### `OutreachCampaign`

Outreach tracking entity used by the Impact Hub.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | UUID |
| `ownerUserId` | `TEXT` FK | References `User.id` |
| `name` | `TEXT` | Campaign name |
| `channel` | `TEXT` | Delivery channel |
| `targetReach` | `INTEGER` | Campaign target |
| `currentReach` | `INTEGER` | Running total from touchpoints |
| `status` | `TEXT` | Default `active` |
| `qrToken` | `TEXT` unique | Auto-generated QR attribution token |
| `referralCode` | `TEXT` unique | Auto-generated referral code |
| `funnelImpressions` | `INTEGER` | Funnel stage counter |
| `funnelScans` | `INTEGER` | Funnel stage counter |
| `funnelSignups` | `INTEGER` | Funnel stage counter |
| `funnelActiveUsers` | `INTEGER` | Funnel stage counter |
| `funnelCompletions` | `INTEGER` | Funnel stage counter |
| `createdAt` | `TIMESTAMP` | Create timestamp |
| `updatedAt` | `TIMESTAMP` | Last update timestamp |

### `OutreachTouchpoint`

Manual reach increments attached to campaigns.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | UUID |
| `campaignId` | `TEXT` FK | References `OutreachCampaign.id` (cascade delete) |
| `participantCount` | `INTEGER` | Count added to campaign reach |
| `sourceNote` | `TEXT` | Manual source annotation |
| `createdAt` | `TIMESTAMP` | Creation time |

### `LearningAssessmentEvent`

Learning performance event stream for lesson-level metrics.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | UUID |
| `userId` | `TEXT` FK | References `User.id` |
| `frameworkId` | `TEXT` | Learning framework identifier |
| `lessonId` | `TEXT` | Lesson identifier |
| `source` | `TEXT` | Event origin (for example `course`) |
| `score` | `INTEGER` | 0-100 rounded score |
| `passed` | `BOOLEAN` | Pass/fail marker |
| `createdAt` | `TIMESTAMP` | Event creation time |

---

## Seeded Think Tanks

Six think tanks are created by `prisma/seed.ts` using `upsert` (safe to run multiple times):

| Name | Tags |
|---|---|
| Aspiring Founders | entrepreneurship, startup, business, innovation, leadership |
| Climate Advocates | climate change, environment, sustainability, nature, activism |
| Creative Writers | writing, creativity, storytelling, art, expression |
| Mindful Living | mindfulness, mental health, anxiety, self-care, well-being, stress |
| Tech Innovators | technology, coding, AI, programming, innovation, software |
| Social Impact Leaders | social impact, community, justice, volunteering, education, equality |

---

## JSON Fields

Prisma stores arrays as JSON strings in a `String` column. At the application layer, these are always serialised/deserialised with `JSON.stringify` / `JSON.parse`.

Fields stored as JSON strings:

| Model | Field | Type when parsed |
|---|---|---|
| `User` | `badges` | `string[]` (badge names) |
| `User` | `tags` | `string[]` (interest topic tags) |
| `ThinkTank` | `tags` | `string[]` (interest topic tags) |
| `Entry` | `chunks` | `{ id: string; userText: string; aiText: string }[]` |
| `Entry` | `tags` | `string[]` (topic tags from this entry) |

> These could be migrated to a native `jsonb` column (PostgreSQL-only) or a proper join table in a future schema revision.

---

## Gamification Logic

Managed by `backend/src/services/gamification.ts` and called after every new entry:

**Level:** `Math.floor(entryCount / 5) + 1`

**Badges (awarded at these entry counts):**

| Entry count | Badge name |
|---|---|
| 1 | First Step |
| 5 | Explorer |
| 10 | Reflector |
| 25 | Journaler |
| 50 | Sage |

**Tags:** each entry's extracted tags are merged (deduplicated) into `User.tags` to build the user's interest profile for think tank matching.

---

## Running Migrations

### Local development (schema changes)

```bash
cd backend
npx prisma migrate dev --name describe-your-change
```

### Production (first-time setup)

The production database was initialised with `prisma db push` (bypasses migration history). For ongoing changes, create a migration locally and deploy:

```bash
# Local: generate migration
npx prisma migrate dev --name your-change

# Production: apply pending migrations
npx prisma migrate deploy
```

> See [aws-deployment.md](aws-deployment.md) for the context on why `db push` was used initially and the recommended path forward.
