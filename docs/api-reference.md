# MindWeave — API Reference

Base URL (production direct backend): `http://mindweave-backend-prod.eba-pkhkfih2.ap-southeast-1.elasticbeanstalk.com`  
Base URL (production via CloudFront, recommended): `https://d1n2io4499e5zf.cloudfront.net/api`  
Base URL (local dev): `http://localhost:3001`

All protected endpoints require an `Authorization: Bearer <token>` header.

---

## Authentication

### POST /api/auth/register

Create a new account.

**Request body**
```json
{
  "email": "alice@example.com",
  "username": "alice",
  "password": "mypassword123"
}
```

**Rules**
- `email`, `username`, `password` are all required
- `password` must be ≥ 8 characters
- `email` and `username` must be unique

**Response `201`**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "clxxx",
    "email": "alice@example.com",
    "username": "alice"
  }
}
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing fields or password too short |
| `409` | Email or username already taken |

---

### POST /api/auth/login

Sign in to an existing account.

**Request body**
```json
{
  "email": "alice@example.com",
  "password": "mypassword123"
}
```

**Response `200`**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "clxxx",
    "email": "alice@example.com",
    "username": "alice"
  }
}
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing email or password |
| `401` | Invalid credentials |

---

### POST /api/auth/forgot-password

Request a password reset email.

**Request body**
```json
{
  "email": "alice@example.com"
}
```

**Response `200`**
```json
{
  "message": "If an account exists, a reset link has been sent."
}
```

**Behavior notes**
- Returns the same message for both existing and non-existing emails.
- This avoids account enumeration.
- For existing users, backend creates a one-time reset token and sends email through SMTP.

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing email |
| `500` | SMTP/config error while sending reset email |

---

### POST /api/auth/reset-password

Reset account password using token from email link.

**Request body**
```json
{
  "token": "<reset-token-from-email>",
  "password": "newsecurepassword123"
}
```

**Rules**
- `token` and `password` are required.
- `password` must be ≥ 8 characters.
- Token must be valid, unexpired, and unused.

**Response `200`**
```json
{
  "message": "Password has been reset successfully"
}
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing fields or password too short |
| `400` | Invalid or expired reset token |
| `500` | Server/database error during reset |

---

## Journal Entries

All routes require authentication.

### POST /api/entries

Create a new journal entry. The backend calls Gemini to produce a reframed version and extract tags.

**Request body**
```json
{
  "title": "Tough day at work",
  "text": "I keep making mistakes at work and I feel useless.",
  "framework": "cbt",
  "chunks": [
    {
      "id": "chunk-1",
      "userText": "I keep making mistakes at work and I feel useless.",
      "aiText": "Making mistakes at work does not define my worth; I can learn from this and improve step by step."
    }
  ]
}
```

`title` is required and must be 100 characters or fewer.  
`framework` must be one of the supported therapeutic or ASEAN cultural frameworks.  
`text` must be ≤ 5 000 characters.

`chunks` is optional for backwards compatibility, but when provided it is stored and replayed in Memory Lane.

**Response `201`**
```json
{
  "id": "clyyy",
  "title": "Tough day at work",
  "framework": "cbt",
  "originalText": "I keep making mistakes at work and I feel useless.",
  "reframedText": "Everyone makes mistakes — they're opportunities to learn ...",
  "chunks": [
    {
      "id": "chunk-1",
      "userText": "I keep making mistakes at work and I feel useless.",
      "aiText": "Making mistakes at work does not define my worth; I can learn from this and improve step by step."
    }
  ],
  "tags": ["work-stress", "self-worth"],
  "createdAt": "2026-03-15T12:00:00.000Z",
  "explainability": {
    "framework": "cbt",
    "culturalFramework": "singapore",
    "culturalToneStrength": "medium",
    "steps": [
      "Your entry is processed as reflection text (not as a command/task request).",
      "MindWeave applies your selected framework prompt to generate a balanced reframe.",
      "A second pass extracts keyword tags used for journaling insights and progression.",
      "Safety scanning checks for high-risk language and surfaces country-relevant support resources."
    ]
  },
  "safety": {
    "level": "none",
    "reasons": [],
    "message": null,
    "supportCountry": "singapore",
    "supportResources": [
      {
        "label": "Samaritans of Singapore",
        "contact": "1767",
        "type": "hotline"
      }
    ]
  }
}
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing / empty title or text, invalid framework, text > 5 000 chars |
| `401` | No or invalid JWT |
| `500` | Gemini API failure |

---

### POST /api/entries/reframe-preview

Generate a live reframing preview without saving the entry.

**Request body**
```json
{
  "text": "I keep making mistakes at work and I feel useless.",
  "framework": "cbt"
}
```

