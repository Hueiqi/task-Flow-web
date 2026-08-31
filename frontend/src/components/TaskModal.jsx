import { useEffect, useState } from "react";

const initial = { title: "", description: "", status: "todo", priority: "medium", due_date: "", category: "other", project: "", subtasks: [], reminder_at: "", recurrence: "none" };

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function TaskModal({ mode, task, initialValues, onClose, onSave, onDelete, deleting }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "edit" && task) {
      setForm({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || "",
        category: task.category || "other",
        project: task.project || "",
        subtasks: task.subtasks || [],
        reminder_at: localDateTime(task.reminder_at),
        recurrence: task.recurrence || "none",
      });
    } else {
      setForm({ ...initial, ...initialValues });
    }
    setError("");
  }, [mode, task, JSON.stringify(initialValues)]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addSubtask() {
    set("subtasks", [...form.subtasks, { id: `${Date.now()}`, title: "", done: false }]);
  }

  function updateSubtask(index, patch) {
    set("subtasks", form.subtasks.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form, task ? task.id : null);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{mode === "edit" ? "Edit task" : "New task"}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Submit internship application"
              required
            />
          </label>

          <label>
            Notes
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Add details, links, or notes…"
              rows={4}
            />
          </label>

          <div className="form-row">
            <label>
              Status
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Due date
              <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>
              Category
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="work">Work</option>
                <option value="study">Study</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Project
              <input value={form.project} onChange={(e) => set("project", e.target.value)} placeholder="e.g. Website launch" />
            </label>
            <label>
              Repeat
              <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>

          <label>
            Reminder
            <input type="datetime-local" value={form.reminder_at} onChange={(e) => set("reminder_at", e.target.value)} />
          </label>

          <div className="subtask-editor">
            <div className="subtask-editor-head">
              <span>Subtasks</span>
              <button type="button" className="ghost" onClick={addSubtask}>+ Add step</button>
            </div>
            {form.subtasks.map((item, index) => (
              <div className="subtask-input-row" key={item.id}>
                <input type="checkbox" checked={item.done} onChange={(e) => updateSubtask(index, { done: e.target.checked })} />
                <input value={item.title} onChange={(e) => updateSubtask(index, { title: e.target.value })} placeholder="Subtask title" />
                <button type="button" className="icon-button" aria-label="Remove subtask" onClick={() => set("subtasks", form.subtasks.filter((_, i) => i !== index))}>×</button>
              </div>
            ))}
          </div>

          <footer className="modal-actions">
            {mode === "edit" && (
              <button
                type="button"
                className="danger"
                disabled={saving || deleting}
                onClick={() => onDelete(task.id)}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving || deleting}>
              {saving ? "Saving…" : "Save"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
