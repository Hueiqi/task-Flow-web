import { SORTS } from "../utils.js";

export default function Toolbar({ filters, onChange, counts }) {
  return (
    <div className="toolbar">
      <input
        type="search"
        className="search-input"
        placeholder="Search tasks…"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
      />

      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <select
        aria-label="Filter by priority"
        value={filters.priority}
        onChange={(e) => onChange({ priority: e.target.value })}
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        aria-label="Sort by"
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value })}
      >
        {Object.entries(SORTS).map(([key, { label }]) => (
          <option key={key} value={key}>
            Sort: {label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="ghost order-toggle"
        onClick={() => onChange({ order: filters.order === "asc" ? "desc" : "asc" })}
        title="Toggle order"
      >
        {filters.order === "asc" ? "↑ Asc" : "↓ Desc"}
      </button>

      {(filters.q || filters.status || filters.priority) && (
        <button type="button" className="ghost" onClick={() => onChange({ q: "", status: "", priority: "" })}>
          Clear {counts.filtered}/{counts.total}
        </button>
      )}
    </div>
  );
}