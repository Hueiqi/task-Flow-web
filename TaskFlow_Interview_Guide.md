# TaskFlow Interview Preparation Guide

## 30-second project introduction

“TaskFlow is a full-stack task and project management system that I built with React, Express, SQLite, JWT, and Electron. Users can securely manage their own tasks, group tasks into projects, search and filter work, use subtasks and recurrence, and view calendar, analytics, notifications, and activity history. The same code runs as a website and as an installable Windows desktop application.”

## Architecture you must understand

1. `frontend/src/pages/Dashboard.jsx` holds the main authenticated interface and derives project, calendar, analytics, and filtered views from task data.
2. `frontend/src/api.js` is the only frontend network layer. It adds JSON headers and the JWT bearer token to requests.
3. `backend/server.js` creates the Express application, mounts authentication and task routes, serves the production frontend, and handles errors.
4. `backend/middleware/auth.js` signs JWTs and protects private routes.
5. `backend/routes/auth.js` validates accounts, hashes passwords, logs users in, and updates profiles.
6. `backend/routes/tasks.js` validates task input and implements CRUD, bulk operations, notifications, history, and recurrence.
7. `backend/db.js` creates SQLite tables and runs additive migrations without deleting existing data.
8. `electron/main.cjs` starts the local API, chooses a safe user-data database folder, and opens TaskFlow in an Electron window.

## Code you should be able to explain

### 1. React state and derived data

The dashboard stores server data and UI choices with `useState`. It uses `useEffect` for API loading and `useMemo` for values derived from tasks, such as search results, filtered lists, project progress, and analytics. `useMemo` avoids recalculating those results on unrelated renders.

Key explanation: server state is loaded from the API, while temporary UI state such as the selected navigation page, search text, and open modal stays in React.

### 2. Global search

```jsx
const q = search.trim().toLowerCase();
return tasks.filter((task) =>
  `${task.title} ${task.description || ""} ${task.status}
   ${task.priority} ${task.category || ""} ${task.project || ""}`
    .toLowerCase()
    .includes(q)
);
```

The query and fields are converted to lowercase, then `includes` performs a case-insensitive substring search. Time complexity is approximately O(n × text length), which is suitable for a local small-to-medium task list. For a large cloud system, search should move to indexed database queries or a search service.

### 3. API wrapper and JWT

```js
const token = getToken();
if (token) headers.Authorization = `Bearer ${token}`;
const res = await fetch(path, { ...options, headers });
```

After login, the frontend stores the JWT and sends it on protected API requests. The backend verifies the signature and expiration. JWT proves identity, but authorization still requires every SQL task query to include `user_id = req.user.id`.

Important security improvement: production web deployments should prefer secure, HTTP-only cookies over localStorage to reduce token exposure to cross-site scripting.

### 4. Password security

```js
const passwordHash = bcrypt.hashSync(password, 10);
const valid = bcrypt.compareSync(password, user.password_hash);
```

The database never stores a plain password. Bcrypt adds a salt and work factor. Login compares the submitted password with the stored hash.

### 5. Prepared SQL statements and ownership

```js
db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?")
  .get(req.params.id, req.user.id);
```

Placeholders separate SQL code from values and reduce SQL-injection risk. Adding the authenticated user ID prevents horizontal privilege escalation, where one user changes another user’s task by guessing its ID.

### 6. Input validation

`parseTaskInput` checks required titles, maximum lengths, allowed status/category/priority/recurrence values, valid dates, and safe subtask structure. Validation is required on the backend even when the frontend also validates because API requests can bypass the browser interface.

### 7. Recurring task algorithm

When a repeating task changes from not done to done, the backend calculates the next date and inserts a new `todo` occurrence. The completed record remains unchanged for history. Daily adds one day, weekly adds seven days, and monthly advances the UTC month.

Possible improvement: define rules for month-end dates, time zones, duplicate requests, and tasks without due dates. A transaction or idempotency key could prevent duplicate next occurrences.

### 8. Project progress

Projects are currently derived by grouping tasks with the same `project` text. Progress is:

```text
completed task count / total task count × 100
```

This simple design avoids another table. A larger team system should use a separate `projects` table with project IDs, owners, members, descriptions, and permissions.

