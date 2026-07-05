// Объёмная колба «Состояние бизнеса», вариант «узкое место — в центре».
// Узкий аспект (из квиза) занимает горлышко: заливка, подпись, метка и цифра — по центру.
// Два других аспекта занимают верхнюю и нижнюю чаши (в каноническом порядке).
// Цвет закреплён за аспектом. Верхняя шкала 1–10 — плейсхолдер под GetCourse.

const ASPECTS = {
  management: { label: "Менеджмент", base: "#34e39a", light: "#7ffcc9" },
  marketing:  { label: "Маркетинг",  base: "#3b9eff", light: "#8fc7ff" },
  sales:      { label: "Продажи",    base: "#a472ff", light: "#c9a8ff" },
};
const ORDER = ["management", "marketing", "sales"]; // канонический порядок

const CX = 160, TOP_Y = 44, TOP_RX = 94, RIM_RY = 16;
const NECK_Y = 212, NECK_HW = 13, BOT_Y = 392, BOT_RX = 94;
const VB_TOP = -52, VB_H = 484;

// Слоты по высоте: верхняя чаша, горлышко (узкое место), нижняя чаша.
const SLOTS = {
  top:    { yc: 128, zone: [72, 190] },
  neck:   { yc: 212, zone: [186, 238] },
  bottom: { yc: 316, zone: [252, 384] },
};

const SIL =
  `M${CX - TOP_RX},${TOP_Y} L${CX + TOP_RX},${TOP_Y} L${CX + NECK_HW},${NECK_Y}` +
  ` L${CX + BOT_RX},${BOT_Y} L${CX - BOT_RX},${BOT_Y} L${CX - NECK_HW},${NECK_Y} Z`;

function hwAtY(y) {
  if (y <= NECK_Y) return Math.max(TOP_RX + (y - TOP_Y) / (NECK_Y - TOP_Y) * (NECK_HW - TOP_RX), NECK_HW);
  return NECK_HW + (y - NECK_Y) / (BOT_Y - NECK_Y) * (BOT_RX - NECK_HW);
}
function surfaceY(zone, level) {
  return zone[1] - (level / 3) * (zone[1] - zone[0]);
}
function pct(y) {
  return Math.min(94, Math.max(6, ((y - VB_TOP) / VB_H) * 100));
}

