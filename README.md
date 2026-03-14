# MindWeave

AI-enhanced journaling app that helps users reframe thoughts using therapeutic frameworks (CBT, Iceberg Model, Growth Mindset), profiles users via journal entries, and matches them into collaborative "think tanks."

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router
- **Backend:** Node.js + TypeScript + Express + Prisma + SQLite
- **AI:** Google Gemini API (`@google/generative-ai`)

---

## 10-Day Development Plan

### Day 1 – Project Setup & Scaffolding
- Initialize backend: `npm init`, install Express, TypeScript, Prisma, dotenv, cors.
- Initialize frontend: Vite + React + TypeScript template, Tailwind CSS, shadcn/ui.
- Create folder structure for both backend and frontend.
- Verify both servers start without errors.

### Day 2 – Database Schema & Prisma
- Define Prisma schema (User, Entry, ThinkTank, Membership models).
- Run `npx prisma migrate dev` to create SQLite database.
- Write seed script to populate predefined think tanks.
- Test database operations with Prisma Studio (`npx prisma studio`).

### Day 3 – Backend: Journal Entry API
- Implement `POST /api/entries` (create entry, call Gemini for reframing).
- Implement `GET /api/entries` (list entries for user).
- Implement `GET /api/entries/:id` (single entry).
- Add middleware for extracting `x-anonymous-id` header.
- Test endpoints with Postman/curl.

### Day 4 – Backend: AI Integration (Gemini)
- Set up Gemini service with prompt templates for CBT, Iceberg, Growth Mindset.
- Implement tag extraction via Gemini.
- Handle API errors gracefully (rate limits, network issues).
- Fine-tune prompts for quality responses.

### Day 5 – Backend: Gamification & User Profile
- Implement level calculation logic.
- Implement badge logic (First Entry, Consistent, Deep Diver).
- Implement `GET /api/user/profile`.
- Add gamification update after each entry creation.

### Day 6 – Backend: Think Tanks
- Implement `GET /api/thinktanks` (list all).
- Implement `GET /api/thinktanks/available` (filtered by user tags).
- Implement `POST /api/thinktanks/:id/join`.
- Test tag-matching logic.

### Day 7 – Frontend: Journal Entry Form & History
- Build journal entry form (text area + framework dropdown + submit).
- Display reframed result after submission.
- Build journal history list page.
- Build entry detail view.

### Day 8 – Frontend: User Profile & Gamification
- Build profile page showing level, badges, tags.
- Add visual indicators for badges (icons/labels).
- Connect to backend profile API.

### Day 9 – Frontend: Think Tanks & Navigation
- Build think tanks list page.
- Build individual think tank page (members list).
- Add join functionality.
- Polish navigation with React Router.

### Day 10 – Polish, Testing & Documentation
- End-to-end testing of all flows.
- Error handling and loading states in UI.
- Responsive design tweaks.
- Final README updates and cleanup.

---

## Setup Instructions

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Google Gemini API Key** – Get one at https://aistudio.google.com/app/apikey

### 1. Clone / Download the Project

```bash
cd MindWeave_App
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your `.env` file (or edit the existing one):
```
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-gemini-api-key-here"
PORT=3001
```

Set up the database:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Start the backend server:
```bash
npm run dev
```

The backend will run at `http://localhost:3001`.

### 3. Frontend Setup

Open a new terminal:
```bash
cd frontend
npm install
```

Start the frontend dev server:
```bash
npm run dev
```

The frontend will run at `http://localhost:5173`.

### 4. Using the App

1. Open `http://localhost:5173` in your browser.
2. An anonymous user ID is automatically generated and stored in localStorage.
3. Write a journal entry, select a framework, and submit.
4. View your reframed thoughts, journal history, profile (tags, level, badges), and available think tanks.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/entries` | Create journal entry with AI reframing |
| GET | `/api/entries` | List all entries for user |
| GET | `/api/entries/:id` | Get single entry details |
| GET | `/api/user/profile` | Get user profile (level, badges, tags) |
| GET | `/api/thinktanks` | List all think tanks |
| GET | `/api/thinktanks/available` | Think tanks matching user's tags |
| POST | `/api/thinktanks/:id/join` | Join a think tank |

All endpoints expect `x-anonymous-id` header for user identification.

---

## Project Structure

```
MindWeave_App/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── entries.ts
│   │   │   ├── user.ts
│   │   │   └── thinktanks.ts
│   │   └── services/
│   │       ├── gemini.ts
│   │       └── gamification.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ui/ (shadcn components)
│   │   ├── context/
│   │   │   └── UserContext.tsx
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── EntryDetailPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── ThinkTanksPage.tsx
│   │   │   └── ThinkTankDetailPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── components.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```
