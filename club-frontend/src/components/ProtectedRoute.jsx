import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// Без входа — на /login, запомнив, куда шли (после входа вернём туда же).
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthed, role, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;   // ждём ответа сервера о сессии
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && role !== "admin") return <Navigate to="/" replace />;
  return children;
}
