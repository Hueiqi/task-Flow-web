const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
router.use(requireAuth);

const STATUSES = ["todo", "in_progress", "done"];
const PRIORITIES = ["low", "medium", "high"];
const CATEGORIES = ["work", "study", "personal", "other"];
const RECURRENCES = ["none", "daily", "weekly", "monthly"];
const SORTS = { created_at: "created_at", due_date: "due_date", title: "title", priority: "CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END", status: "CASE status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END" };

function hydrate(task) {
  if (!task) return task;
  try { task.subtasks = JSON.parse(task.subtasks || "[]"); } catch { task.subtasks = []; }
  return task;
}
function record(userId, taskId, action, details = "") {
  db.prepare("INSERT INTO activity_history (user_id, task_id, action, details) VALUES (?, ?, ?, ?)").run(userId, taskId || null, action, details);
}
function parseTaskInput(body, partial = false) {
  const value = {};
  const fail = (error) => ({ error });
  if (!partial && (!body.title || typeof body.title !== "string")) return fail("Title is required");
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) return fail("Title is required");
    if (body.title.trim().length > 200) return fail("Title must be 200 characters or fewer");
    value.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return fail("Description must be text");
    value.description = body.description.trim();
  }
  if (body.status !== undefined) { if (!STATUSES.includes(body.status)) return fail("Invalid status"); value.status = body.status; }
  if (body.priority !== undefined) { if (!PRIORITIES.includes(body.priority)) return fail("Invalid priority"); value.priority = body.priority; }
  if (body.category !== undefined) { if (!CATEGORIES.includes(body.category)) return fail("Invalid category"); value.category = body.category; }
  if (body.recurrence !== undefined) { if (!RECURRENCES.includes(body.recurrence)) return fail("Invalid recurrence"); value.recurrence = body.recurrence; }
  if (body.project !== undefined) { if (typeof body.project !== "string" || body.project.length > 100) return fail("Project is too long"); value.project = body.project.trim(); }
  if (body.subtasks !== undefined) {
    if (!Array.isArray(body.subtasks) || body.subtasks.length > 100) return fail("Invalid subtasks");
    value.subtasks = JSON.stringify(body.subtasks.map((item, index) => ({ id: String(item.id || `${Date.now()}-${index}`), title: String(item.title || "").trim().slice(0, 200), done: Boolean(item.done) })).filter((item) => item.title));
  }
  for (const field of ["due_date", "reminder_at"]) {
    if (body[field] === null || body[field] === "") value[field] = null;
    else if (body[field] !== undefined) {
      if (Number.isNaN(Date.parse(body[field]))) return fail(`${field === "due_date" ? "Due date" : "Reminder"} is invalid`);
      value[field] = field === "due_date" ? new Date(body[field]).toISOString().slice(0, 10) : new Date(body[field]).toISOString();
    }
  }
  return { value };
}
function nextDate(dateString, recurrence) {
  if (!dateString || recurrence === "none") return null;
  const date = new Date(`${dateString}T12:00:00Z`);
  if (recurrence === "daily") date.setUTCDate(date.getUTCDate() + 1);
  if (recurrence === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (recurrence === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

router.get("/activity", (req, res) => {
  const activity = db.prepare("SELECT * FROM activity_history WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100").all(req.user.id);
  res.json({ activity });
});
router.get("/notifications", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id=? AND status!='done'").all(req.user.id).map(hydrate);
  const today = new Date().toISOString().slice(0, 10);
  const soon = Date.now() + 86400000;
  const notifications = [];
  for (const task of tasks) {
    if (task.reminder_at && new Date(task.reminder_at).getTime() <= soon) notifications.push({ id: `reminder-${task.id}`, type: "reminder", task_id: task.id, title: task.title, message: "Reminder is due", date: task.reminder_at });
    if (task.due_date && task.due_date < today) notifications.push({ id: `overdue-${task.id}`, type: "overdue", task_id: task.id, title: task.title, message: "Task is overdue", date: task.due_date });
  }
  res.json({ notifications });
});
router.post("/bulk", (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  if (!ids.length) return res.status(400).json({ error: "Select at least one task" });
  const placeholders = ids.map(() => "?").join(",");
  const owned = db.prepare(`SELECT id FROM tasks WHERE user_id=? AND id IN (${placeholders})`).all(req.user.id, ...ids).map((row) => row.id);
  if (!owned.length) return res.status(404).json({ error: "Tasks not found" });
  const marks = owned.map(() => "?").join(",");
  if (req.body.action === "delete") {
    db.prepare(`DELETE FROM tasks WHERE user_id=? AND id IN (${marks})`).run(req.user.id, ...owned);
    record(req.user.id, null, "bulk_deleted", `${owned.length} tasks deleted`);
  } else if (req.body.action === "status" && STATUSES.includes(req.body.status)) {
    db.prepare(`UPDATE tasks SET status=?,updated_at=datetime('now') WHERE user_id=? AND id IN (${marks})`).run(req.body.status, req.user.id, ...owned);
    record(req.user.id, null, "bulk_updated", `${owned.length} tasks changed to ${req.body.status}`);
  } else return res.status(400).json({ error: "Invalid bulk action" });
  res.json({ updated: owned.length });
});
router.get("/", (req, res) => {
  const { q, status, priority, sort, order, category, project } = req.query;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: "Invalid priority" });
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: "Invalid category" });
  if (sort && !(sort in SORTS)) return res.status(400).json({ error: "Invalid sort" });
  const where = ["user_id=?"]; const params = [req.user.id];
  if (q) { where.push("(title LIKE ? OR description LIKE ? OR project LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (status) { where.push("status=?"); params.push(status); }
  if (priority) { where.push("priority=?"); params.push(priority); }
  if (category) { where.push("category=?"); params.push(category); }
  if (project) { where.push("project=?"); params.push(project); }
  const direction = (order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const tasks = db.prepare(`SELECT * FROM tasks WHERE ${where.join(" AND ")} ORDER BY ${sort ? SORTS[sort] : "created_at"} ${direction},id DESC`).all(...params).map(hydrate);
  res.json({ tasks });
});
router.post("/", (req, res) => {
  const parsed = parseTaskInput(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const v = { description: "", status: "todo", priority: "medium", due_date: null, category: "other", project: "", subtasks: "[]", reminder_at: null, recurrence: "none", ...parsed.value };
  const info = db.prepare("INSERT INTO tasks (user_id,title,description,status,priority,due_date,category,project,subtasks,reminder_at,recurrence) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(req.user.id, v.title, v.description, v.status, v.priority, v.due_date, v.category, v.project, v.subtasks, v.reminder_at, v.recurrence);
  const task = hydrate(db.prepare("SELECT * FROM tasks WHERE id=?").get(info.lastInsertRowid));
  record(req.user.id, task.id, "created", `Created “${task.title}”`);
  res.status(201).json({ task });
});
router.get("/:id", (req, res) => {
  const task = hydrate(db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(req.params.id, req.user.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});
router.put("/:id", (req, res) => {
  const old = db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!old) return res.status(404).json({ error: "Task not found" });
  const parsed = parseTaskInput(req.body, true);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const v = { ...old, ...parsed.value };
  db.prepare("UPDATE tasks SET title=?,description=?,status=?,priority=?,due_date=?,category=?,project=?,subtasks=?,reminder_at=?,recurrence=?,updated_at=datetime('now') WHERE id=?").run(v.title, v.description, v.status, v.priority, v.due_date, v.category, v.project, v.subtasks, v.reminder_at, v.recurrence, old.id);
  if (old.status !== "done" && v.status === "done" && v.recurrence !== "none") {
    db.prepare("INSERT INTO tasks (user_id,title,description,status,priority,due_date,category,project,subtasks,reminder_at,recurrence) VALUES (?,?,?,'todo',?,?,?,?,?,?,?)").run(req.user.id, v.title, v.description, v.priority, nextDate(v.due_date, v.recurrence), v.category, v.project, v.subtasks, null, v.recurrence);
  }
  const task = hydrate(db.prepare("SELECT * FROM tasks WHERE id=?").get(old.id));
  record(req.user.id, task.id, "updated", `Updated “${task.title}”`);
  res.json({ task });
});
router.delete("/:id", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").run(req.params.id, req.user.id);
  record(req.user.id, null, "deleted", `Deleted “${task.title}”`);
  res.status(204).end();
});

module.exports = router;
