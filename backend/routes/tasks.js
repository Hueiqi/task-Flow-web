// routes/tasks.js — full CRUD for tasks, scoped to the logged-in user.
// Every query filters by user_id so one user can never see or modify
// another user's tasks, even if they guess a task id.

import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const VALID_STATUS = ["todo", "in_progress", "done"];
const VALID_PRIORITY = ["low", "medium", "high"];

// GET /api/tasks?status=todo&priority=high  — list, with optional filters
router.get("/", (req, res) => {
  const { status, priority } = req.query;
  let query = "SELECT * FROM tasks WHERE user_id = ?";
  const params = [req.user.id];

  if (status && VALID_STATUS.includes(status)) {
    query += " AND status = ?";
    params.push(status);
  }
  if (priority && VALID_PRIORITY.includes(priority)) {
    query += " AND priority = ?";
    params.push(priority);
  }
  query += " ORDER BY created_at DESC";

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// GET /api/tasks/:id
router.get("/:id", (req, res) => {
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// POST /api/tasks
router.post("/", (req, res) => {
  const { title, description = "", status = "todo", priority = "medium", due_date = null } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUS.join(", ")}` });
  }
  if (!VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: `Priority must be one of: ${VALID_PRIORITY.join(", ")}` });
  }

  const result = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, title.trim(), description, status, priority, due_date);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const {
    title = existing.title,
    description = existing.description,
    status = existing.status,
    priority = existing.priority,
    due_date = existing.due_date,
  } = req.body;

  if (!title.trim()) return res.status(400).json({ error: "Title cannot be empty" });
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUS.join(", ")}` });
  }
  if (!VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: `Priority must be one of: ${VALID_PRIORITY.join(", ")}` });
  }

  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?,
     updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(title.trim(), description, status, priority, due_date, req.params.id, req.user.id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/tasks/:id
router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.status(204).send();
});

export default router;
