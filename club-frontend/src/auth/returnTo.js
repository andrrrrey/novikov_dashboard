// Куда вернуть пользователя после входа/регистрации: адрес, с которого его
// отправил на /login ProtectedRoute (например, прямая ссылка на профиль резидента).
export function returnPath(state) {
  const from = state?.from;
  if (!from?.pathname || from.pathname === "/login" || from.pathname === "/register") return null;
  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
}
