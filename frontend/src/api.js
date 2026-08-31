const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new Error("Network error - is the backend running?");
  }

  if (res.status === 204) return null;
  if (res.status === 401 && options.throwOn401 !== false) {
    clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  register(name, email, password) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      throwOn401: false,
    });
  },
  login(email, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      throwOn401: false,
    });
  },
  me() {
    return request("/api/auth/me");
  },
  updateProfile(payload) {
    return request("/api/auth/me", { method: "PUT", body: JSON.stringify(payload) });
  },
  createTask(payload) {
    return request("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
  },
  getTasks(params = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    }
    const query = qs.toString();
    return request(`/api/tasks${query ? `?${query}` : ""}`);
  },
  getTask(id) {
    return request(`/api/tasks/${id}`);
  },
  updateTask(id, payload) {
    return request(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteTask(id) {
    return request(`/api/tasks/${id}`, { method: "DELETE" });
  },
  bulkTasks(payload) {
    return request("/api/tasks/bulk", { method: "POST", body: JSON.stringify(payload) });
  },
  getActivity() {
    return request("/api/tasks/activity");
  },
  getNotifications() {
    return request("/api/tasks/notifications");
  },
};

export { api };
export default api;
