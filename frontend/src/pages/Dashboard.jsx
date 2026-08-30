import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearSession, getCurrentUser } from "../api.js";
import TaskForm from "../components/TaskForm.jsx";
import TaskList from "../components/TaskList.jsx";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const user = getCurrentUser();
  const navigate = useNavigate();

  const loadTasks = useCallback(async () => {
    try {
      setError("");
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  async function handleSave(taskData) {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskData);
      } else {
        await api.createTask(taskData);
      }
      setShowForm(false);
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(task) {
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    try {
      await api.deleteTask(task.id);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(task, status) {
    try {
      await api.updateTask(task.id, { ...task, status });
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark small">TF</span>
          <span>TaskFlow</span>
        </div>
        <div className="topbar-right">
          <span className="user-greeting">Hi, {user?.name?.split(" ")[0]}</span>
          <button className="ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-heading">
          <h1>Your board</h1>
          <button
            className="primary"
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
          >
            + New task
          </button>
        </div>

        {error && <div className="alert">{error}</div>}

        {showForm && (
          <div className="form-panel">
            <h2>{editingTask ? "Edit task" : "New task"}</h2>
            <TaskForm
              initialTask={editingTask}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
            />
          </div>
        )}

        {loading ? (
          <p className="empty-hint">Loading your tasks…</p>
        ) : tasks.length === 0 && !showForm ? (
          <div className="empty-state">
            <p>No tasks yet. Add your first one to get started.</p>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onEdit={(task) => {
              setEditingTask(task);
              setShowForm(true);
            }}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
}
