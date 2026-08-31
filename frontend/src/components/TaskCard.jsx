import { formatDate, isDueToday, isOverdue, PRIORITY_LABELS } from "../utils.js";

export default function TaskCard({ task, onClick }) {
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <article
      className={`task-card ${overdue ? "is-overdue" : ""} ${dueToday ? "is-due-today" : ""}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(task.id))}
      onClick={onClick}
    >
      <div className="task-card-top">
        <span className={`badge priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
        {(overdue || dueToday || task.due_date) && (
          <span className="due-badge">
            {overdue ? "Overdue" : dueToday ? "Due today" : formatDate(task.due_date)}
          </span>
        )}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p className="task-description">{task.description}</p>}
    </article>
  );
}