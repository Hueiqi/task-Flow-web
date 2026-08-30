import { useState, useEffect } from "react";

const EMPTY = { title: "", description: "", status: "todo", priority: "medium", due_date: "" };

export default function TaskForm({ initialTask, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm(initialTask ? { ...EMPTY, ...initialTask, due_date: initialTask.due_date || "" } : EMPTY);
  }, [initialTask]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, due_date: form.due_date || null });
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Finish DSA assignment"
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Optional details…"
          rows={3}
        />
      </label>

      <div className="form-row">
        <label>
          Status
          <select value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>

        <label>
          Priority
          <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Due date
          <input type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="primary">
          {initialTask ? "Save changes" : "Add task"}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