**Response `200`**
```json
{
  "originalText": "I keep making mistakes at work and I feel useless.",
  "reframedText": "Making mistakes at work does not define my worth; I can learn from this and improve step by step.",
  "framework": "cbt",
  "source": "ai",
  "explainability": {
    "framework": "cbt",
    "culturalFramework": "singapore",
    "culturalToneStrength": "medium",
    "steps": [
      "Your entry is processed as reflection text (not as a command/task request).",
      "MindWeave applies your selected framework prompt to generate a balanced reframe.",
      "A second pass extracts keyword tags used for journaling insights and progression.",
      "Safety scanning checks for high-risk language and surfaces country-relevant support resources."
    ]
  },
  "safety": {
    "level": "high",
    "reasons": ["self-harm mention"],
    "message": "Your journal text may indicate urgent emotional risk. Please contact immediate support if you feel unsafe right now.",
    "supportCountry": "singapore",
    "supportResources": [
      {
        "label": "Samaritans of Singapore",
        "contact": "1767",
        "type": "hotline"
      }
    ]
  }
}
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing / empty text, invalid framework, invalid cultural tone strength |
| `422` | Off-topic text that is not a journal-style personal reflection |
| `503` | Live AI reframing temporarily unavailable |

---

### GET /api/entries/support-resources

Return support resources for a requested country/cultural framework. If the value is missing or unknown, general resources are returned.

**Query params**
- `culturalFramework` (optional): one of the supported ASEAN cultural IDs

**Response `200`**
```json
{
  "supportCountry": "singapore",
  "supportResources": [
    {
      "label": "Samaritans of Singapore",
      "contact": "1767",
      "type": "hotline"
    }
  ]
}
```

---

### GET /api/entries

List all entries for the authenticated user, newest first. Returns a 120-character preview of the original text.

**Response `200`**
```json
[
  {
    "id": "clyyy",
    "title": "Tough day at work",
    "framework": "cbt",
    "preview": "I keep making mistakes at work and I feel useless.",
    "createdAt": "2026-03-15T12:00:00.000Z"
  }
]
```

---

### GET /api/entries/:id

Get the full detail of one entry. Only accessible to the entry's owner.

**Response `200`**
```json
{
  "id": "clyyy",
  "title": "Tough day at work",
  "framework": "cbt",
  "originalText": "...",
  "reframedText": "...",
  "chunks": [
    {
      "id": "chunk-1",
      "userText": "I keep making mistakes at work and I feel useless.",
      "aiText": "Making mistakes at work does not define my worth; I can learn from this and improve step by step."
    }
  ],
  "tags": ["work-stress"],
  "createdAt": "2026-03-15T12:00:00.000Z"
}
```

**Errors**

| Status | Reason |
|---|---|
| `404` | Entry not found or belongs to another user |

---

## Think Tanks

All routes require authentication.

### GET /api/thinktanks

List all think tanks with their member counts.

**Response `200`**
```json
[
  {
    "id": "clzzz",
    "name": "Anxiety & Stress",
    "description": "A safe space to share and reframe anxiety.",
    "tags": ["anxiety", "stress"],
    "maxMembers": 5,
    "memberCount": 3
  }
]
```

---

### GET /api/thinktanks/available

Return think tanks that match the authenticated user's accumulated tags. Requires ≥ 3 journal entries.

**Response `200` (user has < 3 entries)**
```json
{
  "message": "Write at least 3 journal entries to unlock think tank matching.",
  "available": []
}
```

**Response `200` (after 3+ entries)**
```json
{
  "available": [
    {
      "id": "clzzz",
      "name": "Anxiety & Stress",
      "tags": ["anxiety", "stress"],
      "maxMembers": 5,
      "memberCount": 3,
      "isFull": false,
      "isJoined": false
    }
  ]
}
```

---

### GET /api/thinktanks/:id

Get details of one think tank including its member list.

**Response `200`**
```json
{
  "id": "clzzz",
  "name": "Anxiety & Stress",
  "description": "...",
  "tags": ["anxiety", "stress"],
  "maxMembers": 5,
  "members": [
    {
      "userId": "clxxx",
      "username": "alice",
      "level": 2,
      "joinedAt": "2026-03-15T12:00:00.000Z"
    }
  ],
  "isJoined": false
}
```

---

### POST /api/thinktanks/:id/join

Join a think tank. Maximum 5 members per tank.

**No request body required.**

**Response `201`**
```json
{ "message": "Successfully joined think tank" }
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Already a member |
| `400` | Think tank is full |
| `404` | Think tank not found |

---

### GET /api/thinktanks/:id/messages

Fetch the last 100 messages in the think tank chat room. Requires membership.

**Response `200`**
```json
[
  {
    "id": "msgaaa",
    "role": "user",
    "usernameSnapshot": "alice",
    "content": "Has anyone else struggled with imposter syndrome?",
    "createdAt": "2026-03-15T12:00:00.000Z"
  },
  {
    "id": "msgbbb",
    "role": "bot",
    "usernameSnapshot": "MindWeave Bot",
    "content": "Imposter syndrome is extremely common ...",
    "createdAt": "2026-03-15T12:00:01.000Z"
  }
]
```

**Errors**

| Status | Reason |
|---|---|
| `403` | Not a member of this think tank |

---

### POST /api/thinktanks/:id/messages

Post a message to the group chat. The backend automatically generates and saves an AI bot reply in the same response.

**Request body**
```json
{ "content": "Has anyone else struggled with imposter syndrome?" }
```

