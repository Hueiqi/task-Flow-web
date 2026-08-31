import { inDays, todayStr } from "../utils.js";

export default function StatsBar({ tasks }) {
  const total = tasks.length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== "done" && t.due_date < todayStr()
  ).length;
  const dueSoon = tasks.filter(
    (t) => t.due_date && t.status !== "done" && t.due_date <= inDays(3)
  ).length;
  const completion = total === 0 ? 0 : Math.round((done / total) * 100);

  const cards = [
    { label: "Total tasks", value: total },
    { label: "To do", value: todo },
    { label: "In progress", value: inProgress },
    { label: "Done", value: done },
    { label: "Completed", value: `${completion}%` },
    { label: "Overdue", value: overdue, warn: overdue > 0 },
  ];

  return (
    <div className="stats">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card ${c.warn ? "warn" : ""}`}>
          <span className="stat-value">{c.value}</span>
          <span className="stat-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}