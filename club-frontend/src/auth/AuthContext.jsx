import { createContext, useContext, useEffect, useState } from "react";
import { api, UNAUTHORIZED_EVENT } from "../api/client.js";

const AuthContext = createContext(null);

// Сессия — HttpOnly-cookie, которую JS не видит. Поэтому при загрузке спрашиваем
// сервер (/auth/me), вошёл ли пользователь и с какой ролью; до ответа ready=false.
export function AuthProvider({ children }) {
  const [role, setRole] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    api.me()
      .then((me) => { if (alive) setRole(me.role); })
      .catch(() => { if (alive) setRole(null); })
      .finally(() => { if (alive) setReady(true); });
    // Истёкшая сессия: любой запрос с 401 разлогинивает (ProtectedRoute уведёт на вход).
    const onUnauthorized = () => setRole(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      alive = false;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  async function login(email, password) {
    const res = await api.login(email, password);
    setRole(res.role);
    return res.role;
  }

  async function register(email, password) {
    const res = await api.register(email, password);
    setRole(res.role);
    return res.role;
  }

  async function logout() {
    try { await api.logout(); } catch { /* cookie всё равно истечёт */ }
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ role, ready, isAuthed: !!role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}
