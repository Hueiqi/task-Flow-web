// api.js — thin wrapper around fetch. Keeps token handling and error
// parsing in one place so components stay focused on UI logic.

const BASE_URL = "/api";

function getToken() {
  return localStorage.getItem("taskflow_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

export const api = {
  register: (name, email, password) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getTasks: (filters = {}) => {
    const qs = new URLSearchParams(filters).toString();
    return request(`/tasks${qs ? `?${qs}` : ""}`);
  },
  createTask: (task) => request("/tasks", { method: "POST", body: JSON.stringify(task) }),
  updateTask: (id, task) => request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(task) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};

export function saveSession(token, user) {
  localStorage.setItem("taskflow_token", token);
  localStorage.setItem("taskflow_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("taskflow_token");
  localStorage.removeItem("taskflow_user");
}

export function getCurrentUser() {
  const raw = localStorage.getItem("taskflow_user");
  return raw ? JSON.parse(raw) : null;
}
