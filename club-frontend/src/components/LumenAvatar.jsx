// Аватар в стиле Lumen: фото или инициалы с глубоким градиентом и тонким свечением.
// Палитра приглушённее CRM-стандарта, цвет детерминирован по имени.
const PALETTE = ["#2b9e2a", "#2f8f66", "#3a7fa8", "#6a54b0", "#9a7a3a"];

export function initials(firstName = "", lastName = "") {
  const a = (firstName || "").trim()[0] || "";
  const b = (lastName || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
}

function colorFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function LumenAvatar({ photoUrl, firstName, lastName, size = 48, ring = false }) {
  const cls = `lm-avatar${ring ? " lm-avatar-ring" : ""}`;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (photoUrl) {
    return (
      <span className={cls} style={style}>
        <img src={photoUrl} alt="" />
      </span>
    );
  }
  const seed = `${firstName || ""}${lastName || ""}`;
  return (
    <span className={`${cls} lm-avatar-initials`} style={{ ...style, "--av-color": colorFor(seed) }}>
      {initials(firstName, lastName)}
    </span>
  );
}
