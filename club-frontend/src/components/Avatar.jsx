// Круглый аватар резидента: фото или инициалы-заглушка (детерминированный цвет).
const PALETTE = ["#6cde52", "#3b9eff", "#a472ff", "#e7b24c", "#ff6b6b"];

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

export default function Avatar({ photoUrl, firstName, lastName, size = 44, className = "", photoPos }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (photoUrl) {
    return (
      <span className={`avatar ${className}`} style={style}>
        <img src={photoUrl} alt="" style={{ objectPosition: photoPos || "50% 50%" }} />
      </span>
    );
  }
  const seed = `${firstName || ""}${lastName || ""}`;
  return (
    <span className={`avatar avatar-initials ${className}`}
          style={{ ...style, "--av-color": colorFor(seed) }}>
      {initials(firstName, lastName)}
    </span>
  );
}
