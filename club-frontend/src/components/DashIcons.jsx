// Уникальные иконки дашборда V2 в «космическо-игровом» HUD-стиле.
// Инлайновые SVG: цвет и размер задаются пропсами, лёгкое свечение — через CSS
// (filter: drop-shadow у контейнера .stat-ic / .hgv2-*). Заливки полупрозрачные,
// поэтому иконки выглядят «глянцевыми», но остаются в одной палитре.

function Svg({ size = 22, color = "currentColor", children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
         {...rest}>
      {children}
    </svg>
  );
}

// Опыт / Уровень — гексо-бейдж с двойным шевроном «level up».
export function ExpIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" fill={c} fillOpacity="0.14" />
      <path d="M8 13.5 12 9.8l4 3.7" />
      <path d="M8 16.8 12 13l4 3.8" />
    </Svg>
  );
}

// Знания — гранёный кристалл/гем.
export function KnowledgeIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <path d="M12 2.5 19 9l-7 12.5L5 9z" fill={c} fillOpacity="0.14" />
      <path d="M5 9h14" />
      <path d="M12 2.5 9.4 9l2.6 12.5L14.6 9z" />
    </Svg>
  );
}

// Влияние — молния в энергетическом кольце.
export function InfluenceIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.2" strokeOpacity="0.5" strokeDasharray="2.6 3.2" />
      <path d="M13 4.5 8 13h3.2l-1 6.5 5-9H12z" fill={c} fillOpacity="0.18" />
    </Svg>
  );
}

// Менеджмент — командный хаб (гекса-нат с сердечником и спицами).
export function ManagementIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <path d="M12 2.6 20 7.2v9.6L12 21.4 4 16.8V7.2z" fill={c} fillOpacity="0.12" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 5.2V8.6M12 15.4v3.4M6.7 8.9l2.9 1.7M14.4 13.4l2.9 1.7M17.3 8.9l-2.9 1.7M9.6 13.4l-2.9 1.7" strokeOpacity="0.75" />
    </Svg>
  );
}

// Маркетинг — рупор с волнами сигнала.
export function MarketingIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <path d="M3.5 10v4h3l7 4V6l-7 4z" fill={c} fillOpacity="0.16" />
      <path d="M17 9.2a4 4 0 0 1 0 5.6" strokeOpacity="0.8" />
      <path d="M19.6 6.8a7.4 7.4 0 0 1 0 10.4" strokeOpacity="0.55" />
    </Svg>
  );
}

// Продажи — монета с растущей стрелкой.
export function SalesIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.2" fill={c} fillOpacity="0.13" />
      <path d="M12 16.5V8.4" />
      <path d="M8.6 11.6 12 8.2l3.4 3.4" />
    </Svg>
  );
}

// Повышение уровня — ракета (яркий CTA-бейдж).
export function RocketIcon(props) {
  const c = props.color || "currentColor";
  return (
    <Svg {...props}>
      <path d="M12 2.4c2.8 2.4 4.1 5.7 4.1 9 0 1.7-.6 2.6-1.3 3.4H9.2C8.5 14 7.9 13.1 7.9 11.4c0-3.3 1.3-6.6 4.1-9Z" fill={c} fillOpacity="0.2" />
      <circle cx="12" cy="9" r="1.7" />
      <path d="M8.5 12.6 5.8 15.4l3.3-.7M15.5 12.6l2.7 2.8-3.3-.7" />
      <path d="M10.3 15.5 12 19.2l1.7-3.7" />
    </Svg>
  );
}

// Рекомендация — лампочка (в тон зелёного).
export function BulbIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </Svg>
  );
}

// Подсказка — знак вопроса в кружке (кнопка «?» у показателей).
export function HelpIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M9.6 9.4a2.4 2.4 0 0 1 4.6.9c0 1.6-2.2 2-2.2 3.4" />
      <path d="M12 17.2h.01" strokeWidth="2.1" />
    </Svg>
  );
}
