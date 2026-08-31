# TaskFlow

TaskFlow is a full-stack task and project management system for the web and Windows desktop. It brings tasks, projects, calendar planning, reminders, analytics, and activity history together in one simple dashboard.

## Main features

- Secure user registration and login
- Create, edit, complete, and delete tasks
- Search tasks by title, description, status, priority, category, or project
- Organize work with projects, categories, priorities, due dates, and subtasks
- Open a project to see its tasks, progress, completed count, and remaining work
- Daily, weekly, and monthly recurring tasks
- Calendar, analytics, notifications, and activity history
- Saved filters, task templates, and bulk task actions
- Responsive web interface and installable Windows desktop application
- Private task data: each user can only access their own tasks

## Technology

| Part | Technology |
| --- | --- |
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express |
| Database | SQLite using Node.js `node:sqlite` |
| Security | JWT authentication and bcrypt password hashing |
| Desktop | Electron and electron-builder |

## Run the web application

Requirements: Node.js 22.5 or newer is recommended because the backend uses `node:sqlite`.

1. Install the backend packages and start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

2. Open another terminal, install the frontend packages, and start the website:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173), register an account, and log in.

The API runs at `http://localhost:4000`. SQLite creates the local database automatically.

## Install the Windows desktop application

Download `TaskFlow Setup 1.0.0.exe` from the latest GitHub release, run the installer, and follow the setup instructions. The desktop version stores its database locally on the computer.

To build the installer yourself:

```powershell
npm install
npm run dist:windows
```

The installer is created inside the `release` folder.

## Project structure

```text
taskflow/
|-- backend/          Express API, authentication, and SQLite database
|-- electron/         Electron desktop application entry point
|-- frontend/         React user interface
|-- release/          Generated Windows installer
|-- package.json      Desktop build configuration
`-- README.md
```

## Main API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET / PUT | `/api/auth/me` | Read or update the user profile |
| GET / POST | `/api/tasks` | List or create tasks |
| GET / PUT / DELETE | `/api/tasks/:id` | Read, update, or delete one task |
| POST | `/api/tasks/bulk` | Update or delete selected tasks |
| GET | `/api/tasks/activity` | Read activity history |
| GET | `/api/tasks/notifications` | Read reminders and overdue alerts |

Authenticated endpoints require a JWT bearer token.

## Privacy and data

TaskFlow stores account and task data in SQLite. Passwords are hashed, and API routes verify that users can only access their own records. Do not commit database files or real credentials to GitHub.

## Future improvements

- Cloud synchronization across devices
- Email and desktop reminder delivery
- Team workspaces and task assignment
- File attachments and comments
- Automated test coverage and GitHub Actions
- Mobile application

## Author

Created by [Hueiqi](https://github.com/Hueiqi).

## License

This project is currently provided for educational and portfolio use. Add a `LICENSE` file before allowing reuse or redistribution.
