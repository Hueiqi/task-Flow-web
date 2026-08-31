import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { clearSession, getStoredUser, getToken } from "../api.js";
import { isOverdue, todayStr, inDays } from "../utils.js";
import TaskModal from "../components/TaskModal.jsx";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "🏠" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "calendar", label: "Calendar", icon: "📅" },
  { key: "products", label: "Projects", icon: "📁" },
  { key: "activity", label: "Activity", icon: "🕘" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "templates", label: "Templates", icon: "📄" },
  { key: "customers", label: "Profile", icon: "👤" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

const NAV_LABELS = Object.fromEntries(NAV_ITEMS.map(({ key, label }) => [key, label]));

const STATUS_META = {
  done: { label: "Done", color: "#2f9e6e", bg: "#E6F7EE" },
  in_progress: { label: "In progress", color: "#52b788", bg: "#D9F3E4" },
  todo: { label: "To do", color: "#74c69d", bg: "#EDF9F2" },
};

const PRIORITY_META = {
  high: { label: "High", color: "#2f9e6e", bg: "#E6F7EE" },
  medium: { label: "Medium", color: "#52b788", bg: "#D9F3E4" },
  low: { label: "Low", color: "#74c69d", bg: "#EDF9F2" },
};

const PAGE_SIZES = [8, 12, 20];

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };
const STATUS_RANK = { todo: 0, in_progress: 1, done: 2 };

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [savedFilters, setSavedFilters] = useState(() => JSON.parse(localStorage.getItem("tf_saved_filters") || "[]"));
  const [templates, setTemplates] = useState(() => JSON.parse(localStorage.getItem("tf_templates") || "[]"));
  const [selectedProject, setSelectedProject] = useState(null);

  const [prefs, setPrefs] = useState(() => ({
    showDescriptions: localStorage.getItem("tf_show_desc") !== "false",
    denseMode: localStorage.getItem("tf_dense") === "true",
    emailNotif: localStorage.getItem("tf_email") === "true",
    defaultPriority: localStorage.getItem("tf_default_priority") || "medium",
  }));

  const user = getStoredUser();
  const authed = Boolean(getToken());

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function setPref(patch) {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      Object.entries({
        showDescriptions: "tf_show_desc",
        denseMode: "tf_dense",
        emailNotif: "tf_email",
        defaultPriority: "tf_default_priority",
      }).forEach(([k, key]) => {
        localStorage.setItem(key, next[k]);
      });
      return next;
    });
  }

  function handleLogout() {
    clearSession();
    showToast("Signed out");
    setTimeout(() => (window.location.href = "/login"), 600);
  }

  function loadTasks() {
    let active = true;
    setLoading(true);
    setLoadError("");
    api
      .getTasks()
      .then(({ tasks }) => {
        if (active) setTasks(tasks);
      })
      .catch((err) => {
        if (active) setLoadError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    return loadTasks();
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    api.getActivity().then(({ activity }) => setActivity(activity)).catch(() => {});
    api.getNotifications().then(({ notifications }) => setNotifications(notifications)).catch(() => {});
  }, [authed, tasks.length]);

  async function handleSave(form, id) {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      category: form.category,
      project: form.project.trim(),
      subtasks: form.subtasks,
      reminder_at: form.reminder_at || null,
      recurrence: form.recurrence,
    };
    if (id) await api.updateTask(id, payload);
    else await api.createTask(payload);
    setModal(null);
    loadTasks();
    showToast(id ? "Task updated" : "Task created");
  }

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await api.deleteTask(id);
      setModal(null);
      loadTasks();
      showToast("Task deleted");
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulk(action, status) {
    await api.bulkTasks({ ids: selected, action, status });
    setSelected([]);
    loadTasks();
    showToast(`${selected.length} tasks updated`);
  }

  function saveCurrentFilter() {
    const name = window.prompt("Name this filter");
    if (!name) return;
    const next = [...savedFilters, { id: Date.now(), name, search, statusFilter, priorityFilter, categoryFilter, projectFilter }];
    setSavedFilters(next);
    localStorage.setItem("tf_saved_filters", JSON.stringify(next));
    showToast("Filter saved");
  }

  function applySavedFilter(filter) {
    setSearch(filter.search || ""); setStatusFilter(filter.statusFilter || "All");
    setPriorityFilter(filter.priorityFilter || "All"); setCategoryFilter(filter.categoryFilter || "All");
    setProjectFilter(filter.projectFilter || "All"); setPage(1);
  }

  function saveTemplate(task) {
    const next = [...templates, { ...task, id: Date.now(), title: `${task.title} template`, status: "todo", due_date: "", reminder_at: "" }];
    setTemplates(next);
    localStorage.setItem("tf_templates", JSON.stringify(next));
    showToast("Template saved");
  }

  const searchedTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) =>
      `${task.title} ${task.description || ""} ${task.status} ${task.priority} ${task.category || ""} ${task.project || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [tasks, search]);

  const filtered = useMemo(() => {
    let rows = searchedTasks.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (projectFilter !== "All" && t.project !== projectFilter) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      else if (sortKey === "status") cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      else if (sortKey === "due_date") {
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) cmp = 1;
        else if (!b.due_date) cmp = -1;
        else cmp = a.due_date.localeCompare(b.due_date);
      } else {
        cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      }
      return cmp * dir;
    });
    return rows;
  }, [searchedTasks, statusFilter, priorityFilter, categoryFilter, projectFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter(
      (t) => t.due_date && t.status !== "done" && t.due_date < todayStr()
    ).length;
    const completion = total === 0 ? 0 : Math.round((done / total) * 100);
    const dueSoon = tasks.filter(
      (t) => t.due_date && t.status !== "done" && t.due_date <= inDays(3)
    ).length;
    return [
      { label: "Total Tasks", value: total, color: "#2f9e6e", soft: "#E6F7EE", icon: "📋", filter: { status: "All", priority: "All" } },
      { label: "To do", value: todo, color: "#74c69d", soft: "#EDF9F2", icon: "📝", filter: { status: "todo", priority: "All" } },
      { label: "In progress", value: inProgress, color: "#52b788", soft: "#D9F3E4", icon: "⏳", filter: { status: "in_progress", priority: "All" } },
      { label: "Done", value: done, color: "#2f9e6e", soft: "#E6F7EE", icon: "✅", filter: { status: "done", priority: "All" } },
      { label: "Overdue", value: overdue, color: "#d9485f", soft: "#FEF2F2", icon: "⚠️", filter: { status: "All", priority: "All", overdue: true } },
      { label: "Completed", value: `${completion}%`, color: "#52b788", soft: "#D9F3E4", icon: "🎯", filter: { status: "All", priority: "All" } },
    ];
  }, [tasks]);

  function applyStatFilter(s) {
    setStatusFilter(s.filter.status || "All");
    setPriorityFilter(s.filter.priority || "All");
    setPage(1);
    setActiveNav("dashboard");
    showToast(`Showing: ${s.label}`);
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "due_date" || key === "created_at" ? "desc" : "asc");
    }
  }

  function SortArrow() {
    return <span className="admin-sort-arrow">⇅</span>;
  }

  const analytics = useMemo(() => {
    const total = tasks.length || 1;
    const byStatus = Object.entries(STATUS_META).map(([k, m]) => ({
      key: k,
      label: m.label,
      count: tasks.filter((t) => t.status === k).length,
      pct: Math.round((tasks.filter((t) => t.status === k).length / total) * 100),
      color: m.color,
    }));
    const byPriority = Object.entries(PRIORITY_META).map(([k, m]) => ({
      key: k,
      label: m.label,
      count: tasks.filter((t) => t.priority === k).length,
      pct: Math.round((tasks.filter((t) => t.priority === k).length / total) * 100),
      color: m.color,
    }));
    const dueSoonCount = tasks.filter(
      (t) => t.due_date && t.status !== "done" && t.due_date <= inDays(7)
    ).length;
    return { byStatus, byPriority, dueSoonCount };
  }, [tasks]);

  const products = useMemo(() => {
    const map = new Map();
    searchedTasks.forEach((t) => {
      const project = t.project || "No project";
      map.set(project, (map.get(project) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([title, count]) => ({
        title,
        count,
        status: searchedTasks.filter((t) => (t.project || "No project") === title && t.status === "done").length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [searchedTasks]);

  const projectTasks = useMemo(
    () => selectedProject ? tasks.filter((task) => (task.project || "No project") === selectedProject) : [],
    [tasks, selectedProject]
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-logo">TF</span>
          <span>TaskFlow</span>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`admin-nav-item ${activeNav === key ? "active" : ""}`}
              title={label}
              aria-label={label}
              onClick={() => {
                setActiveNav(key);
                showToast(`View: ${key.charAt(0).toUpperCase() + key.slice(1)}`);
              }}
            >
              <span className="admin-nav-icon" aria-hidden="true">{icon}</span>
              <span className="admin-nav-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <span className="admin-avatar">{user ? user.name.charAt(0).toUpperCase() : "?"}</span>
            <div className="admin-user-info">
              <strong>{user ? user.name : "Guest"}</strong>
              <span>{user ? user.email : "Not signed in"}</span>
            </div>
          </div>
          <button className="admin-logout" onClick={handleLogout}>🚪 Sign out</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-title">
              {NAV_LABELS[activeNav]}
            </h1>
            <p className="admin-subtitle">
              {!authed
                ? "Sign in to see your tasks"
                : activeNav === "dashboard"
                ? "Overview of your tasks"
                : activeNav === "analytics"
                ? "Breakdown of your task data"
                : activeNav === "calendar"
                ? "Tasks organized by due date"
                : activeNav === "products"
                ? "Tasks grouped into projects"
                : activeNav === "activity"
                ? "Recent changes to your tasks"
                : activeNav === "notifications"
                ? "Reminders and overdue tasks"
                : activeNav === "templates"
                ? "Reusable starting points for new tasks"
                : activeNav === "customers"
                ? "Your account information"
                : "Application preferences"}
            </p>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-search">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                aria-label="Search tasks and projects"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search tasks, projects, categories…"
              />
              {search && <button className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}>×</button>}
            </div>
            {search && <span className="search-result-count">{searchedTasks.length} found</span>}
            <button
              className="admin-btn primary"
              onClick={() => setModal({ mode: "create" })}
            >
              + New task
            </button>
          </div>
        </header>

        {!authed ? (
          <section className="admin-table-card admin-empty-card">
            <div className="admin-empty">
              <div className="admin-empty-emoji admin-bounce-icon">🔐</div>
              <h2>Sign in to view your tasks</h2>
              <p>The TaskFlow admin dashboard requires a signed-in account.</p>
              <Link to="/login"><button className="admin-btn primary">Sign in</button></Link>
            </div>
          </section>
        ) : (
          <>
            {activeNav === "dashboard" && (
              <div className="admin-stats">
                {stats.map((s) => (
                  <button key={s.label} className="admin-stat-card" onClick={() => applyStatFilter(s)}>
                    <span className="admin-stat-icon" style={{ background: s.soft, color: s.color }}>
                      {s.icon}
                    </span>
                    <div className="admin-stat-body">
                      <span className="admin-stat-label">{s.label}</span>
                      <span className="admin-stat-value">{s.value}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeNav === "dashboard" && (
              <section className="admin-table-card">
                <div className="admin-table-toolbar">
                  <h2>Your Tasks</h2>
                  <div className="admin-filter-group">
                    <label>
                      Status
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                      >
                        {["All", "todo", "in_progress", "done"].map((s) => (
                          <option key={s} value={s}>
                            {s === "All" ? "All" : STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Priority
                      <select
                        value={priorityFilter}
                        onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                      >
                        {["All", "high", "medium", "low"].map((p) => (
                          <option key={p} value={p}>
                            {p === "All" ? "All" : PRIORITY_META[p].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Category
                      <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
                        <option value="All">All</option>
                        <option value="work">Work</option>
                        <option value="study">Study</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label>
                      Project
                      <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}>
                        <option value="All">All</option>
                        {[...new Set(tasks.map((task) => task.project).filter(Boolean))].map((project) => <option key={project}>{project}</option>)}
                      </select>
                    </label>
                    <button className="admin-btn" onClick={saveCurrentFilter}>Save filter</button>
                    <span className="admin-count">{filtered.length} tasks</span>
                  </div>
                </div>

                {savedFilters.length > 0 && (
                  <div className="saved-filter-row">
                    <span>Saved filters:</span>
                    {savedFilters.map((filter) => <button key={filter.id} className="admin-chip" onClick={() => applySavedFilter(filter)}>{filter.name}</button>)}
                  </div>
                )}

                {selected.length > 0 && (
                  <div className="bulk-toolbar">
                    <strong>{selected.length} selected</strong>
                    <button onClick={() => handleBulk("status", "done")}>Mark done</button>
                    <button onClick={() => handleBulk("status", "in_progress")}>In progress</button>
                    <button className="danger" onClick={() => handleBulk("delete")}>Delete</button>
                  </div>
                )}

                <div className="admin-table-wrap">
                  <table className={`admin-table ${prefs.denseMode ? "dense" : ""}`}>
                    <thead>
                      <tr>
                        <th><input type="checkbox" aria-label="Select all visible tasks" checked={pageRows.length > 0 && pageRows.every((task) => selected.includes(task.id))} onChange={(e) => setSelected(e.target.checked ? [...new Set([...selected, ...pageRows.map((task) => task.id)])] : selected.filter((id) => !pageRows.some((task) => task.id === id)))} /></th>
                        <th onClick={() => toggleSort("title")}>Task ⁄ Title ⇅</th>
                        <th onClick={() => toggleSort("status")}>Status ⇅</th>
                        <th onClick={() => toggleSort("priority")}>Priority ⇅</th>
                        <th className="num" onClick={() => toggleSort("due_date")}>Due date ⇅</th>
                        <th className="num" onClick={() => toggleSort("created_at")}>Created ⇅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="admin-empty-row">Loading your tasks…</td></tr>
                      ) : pageRows.length === 0 ? (
                        <tr><td colSpan={6} className="admin-empty-row">
                          {tasks.length === 0
                            ? "No tasks yet. Create your first task above."
                            : "No tasks match your filters."}
                        </td></tr>
                      ) : (
                        pageRows.map((t) => {
                          const s = STATUS_META[t.status] || STATUS_META.todo;
                          const p = PRIORITY_META[t.priority] || PRIORITY_META.medium;
                          const ov = isOverdue(t);
                          return (
                            <tr key={t.id}>
                              <td><input type="checkbox" aria-label={`Select ${t.title}`} checked={selected.includes(t.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, t.id] : selected.filter((id) => id !== t.id))} /></td>
                              <td onClick={() => setModal({ mode: "edit", task: t })} className="admin-task-cell">
                                <div className="admin-task-title">{t.title}</div>
                                {prefs.showDescriptions && t.description && (
                                  <div className="admin-task-desc">{t.description}</div>
                                )}
                                <div className="task-meta-line">
                                  <span>{t.category || "other"}</span>
                                  {t.project && <span>📁 {t.project}</span>}
                                  {t.recurrence !== "none" && <span>↻ {t.recurrence}</span>}
                                  {t.subtasks?.length > 0 && <span>☑ {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}</span>}
                                  <button className="template-link" onClick={(e) => { e.stopPropagation(); saveTemplate(t); }}>Save template</button>
                                </div>
                              </td>
                              <td>
                                <span className="admin-status" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                              </td>
                              <td>
                                <span className="admin-status" style={{ color: p.color, background: p.bg }}>{p.label}</span>
                              </td>
                              <td className={`admin-date ${ov ? "overdue" : ""}`}>
                                {t.due_date || "—"}
                                {ov && <span className="admin-ov"> overdue</span>}
                              </td>
                              <td className="admin-date">{t.created_at ? t.created_at.slice(0, 10) : "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-pagination">
                  <div className="admin-page-size">
                    <label>
                      Rows per page
                      <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                        {PAGE_SIZES.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <span className="admin-range">
                    Showing {(safePage - 1) * pageSize + 1}–
                    {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <div className="admin-pager">
                    <button className="admin-pager-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} className={`admin-pager-num ${p === safePage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="admin-pager-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</button>
                  </div>
                </div>
              </section>
            )}

            {activeNav === "analytics" && (
              <>
                <div className="admin-analytics">
                  <section className="admin-table-card admin-panel">
                    <h2>By Status</h2>
                    {analytics.byStatus.map((b) => (
                      <div className="admin-bar-row" key={b.key}>
                        <span className="admin-bar-label">{b.label} · {b.count}</span>
                        <div className="admin-bar-track">
                          <div className="admin-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
                        </div>
                        <span className="admin-bar-pct">{b.pct}%</span>
                      </div>
                    ))}
                  </section>
                  <section className="admin-table-card admin-panel">
                    <h2>By Priority</h2>
                    {analytics.byPriority.map((b) => (
                      <div className="admin-bar-row" key={b.key}>
                        <span className="admin-bar-label">{b.label} · {b.count}</span>
                        <div className="admin-bar-track">
                          <div className="admin-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
                        </div>
                        <span className="admin-bar-pct">{b.pct}%</span>
                      </div>
                    ))}
                  </section>
                  <section className="admin-table-card admin-panel admin-stat-row">
                    <div className="admin-stat">Due soon (7d)<strong>{analytics.dueSoonCount}</strong></div>
                    <div className="admin-stat">Overdue<strong>{tasks.filter((t) => isOverdue(t)).length}</strong></div>
                    <div className="admin-stat">Active<strong>{tasks.filter((t) => t.status !== "done").length}</strong></div>
                    <div className="admin-stat">Total<strong>{tasks.length}</strong></div>
                  </section>
                </div>
              </>
            )}

            {activeNav === "calendar" && (
              <section className="admin-table-card admin-panel">
                <h2>Due-date calendar</h2>
                <div className="calendar-list">
                  {searchedTasks.filter((task) => task.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date)).map((task) => (
                    <button key={task.id} className="calendar-item" onClick={() => setModal({ mode: "edit", task })}>
                      <time>{new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" })}</time>
                      <span><strong>{task.title}</strong><small>{task.project || task.category}</small></span>
                      <span className="admin-status" style={{ color: STATUS_META[task.status].color, background: STATUS_META[task.status].bg }}>{STATUS_META[task.status].label}</span>
                    </button>
                  ))}
                  {!searchedTasks.some((task) => task.due_date) && <p className="admin-empty-row">No matching tasks have due dates.</p>}
                </div>
              </section>
            )}

            {activeNav === "activity" && (
              <section className="admin-table-card admin-panel">
                <h2>Activity history</h2>
                <div className="timeline-list">
                  {activity.filter((item) => !search || `${item.details} ${item.action}`.toLowerCase().includes(search.toLowerCase())).map((item) => <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div><strong>{item.details || item.action}</strong><small>{new Date(`${item.created_at}Z`).toLocaleString()}</small></div></div>)}
                  {activity.length === 0 && <p className="admin-empty-row">No activity recorded yet.</p>}
                </div>
              </section>
            )}

            {activeNav === "notifications" && (
              <section className="admin-table-card admin-panel">
                <h2>Notifications <span className="admin-count">{notifications.length}</span></h2>
                <div className="notification-list">
                  {notifications.filter((item) => !search || `${item.title} ${item.message}`.toLowerCase().includes(search.toLowerCase())).map((item) => <button className={`notification-item ${item.type}`} key={item.id} onClick={() => { const task = tasks.find((t) => t.id === item.task_id); if (task) setModal({ mode: "edit", task }); }}><span>{item.type === "overdue" ? "⚠️" : "🔔"}</span><div><strong>{item.title}</strong><small>{item.message} · {new Date(item.date).toLocaleString()}</small></div></button>)}
                  {notifications.length === 0 && <p className="admin-empty-row">You are all caught up.</p>}
                </div>
              </section>
            )}

            {activeNav === "templates" && (
              <section className="admin-table-card admin-panel">
                <h2>Task templates</h2>
                <p className="admin-subtitle">Save any task as a template from the Tasks table.</p>
                <div className="template-grid">
                  {templates.map((template) => <div className="template-card" key={template.id}><strong>{template.title}</strong><span>{template.category} · {template.project || "No project"}</span><div><button className="admin-btn primary" onClick={() => setModal({ mode: "create", initialValues: template })}>Use template</button><button className="admin-btn" onClick={() => { const next = templates.filter((item) => item.id !== template.id); setTemplates(next); localStorage.setItem("tf_templates", JSON.stringify(next)); }}>Remove</button></div></div>)}
                  {templates.length === 0 && <p className="admin-empty-row">No templates saved yet.</p>}
                </div>
              </section>
            )}

            {activeNav === "products" && (
              <section className="admin-table-card admin-panel">
                <div className="admin-table-toolbar"><h2>Projects</h2><span className="admin-count">{products.length} projects</span></div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th className="num">Tasks</th>
                        <th className="num">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr><td colSpan={3} className="admin-empty-row">No tasks yet.</td></tr>
                      ) : (
                        products.map((p) => (
                          <tr key={p.title} className={selectedProject === p.title ? "project-row selected" : "project-row"}>
                            <td className="admin-customer"><button className="project-open" onClick={() => setSelectedProject(p.title)}>{p.title}<small>View details →</small></button></td>
                            <td className="num">{p.count}</td>
                            <td className="num">{p.status} · {Math.round((p.status / p.count) * 100)}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {selectedProject && (
                  <div className="project-detail">
                    <div className="project-detail-head">
                      <div><span className="eyebrow">Project details</span><h2>{selectedProject}</h2></div>
                      <button className="icon-button" aria-label="Close project details" onClick={() => setSelectedProject(null)}>×</button>
                    </div>
                    <div className="project-summary">
                      <div><strong>{projectTasks.length}</strong><span>Total tasks</span></div>
                      <div><strong>{projectTasks.filter((task) => task.status === "done").length}</strong><span>Completed</span></div>
                      <div><strong>{projectTasks.filter((task) => task.status !== "done").length}</strong><span>Remaining</span></div>
                      <div><strong>{projectTasks.length ? Math.round(projectTasks.filter((task) => task.status === "done").length / projectTasks.length * 100) : 0}%</strong><span>Progress</span></div>
                    </div>
                    <div className="project-progress"><span style={{ width: `${projectTasks.length ? projectTasks.filter((task) => task.status === "done").length / projectTasks.length * 100 : 0}%` }} /></div>
                    <div className="project-task-list">
                      {projectTasks.map((task) => (
                        <button key={task.id} className="project-task" onClick={() => setModal({ mode: "edit", task })}>
                          <span className={`project-task-check ${task.status === "done" ? "done" : ""}`}>{task.status === "done" ? "✓" : ""}</span>
                          <span><strong>{task.title}</strong><small>{task.category || "other"}{task.due_date ? ` · Due ${task.due_date}` : " · No due date"}</small></span>
                          <span className="admin-status" style={{ color: PRIORITY_META[task.priority].color, background: PRIORITY_META[task.priority].bg }}>{PRIORITY_META[task.priority].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeNav === "customers" && user && (
              <section className="admin-table-card admin-panel admin-profile">
                <span className="admin-profile-avatar">{user.name.charAt(0).toUpperCase()}</span>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <div className="admin-profile-meta">
                  <span className="admin-chip">Signed in</span>
                  <span className="admin-chip">Role: Admin</span>
                  <span className="admin-chip">{tasks.length} tasks</span>
                </div>
              </section>
            )}

            {activeNav === "settings" && (
              <section className="admin-table-card admin-panel admin-settings">
                <h2>Preferences</h2>
                <label className="admin-toggle-row">
                  <span>Show task descriptions</span>
                  <button
                    className={`admin-switch ${prefs.showDescriptions ? "active" : ""}`}
                    onClick={() => { setPref({ showDescriptions: !prefs.showDescriptions }); showToast("Updated descriptions preference"); }}
                  >
                    <span className="admin-switch-knob" />
                  </button>
                </label>
                <label className="admin-toggle-row">
                  <span>Dense table mode</span>
                  <button
                    className={`admin-switch ${prefs.denseMode ? "active" : ""}`}
                    onClick={() => { setPref({ denseMode: !prefs.denseMode }); showToast("Updated dense mode"); }}
                  >
                    <span className="admin-switch-knob" />
                  </button>
                </label>
                <label className="admin-toggle-row">
                  <span>Email notifications</span>
                  <button
                    className={`admin-switch ${prefs.emailNotif ? "active" : ""}`}
                    onClick={() => { setPref({ emailNotif: !prefs.emailNotif }); showToast("Updated notification preference"); }}
                  >
                    <span className="admin-switch-knob" />
                  </button>
                </label>
                <div className="admin-settings-row">
                  <span>Default new-task priority</span>
                  <select value={prefs.defaultPriority} onChange={(e) => { setPref({ defaultPriority: e.target.value }); showToast("Updated default priority"); }}>
                    {["high", "medium", "low"].map((p) => (
                      <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                    ))}
                  </select>
                </div>
              </section>
            )}
          </>
        )}

        {loadError && <div className="alert" style={{ alignSelf: "flex-start" }}>{loadError}</div>}
      </div>

      {toast && <div className="admin-toast">{toast}</div>}
      {modal && (
        <TaskModal
          mode={modal.mode}
          task={modal.task}
          initialValues={{ priority: prefs.defaultPriority, ...(modal.initialValues || {}) }}
          deleting={deleting}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
