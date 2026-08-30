const COLUMNS = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const PRIORITY_LABEL = { low: "Low", medium: "Medium", high: "High" };

export default function TaskList({ tasks, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.key);
        return (
          <div className="column" key={col.key}>
            <div className={`column-tab tab-${col.key}`}>
              <span>{col.label}</span>
              <span className="count">{items.length}</span>
            </div>

            <div className="column-body">
              {items.length === 0 && <p className="empty-hint">Nothing here yet.</p>}

              {items.map((task) => (
                <div className="task-card" key={task.id}>
                  <div className="task-card-top">
                    <span className={`priority-dot priority-${task.priority}`} />
                    <span className="priority-label">{PRIORITY_LABEL[task.priority]}</span>
                    {task.due_date && <span className="due-date">Due {task.due_date}</span>}
                  </div>

                  <h3>{task.title}</h3>
                  {task.description && <p className="task-desc">{task.description}</p>}

                  <div className="task-card-actions">
                    <select value={task.status} onChange={(e) => onStatusChange(task, e.target.value)}>
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button className="link-btn" onClick={() => onEdit(task)}>
                      Edit
                    </button>
                    <button className="link-btn danger" onClick={() => onDelete(task)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