### 9. SQLite migrations

`backend/db.js` reads `PRAGMA table_info(tasks)` and only adds missing columns. This preserves existing user data when new features are introduced. SQLite is a strong local desktop choice because it is embedded and requires no separate database server.

### 10. Electron desktop packaging

Electron starts Express on a local-only address and loads it in `BrowserWindow`. `contextIsolation`, disabled Node integration, and sandboxing reduce renderer risk. The database is placed in Electron’s user-data directory so installer updates do not overwrite it.

## REST API questions

| Method | Endpoint | Meaning |
| --- | --- | --- |
| POST | `/api/auth/register` | Validate and create an account |
| POST | `/api/auth/login` | Verify credentials and return JWT |
| GET / PUT | `/api/auth/me` | Read or update profile |
| GET / POST | `/api/tasks` | List or create tasks |
| GET / PUT / DELETE | `/api/tasks/:id` | Operate on one owned task |
| POST | `/api/tasks/bulk` | Change or delete selected owned tasks |
| GET | `/api/tasks/activity` | Return the latest audit entries |
| GET | `/api/tasks/notifications` | Derive reminder and overdue messages |

Know these status codes: `200` success, `201` created, `204` deleted with no body, `400` invalid request, `401` unauthenticated, `404` missing resource, `409` duplicate email, and `500` unexpected server error.

## Database relationships

- One user owns many tasks.
- One user owns many activity-history records.
- `tasks.user_id` and `activity_history.user_id` are foreign keys to `users.id`.
- Deleting a user cascades to their tasks and history.
- `task_id` in activity history is optional because delete and bulk events may refer to a task that no longer exists.

## Common interview questions and good answers

### Why did you choose SQLite?

It provides persistent relational storage without a separate database server, making it ideal for a desktop and academic system. For multi-user cloud scale, I would migrate to PostgreSQL.

### How do you protect user data?

Passwords are bcrypt-hashed, protected routes verify JWTs, input is validated, SQL uses placeholders, and every task operation is scoped to the authenticated user ID.

### What was the most difficult part?

A good answer is unifying many features in one dashboard while keeping server data, filters, views, and modal operations consistent. Explain how one task dataset is transformed into focused derived views rather than duplicating data.

### What would you improve first?

Add automated tests, production secrets and secure cookies, PostgreSQL/cloud deployment, normalized project/subtask tables, pagination, accessibility review, and team roles.

### How would you scale the system?

Move SQLite to PostgreSQL, paginate task queries, perform filtering/search in SQL, add indexes on `user_id`, `status`, `due_date`, and project ID, introduce centralized logging, cache expensive analytics, and deploy the frontend/API independently.

### What happens when the API returns 401?

The API wrapper clears the saved session and reports that the session expired. The UI then requires login again.

### How do frontend and backend communicate?

The frontend sends HTTP requests containing JSON. Express parses JSON, routes the request, verifies authentication, executes prepared SQL, and returns JSON plus an HTTP status code.

## Honest limitations to mention

- Automated tests are limited; the current evidence mainly covers integration and build testing.
- The desktop JWT secret is fixed for local use and should not be copied to a public network deployment.
- Tokens in localStorage have XSS risk.
- Projects and subtasks are not fully normalized database entities.
- Notifications are computed when requested rather than delivered by a background scheduler.
- SQLite is local and does not synchronize between devices.

Interviewers value honest engineering judgment. Explain why the current design is suitable for version 1.0 and how you would strengthen it for production.

## Five-minute demonstration order

1. Register or log in and explain JWT authentication.
2. Create a task with a project, category, date, reminder, recurrence, and subtasks.
3. Search for it and demonstrate filters and sorting.
4. Open the project detail and explain progress calculation.
5. Complete or edit the task and show activity history and notification changes.
6. Show the database schema and one protected API route in the code.
7. End with the architecture diagram and future improvements.

## Final checklist

- Practise the 30-second introduction without reading it.
- Know the three database tables and their relationships.
- Explain authentication versus authorization.
- Explain one React `useMemo` transformation.
- Explain one Express route from request to SQL to response.
- Explain one security decision and one remaining risk.
- Prepare one bug you solved and what you learned.
- Never claim automated tests or production security that the project does not yet have.
