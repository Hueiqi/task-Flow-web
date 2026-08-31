export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isOverdue(task) {
  return Boolean(task.due_date && task.status !== "done" && task.due_date < todayStr());
}

export function isDueToday(task) {
  return Boolean(task.due_date && task.status !== "done" && task.due_date === todayStr());
}

export function isDueSoon(task) {
  return Boolean(task.due_date && task.status !== "done" && task.due_date <= inDays(2));
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: y === new Date().getFullYear() ? undefined : "numeric",
  });
}

export const PRIORITY_LABELS = { high: "High", medium: "Medium", low: "Low" };
export const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export const SORTS = {
  created_at: { label: "Created date", key: "created_at" },
  due_date: { label: "Due date", key: "due_date" },
  priority: { label: "Priority", key: "priority" },
  status: { label: "Status", key: "status" },
  title: { label: "Title", key: "title" },
};

export function compareTasks(a, b) {
  return new Date(b.created_at + "Z") - new Date(a.created_at + "Z");
}