export default function Hourglass({ levels, bottleneck, hint }) {
  const rest = ORDER.filter((a) => a !== bottleneck.aspect);
  const placement = { top: rest[0], neck: bottleneck.aspect, bottom: rest[1] };

  const slots = ["top", "neck", "bottom"].map((slot) => {
    const aspect = placement[slot];
    const zone = SLOTS[slot].zone;
    return {
      slot, aspect, zone, yc: SLOTS[slot].yc,
      level: levels[aspect],
      surf: surfaceY(zone, levels[aspect]),
      isBottleneck: slot === "neck",
      ...ASPECTS[aspect],
    };
  });

  const bn = ASPECTS[bottleneck.aspect];
  const bnText = `Узкое место: ${bn.label}`;
  const pillW = bnText.length * 8.6 + 30;
  const cleanHint = (hint || "").replace(/^Узкое место:[^.]*\.\s*/, "");

  return (
    <div className="hg">
      <div className="hg-head">
        <h1 className="hg-title">Состояние бизнеса</h1>
        <span className="hg-badge" title="Подключается вместе с GetCourse">Прогресс · скоро</span>
      </div>

      <div className="hg-stage">
        <div className="hg-col hg-col-left">
          {slots.map((s) => (
            <div className="hg-aspect" key={s.slot} style={{ top: `${pct(s.yc)}%` }}>
              <span className="hg-aspect-name" style={{ color: s.base }}>{s.label}</span>
              <span className="hg-aspect-lvl">Уровень {s.level}</span>
            </div>
          ))}
        </div>

        <svg className="hg-svg" viewBox="0 -52 320 484" role="img"
             aria-label="Песочные часы состояния бизнеса">
          <defs>
            <clipPath id="glass"><path d={SIL} /></clipPath>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowBig" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id="glassBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6fd3e8" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#6fd3e8" stopOpacity="0.14" />
            </linearGradient>
            <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            {ORDER.map((k) => (
              <linearGradient id={`liq-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ASPECTS[k].light} stopOpacity="0.5" />
                <stop offset="100%" stopColor={ASPECTS[k].base} stopOpacity="0.92" />
              </linearGradient>
            ))}
          </defs>

          <path d={SIL} fill="none" stroke="#8fd3ff" strokeWidth="3" opacity="0.5" filter="url(#glowBig)" />
          <path d={SIL} fill="url(#glassBody)" />

          <g clipPath="url(#glass)">
            {slots.map((s) => (
              <rect key={s.slot} x="58" y={s.surf} width="204" height={s.zone[1] - s.surf}
                    fill={`url(#liq-${s.aspect})`} />
            ))}
            <polygon points="76,54 150,206 160,206 92,54" fill="url(#shine)" opacity="0.5" />
            <polygon points="150,220 76,384 96,384 160,220" fill="url(#shine)" opacity="0.4" />
          </g>

          {slots.map((s) => {
            const rx = Math.max(hwAtY(s.surf), 6);
            const ry = rx * 0.17 + 1.5;
            return (
              <g key={s.slot}>
                <ellipse cx={CX} cy={s.surf} rx={rx} ry={ry} fill={s.light} opacity="0.5" />
                <ellipse cx={CX} cy={s.surf} rx={rx} ry={ry} fill="none"
                         stroke={s.light} strokeWidth="2" filter="url(#glow)" />
                <line x1="6" y1={s.yc} x2={CX - hwAtY(s.yc) - 6} y2={s.yc} stroke={s.base}
                      strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
                <line x1={CX + hwAtY(s.yc) + 6} y1={s.yc} x2="314" y2={s.yc} stroke={s.base}
                      strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
              </g>
            );
          })}

          <ellipse cx={CX} cy={TOP_Y} rx={TOP_RX} ry={RIM_RY} fill="#0a1626" opacity="0.5" />
          <ellipse cx={CX} cy={TOP_Y} rx={TOP_RX} ry={RIM_RY} fill="none"
                   stroke="#a9dcff" strokeWidth="2.4" filter="url(#glow)" />
          <ellipse cx={CX} cy={BOT_Y} rx={BOT_RX} ry={RIM_RY} fill="none"
                   stroke="#a9dcff" strokeWidth="2.4" filter="url(#glow)" />
          <ellipse cx={CX} cy={NECK_Y} rx={NECK_HW} ry="4" fill="none"
                   stroke="#a9dcff" strokeWidth="1.6" opacity="0.8" />

          <path d={SIL} fill="none" stroke="#cfeaff" strokeWidth="1.5" opacity="0.55" />

          <g stroke="#e7b24c" fill="none" strokeLinecap="round">
            <path d="M95,-14 Q160,-46 225,-14" strokeWidth="1.4" strokeDasharray="1.5 5" opacity="0.85" />
            <circle cx="90" cy="-14" r="2.2" fill="#e7b24c" stroke="none" />
            <circle cx="230" cy="-14" r="2.2" fill="#e7b24c" stroke="none" />
            <circle cx={CX} cy="-36" r="5.5" strokeWidth="1.6" />
            <path d="M150,-22 Q160,-32 170,-22" strokeWidth="1.6" />
          </g>
          <text x={CX} y="-4" textAnchor="middle" fill="#e7b24c" fontSize="12.5"
                fontWeight="700" letterSpacing="2">СОБСТВЕННИК</text>

          <g filter="url(#glow)">
            <rect x={CX - pillW / 2} y={NECK_Y - 16} width={pillW} height="32" rx="16"
                  fill="rgba(6,11,22,0.92)" stroke={bn.base} strokeWidth="1.6" />
          </g>
          <text x={CX} y={NECK_Y + 5} textAnchor="middle" fill={bn.light}
                fontSize="13.5" fontWeight="700">{bnText}</text>
        </svg>

        <div className="hg-col hg-col-right">
          {slots.map((s) => (
            <div className="hg-num" key={s.slot} style={{
              top: `${pct(s.yc)}%`, borderColor: s.base, color: s.base,
              boxShadow: `0 0 18px ${s.base}44`,
            }}>
              {s.level}
            </div>
          ))}
        </div>
      </div>

      <div className="hg-scale" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}
      </div>
      <div className="hg-slider" title="Появится после подключения GetCourse">
        <div className="hg-slider-track"><div className="hg-slider-thumb" /></div>
        <span className="hg-slider-note">Общий уровень появится после подключения GetCourse</span>
      </div>

      <div className="hg-bottleneck" style={{ borderColor: "rgba(108, 222, 82, 0.35)" }}>
        <div className="hg-bulb" style={{ color: "var(--green)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
          </svg>
        </div>
        <div>
          <div className="hg-bn-title" style={{ color: "var(--green)" }}>Рекомендация</div>
          <div className="hg-bn-hint">{cleanHint}</div>
        </div>
      </div>
    </div>
  );
}
