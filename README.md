# TaskFlow

A full-stack task manager: React (Vite) frontend, Node/Express REST API, SQLite database, JWT authentication. Built as a complete, deployable CRUD application — the kind of project that's good evidence for a CS internship resume.

## Features

- User registration & login with hashed passwords (bcrypt) and JWT sessions
- Full CRUD on tasks: create, read, update, delete
- Tasks scoped per user — you can only ever see and edit your own
- Filter/status fields: status (`todo` / `in_progress` / `done`) and priority (`low` / `medium` / `high`)
- Kanban-style board UI, responsive down to mobile
- Centralized error handling and input validation on the API

## Tech stack

| Layer      | Technology                          |
|------------|--------------------------------------|
| Frontend   | React 18, React Router, Vite         |
| Backend    | Node.js, Express                     |
| Database   | SQLite (via `better-sqlite3`)        |
| Auth       | JWT + bcrypt password hashing        |

SQLite is used instead of MongoDB/Postgres so the project runs anywhere with **zero external database setup** — no server to install or cloud instance to spin up. Swapping to Postgres later only means changing `backend/db.js`.

## Project structure

```
taskflow/
├── backend/
│   ├── server.js         # Express app entry point
│   ├── db.js              # SQLite schema & connection
│   ├── middleware/auth.js # JWT verification middleware
│   └── routes/
│       ├── auth.js        # register / login
│       └── tasks.js       # task CRUD, scoped to logged-in user
└── frontend/
    └── src/
        ├── api.js          # fetch wrapper + session helpers
        ├── App.jsx         # routes + auth guard
        ├── pages/          # Login, Register, Dashboard
        └── components/     # TaskForm, TaskList (kanban board)
```

## Running it locally

**Requirements:** Node.js 18+

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # optional: edit JWT_SECRET
npm run dev
```

The API runs at `http://localhost:4000`. A `taskflow.db` SQLite file is created automatically on first run.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` requests to the backend automatically (see `vite.config.js`).

### 3. Try it

1. Register a new account
2. Add a few tasks with different statuses/priorities
3. Move a task between columns using the status dropdown, or edit/delete it

## API reference

| Method | Endpoint             | Auth | Description                |
|--------|-----------------------|------|-----------------------------|
| POST   | `/api/auth/register`  | No   | Create an account           |
| POST   | `/api/auth/login`     | No   | Log in, get a JWT           |
| GET    | `/api/tasks`          | Yes  | List your tasks (supports `?status=` and `?priority=`) |
| POST   | `/api/tasks`          | Yes  | Create a task               |
| PUT    | `/api/tasks/:id`      | Yes  | Update a task               |
| DELETE | `/api/tasks/:id`      | Yes  | Delete a task               |

Authenticated requests need `Authorization: Bearer <token>`.

## Deploying it (for your live demo link)

- **Backend:** Render or Railway free tier — set `JWT_SECRET` as an environment variable there.
- **Frontend:** Vercel or Netlify — set the API proxy/base URL to your deployed backend URL.

A live demo link is worth including in your resume/portfolio alongside the GitHub repo — recruiters are far more likely to click a live link than clone and run code.

## Ideas to extend it (good "what I'd add next" talking points for interviews)

- Task search and sorting
- Due-date reminders / overdue highlighting
- Drag-and-drop between columns (`@dnd-kit`)
- Pagination for large task lists
- Automated tests (Jest for backend, React Testing Library for frontend) + GitHub Actions CI

## Suggested resume bullet

> Built TaskFlow, a full-stack task management app (React, Node/Express, SQLite) with JWT authentication and a REST API supporting full CRUD operations, scoped per user with input validation and centralized error handling.

## Suggested cover letter paragraph

> To build hands-on experience with full-stack development, I built TaskFlow, a task management application with a React frontend and a Node/Express REST API backed by SQLite. I implemented JWT-based authentication, designed a normalized database schema, and wrote a fully validated CRUD API — deepening my understanding of how frontend and backend systems communicate in a real application. The project is available on GitHub at [your-repo-link].
