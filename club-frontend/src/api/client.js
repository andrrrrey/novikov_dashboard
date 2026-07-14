// Тонкий клиент над fetch. Токен храним в localStorage, кладём в Authorization.

const BASE = import.meta.env.VITE_API_BASE || "/club/api";
const TOKEN_KEY = "club_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, form, formData, auth = true } = {}) {
  const headers = {};
  const opts = { method, headers };

  if (formData) {
    // multipart: Content-Type c boundary проставит браузер сам
    opts.body = formData;
  } else if (form) {
    opts.body = new URLSearchParams(form);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body !== undefined) {
    opts.body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.detail || "Что-то пошло не так. Попробуйте ещё раз.";
    throw new Error(typeof message === "string" ? message : "Ошибка запроса");
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", form: { username: email, password }, auth: false }),

  getQuiz: () => request("/quiz"),
  submitQuiz: (answers) => request("/quiz/submit", { method: "POST", body: { answers } }),
  dashboard: () => request("/me/dashboard"),

  listUsers: () => request("/admin/users"),
  createUser: (email, password) => request("/admin/users", { method: "POST", body: { email, password } }),
  updateUser: (id, patch) => request(`/admin/users/${id}`, { method: "PATCH", body: patch }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),
  stats: () => request("/admin/stats"),

  listCards: () => request("/admin/cards"),
  updateCard: (id, patch) => request(`/admin/cards/${id}`, { method: "PATCH", body: patch }),
  listHints: () => request("/admin/hints"),
  updateHint: (id, patch) => request(`/admin/hints/${id}`, { method: "PATCH", body: patch }),
  uploadImage: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/admin/upload", { method: "POST", formData: fd });
  },

  // Плашка «Повышайте свой уровень»
  getPromo: () => request("/admin/promo"),
  updatePromo: (patch) => request("/admin/promo", { method: "PATCH", body: patch }),

  // GetCourse
  getGetcourse: () => request("/admin/getcourse"),
  updateGetcourse: (patch) => request("/admin/getcourse", { method: "PATCH", body: patch }),
  updateGcGroup: (id, counts) =>
    request(`/admin/getcourse/groups/${id}`, { method: "PATCH", body: { counts } }),
  syncGetcourse: () => request("/admin/getcourse/sync", { method: "POST" }),

  // Настройка шкал прогресса (Опыт/Знания)
  getProgressConfig: () => request("/admin/progress-config"),
  updateProgressConfig: (config) => request("/admin/progress-config", { method: "PUT", body: config }),
};
