import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { getToken } from "./api.js";

function RequireAuth() {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function GuestOnly() {
  if (getToken()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    function onStorage(e) {
      if (e.key === "taskflow_token" && !e.newValue && document.location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [navigate]);

  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
      </Route>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
