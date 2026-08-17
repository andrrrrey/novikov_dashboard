// Иконки для PWA-дашборда (макет Figma node 0-403). Заливные SVG в стиле
// исходных наборов макета: boxicons play-filled, mingcute question-fill,
// mage book-fill, heroicons bolt-solid, ri lightbulb-fill, ic round-dashboard,
// bi people-fill. Размер/цвет — пропсами; всё self-contained, без сетевых ассетов.

// boxicons:play-filled — «Смотреть» и CTA.
export function PlayIcon({ size = 15, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M8 5.14v13.72c0 .78.85 1.26 1.52.86l11.03-6.86a1 1 0 0 0 0-1.72L9.52 4.28C8.85 3.88 8 4.36 8 5.14z" />
    </svg>
  );
}

// mingcute:question-fill — «?» у показателей. Кружок цветом color, знак «?» —
// цветом bg (под фон карточки), поэтому выглядит как выпуклая подсказка.
export function QuestionIcon({ size = 20, color = "#6a6a6a", bg = "#1b1b1b" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill={color} />
      <path
        d="M12 5.6c-2.2 0-3.8 1.2-4.1 3.2l2.1.4c.16-1 .86-1.6 1.85-1.6 1 0 1.65.55 1.65 1.4 0 .74-.42 1.16-1.3 1.8-1.05.76-1.55 1.45-1.45 2.7l.02.4h2.05l.02-.32c.03-.72.4-1.12 1.3-1.78 1.05-.78 1.7-1.62 1.7-2.98 0-2.02-1.6-3.24-3.6-3.24z"
        fill={bg}
      />
      <circle cx="12" cy="17.1" r="1.25" fill={bg} />
    </svg>
  );
}

// mage:book-fill — метрика «Знание».
export function BookIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M11.25 6.3C9.6 5.15 7.3 4.6 4.9 4.6c-.77 0-1.4.63-1.4 1.4v10.3c0 .77.63 1.38 1.4 1.38 2.2 0 4.3.47 6.35 1.62V6.3z" />
      <path d="M12.75 6.3v13c2.05-1.15 4.15-1.62 6.35-1.62.77 0 1.4-.61 1.4-1.38V6c0-.77-.63-1.4-1.4-1.4-2.4 0-4.7.55-6.35 1.7z" opacity="0.92" />
    </svg>
  );
}

// heroicons:bolt-16-solid — метрика «Влияние».
export function BoltIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M13.3 2.2 4.6 13.1c-.4.5-.04 1.25.6 1.25H10l-1.35 6.9c-.15.77.83 1.2 1.28.56L19.4 10.9c.4-.5.05-1.25-.6-1.25H13.2l1.4-6.9c.16-.78-.83-1.2-1.3-.55z" />
    </svg>
  );
}

// ri:lightbulb-fill — карточка «Рекомендация».
export function BulbIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-4.2 12.6c.55.42.95 1.05.95 1.75v.4h6.5v-.4c0-.7.4-1.33.95-1.75A7 7 0 0 0 12 2z" />
      <rect x="8.75" y="18.3" width="6.5" height="1.7" rx="0.85" />
      <rect x="10" y="21" width="4" height="1.6" rx="0.8" />
    </svg>
  );
}

// ic:round-dashboard — вкладка «Дэшборд».
export function DashboardIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="9.5" rx="2" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="2" />
      <rect x="12.5" y="3" width="7.5" height="6.5" rx="2" />
      <rect x="12.5" y="11.5" width="7.5" height="9.5" rx="2" />
    </svg>
  );
}

// bi:people-fill — вкладка «Резиденты».
export function PeopleIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <circle cx="9" cy="7.4" r="3.4" />
      <path d="M2.8 19.2c0-3.4 2.8-5.3 6.2-5.3s6.2 1.9 6.2 5.3v.6H2.8z" />
      <circle cx="16.8" cy="8" r="2.7" opacity="0.85" />
      <path d="M15 14c2.9.05 5.6 1.7 5.6 4.9v.9h-3.3c0-2.4-.85-4.2-2.3-5.8z" opacity="0.85" />
    </svg>
  );
}
