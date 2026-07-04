import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client.js";

const AuthContext = createContext(null);

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || "user";
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTok] = useState(getToken());
  const [role, setRole] = useState(token ? decodeRole(token) : null);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    // при истёкшем токене role останется, но защищённые запросы вернут 401
    if (token && !role) setRole(decodeRole(token));
  }, [token, role]);

  async function login(email, password) {
    const res = await api.login(email, password);
    setToken(res.access_token);
    setTok(res.access_token);
    setRole(res.role);
    return res.role;
  }

  function logout() {
    setToken(null);
    setTok(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, ready, isAuthed: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}
