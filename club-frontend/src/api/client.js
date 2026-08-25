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

// Понятные названия полей анкеты — чтобы ошибки валидации (422) читались
// человеком, а не как "body -> birth_date".
const FIELD_LABELS = {
  email: "Email",
  password: "Пароль",
  first_name: "Имя",
  last_name: "Фамилия",
  business_name: "Название бизнеса",
  business_field: "Сфера или специализация",
  birth_date: "Дата рождения",
  birth_time: "Время рождения",
  birth_city: "Город рождения",
  photo_url: "Фото",
  telegram: "Телеграм",
};

// Ответы FastAPI при ошибке валидации кладут в detail массив объектов
// { loc, msg, type }. Собираем из него короткий понятный текст.
function messageFromValidation(detail) {
  const items = detail
    .map((err) => {
      const loc = Array.isArray(err?.loc) ? err.loc : [];
      // Первый элемент loc — это "body"/"query", берём собственно имя поля.
      const field = loc.length > 1 ? loc[loc.length - 1] : loc[0];
      const label = FIELD_LABELS[field] || field;
      if (field === "birth_date") return "Проверьте дату рождения — укажите её в формате ДД.ММ.ГГГГ.";
      if (label) return `Проверьте поле «${label}».`;
      return err?.msg || null;
    })
    .filter(Boolean);
  // Уберём дубли (несколько ошибок по одному полю) и ограничим длину.
  const unique = [...new Set(items)];
  return unique.length ? unique.slice(0, 3).join(" ") : "";
}

// По статусу ответа подбираем понятное сообщение, если сервер не прислал detail.
function messageFromStatus(status) {
  if (status === 400) return "Проверьте введённые данные и попробуйте ещё раз.";
  if (status === 401) return "Сессия истекла. Войдите заново.";
  if (status === 403) return "Недостаточно прав для этого действия.";
  if (status === 404) return "Данные не найдены. Обновите страницу и попробуйте снова.";
  if (status === 409) return "Такая запись уже существует.";
  if (status === 413) return "Файл слишком большой. Загрузите изображение поменьше.";
  if (status === 429) return "Слишком много запросов. Подождите немного и попробуйте ещё раз.";
  if (status >= 500) return "Сервер временно недоступен. Попробуйте ещё раз через минуту.";
  return "Не удалось выполнить запрос. Попробуйте ещё раз.";
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

  let res;
  try {
    res = await fetch(`${BASE}${path}`, opts);
  } catch {
    // fetch падает только при сетевой ошибке (нет связи, оборвалось соединение).
    throw new Error("Нет связи с сервером. Проверьте интернет-соединение и попробуйте ещё раз.");
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    let message = "";
    if (typeof detail === "string" && detail.trim()) {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = messageFromValidation(detail);
    }
    if (!message) message = messageFromStatus(res.status);
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", form: { username: email, password }, auth: false }),

  register: (email, password) =>
    request("/auth/register", { method: "POST", body: { email, password }, auth: false }),

  getQuiz: () => request("/quiz"),
  submitQuiz: (answers) => request("/quiz/submit", { method: "POST", body: { answers } }),
  dashboard: () => request("/me/dashboard"),

  // Анкета / профиль резидента
  getProfile: () => request("/me/profile"),
  saveProfile: (patch) => request("/me/profile", { method: "PUT", body: patch }),
  uploadMyPhoto: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/me/upload", { method: "POST", formData: fd });
  },

  // Резиденты — поиск q, фильтр по сфере field, scope: "near" (±1 уровень) | "all"
  residents: ({ q = "", field = "", scope = "near" } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (field) params.set("field", field);
    if (scope && scope !== "near") params.set("scope", scope);
    const qs = params.toString();
    return request(`/me/residents${qs ? `?${qs}` : ""}`);
  },

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

  // Баннер «Запустить траекторию развития»
  getPromo: () => request("/admin/promo"),
  updatePromo: (patch) => request("/admin/promo", { method: "PATCH", body: patch }),

  // Подсказки к показателям дашборда (попапы «?»)
  getInfoTips: () => request("/admin/info-tips"),
  updateInfoTips: (patch) => request("/admin/info-tips", { method: "PATCH", body: patch }),

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