**Response `201`** — array of `[userMessage, botMessage]`
```json
[
  {
    "id": "msgaaa",
    "role": "user",
    "usernameSnapshot": "alice",
    "content": "Has anyone else struggled with imposter syndrome?",
    "createdAt": "2026-03-15T12:00:00.000Z"
  },
  {
    "id": "msgbbb",
    "role": "bot",
    "usernameSnapshot": "MindWeave Bot",
    "content": "Imposter syndrome is extremely common...",
    "createdAt": "2026-03-15T12:00:01.000Z"
  }
]
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Empty message content |
| `403` | Not a member of this think tank |

---

## User Profile

### GET /api/user/profile

Returns the authenticated user's gamification stats.

**Response `200`**
```json
{
  "level": 2,
  "badges": ["First Step", "Explorer"],
  "tags": ["anxiety", "work-stress", "self-worth"],
  "entryCount": 8,
  "createdAt": "2026-03-15T10:00:00.000Z"
}
```

---

## Learning Library

All routes require authentication.

### GET /api/learning/frameworks

List learning framework tracks and completion progress.

### GET /api/learning/frameworks/:id

Get framework details and lesson-level completion state.

### POST /api/learning/lessons/:id/complete

Mark a lesson as completed.

### POST /api/learning/lessons/:id/assessment

Record a lesson assessment event.

**Request body**
```json
{
  "source": "course",
  "score": 82,
  "passed": true
}
```

**Response `201`**
```json
{
  "message": "Assessment event recorded",
  "lessonId": "cbt-thought-challenging-quiz",
  "score": 82,
  "passed": true
}
```

---

## Impact Hub

All routes require authentication.

### GET /api/impact/profile

Get beneficiary profile with baseline and recent follow-up surveys.

### PUT /api/impact/profile

Update beneficiary group.

### POST /api/impact/survey

Submit one survey (`baseline`, `day7`, `day14`, or `day30`).

### GET /api/impact/campaigns

List outreach campaigns including QR/referral links and funnel counters.

### POST /api/impact/campaigns

Create a campaign with auto-generated `qrToken` and `referralCode`.

### POST /api/impact/campaigns/:id/touchpoints

Record manual outreach reach increments.

### POST /api/impact/campaigns/:id/funnel

Increment one funnel stage for a campaign.

**Request body**
```json
{
  "stage": "scans",
  "count": 1
}
```

**Allowed `stage` values**
- `impressions`
- `scans`
- `signups`
- `activeUsers`
- `completions`

### GET /api/impact/follow-up-reminders

Return due Day 7/14/30 surveys for the current user.

### GET /api/impact/learning-effectiveness

Return aggregate learning assessment metrics and pre/post outcome deltas.

### GET /api/impact/dashboard

Return totals, survey deltas, outreach funnel aggregates, and campaign progress percent.

### GET /api/impact/rbac/roles

List admin scope assignments.

Scope requirement:
- `governance.manage` scope (or full admin)

### POST /api/impact/rbac/roles

Create or update a user role/scope assignment.

**Request body**
```json
{
  "userId": "user-id",
  "role": "admin",
  "scope": "impact.read"
}
```

Allowed scope values:
- `impact.read`
- `impact.write`
- `impact.export`
- `campaign.manage`
- `governance.manage`

Scope requirement:
- `governance.manage` scope (or full admin)

### GET /api/impact/ab-tests

List A/B experiments and configured variants.

Scope requirement:
- `impact.read` scope (or full admin)

### POST /api/impact/ab-tests

Create a new A/B experiment.

**Request body**
```json
{
  "name": "Impact CTA Copy Test",
  "channel": "impact-hub",
  "status": "active",
  "variants": [
    { "key": "control", "weight": 60 },
    { "key": "expanded_copy", "weight": 40 }
  ]
}
```

Scope requirement:
- `impact.write` scope (or full admin)

### POST /api/impact/ab-tests/:id/assign

Assign a deterministic variant for a subject key.

**Request body**
```json
{
  "subjectKey": "user-123"
}
```

Scope requirement:
- `campaign.manage` scope (or full admin)

### GET /api/impact/ab-tests/:id/summary

Return assignment and exposure totals by variant.

Scope requirement:
- `impact.read` scope (or full admin)

### GET /api/impact/ai-audit-summary

Return AI call totals and route-level success metrics.

Scope requirement:
- `governance.manage` scope (or full admin)

### GET /api/impact/cost-monitoring

Return estimated cost totals, monthly trend, category breakdown, and active-user cost metrics.

Scope requirement:
- `governance.manage` scope (or full admin)

### GET /api/impact/evidence-pack

Return evidence export payload with KPI summary and CSV content.

Scope requirement:
- `impact.export` scope (or full admin)

---

## Health & Status

### GET /

Health ping for load balancers. No auth required.

**Response `200`** — plain text
```
MindWeave backend is running
```

### GET /api/health

Structured health check.

**Response `200`**
```json
{ "status": "ok", "timestamp": "2026-03-15T12:00:00.000Z" }
```

---

## Error Format

All error responses use this shape:

```json
{ "error": "Human-readable error message" }
```
