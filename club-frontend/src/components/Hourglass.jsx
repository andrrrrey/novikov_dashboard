// Объёмная колба «Состояние бизнеса».
// По умолчанию — песочные часы: узкий аспект (узкое место) занимает горлышко,
// два других — верхнюю и нижнюю чаши (в каноническом порядке).
// Если уровни всех трёх аспектов равны (balanced) — рисуем прямой цилиндр:
// три равные секции, без горлышка и без плашки «узкое место».
// Цвет закреплён за аспектом. Верхняя шкала 1–10 — плейсхолдер под GetCourse.

const ASPECTS = {
  management: { label: "Менеджмент", base: "#34e39a", light: "#7ffcc9" },
  marketing:  { label: "Маркетинг",  base: "#3b9eff", light: "#8fc7ff" },
  sales:      { label: "Продажи",    base: "#a472ff", light: "#c9a8ff" },
};
const ORDER = ["management", "marketing", "sales"]; // канонический порядок

const CX = 160, RIM_RY = 16, TOP_Y = 44, BOT_Y = 392;

// Песочные часы: полуширина каждой из трёх зон зависит от уровня аспекта в ней
// (1→24, 2→59, 3→94). NECK_Y — вертикальное положение перешейка.
const NECK_Y = 212, HW_MIN = 24, HW_MAX = 94;
function hwForLevel(level) {
  const l = Math.max(1, Math.min(3, level));
  return HW_MIN + ((l - 1) / 2) * (HW_MAX - HW_MIN);
}
// Цилиндр (постоянная полуширина)
const CYL_RX = 76;

// viewBox: шапка собственника убрана, поэтому верхнего запаса почти нет.
const VB_TOP = 16, VB_H = 408;

function surfaceY(zone, level) {
  return zone[1] - (level / 3) * (zone[1] - zone[0]);
}
function pct(y) {
  return Math.min(94, Math.max(6, ((y - VB_TOP) / VB_H) * 100));
}

// Геометрия песочных часов.
function hourglassGeo(topRx, neckHW, botRx) {
  const SIL =
    `M${CX - topRx},${TOP_Y} L${CX + topRx},${TOP_Y} L${CX + neckHW},${NECK_Y}` +
    ` L${CX + botRx},${BOT_Y} L${CX - botRx},${BOT_Y} L${CX - neckHW},${NECK_Y} Z`;
  const hw = (y) =>
    y <= NECK_Y
      ? Math.max(topRx + (y - TOP_Y) / (NECK_Y - TOP_Y) * (neckHW - topRx), neckHW)
      : neckHW + (y - NECK_Y) / (BOT_Y - NECK_Y) * (botRx - neckHW);
  return {
    SIL, hw, topRx, botRx, neckHW,
    order: ["top", "neck", "bottom"],
    slots: {
      top:    { yc: 128, zone: [72, 190] },
      neck:   { yc: 212, zone: [186, 238] },
      bottom: { yc: 316, zone: [252, 384] },
    },
  };
}

// Геометрия цилиндра: прямая труба, три равные секции.
function cylinderGeo() {
  const SIL =
    `M${CX - CYL_RX},${TOP_Y} L${CX + CYL_RX},${TOP_Y}` +
    ` L${CX + CYL_RX},${BOT_Y} L${CX - CYL_RX},${BOT_Y} Z`;
  const H = (BOT_Y - TOP_Y) / 3;
  return {
    SIL, hw: () => CYL_RX, topRx: CYL_RX, botRx: CYL_RX,
    order: ["top", "mid", "bottom"],
    slots: {
      top:    { yc: TOP_Y + H * 0.5, zone: [TOP_Y, TOP_Y + H] },
      mid:    { yc: TOP_Y + H * 1.5, zone: [TOP_Y + H, TOP_Y + 2 * H] },
      bottom: { yc: TOP_Y + H * 2.5, zone: [TOP_Y + 2 * H, BOT_Y] },
    },
  };
}

export default function Hourglass({ levels, bottleneck, hint, balanced = false }) {
  const placement = balanced
    ? { top: ORDER[0], mid: ORDER[1], bottom: ORDER[2] }
    : (() => {
        const rest = ORDER.filter((a) => a !== bottleneck.aspect);
        return { top: rest[0], neck: bottleneck.aspect, bottom: rest[1] };
      })();

  // Ширина каждой зоны песочных часов — по уровню стоящего в ней аспекта.
  const geo = balanced
    ? cylinderGeo()
    : hourglassGeo(
        hwForLevel(levels[placement.top]),
        hwForLevel(levels[placement.neck]),
        hwForLevel(levels[placement.bottom]),
      );

  const slots = geo.order.map((slot) => {
    const aspect = placement[slot];
    const zone = geo.slots[slot].zone;
    return {
      slot, aspect, zone, yc: geo.slots[slot].yc,
      level: levels[aspect],
      surf: surfaceY(zone, levels[aspect]),
      isBottleneck: slot === "neck",
      ...ASPECTS[aspect],
    };
  });

  const bn = balanced ? null : ASPECTS[bottleneck.aspect];
  const bnText = bn ? `Узкое место: ${bn.label}` : "";
  const pillW = bnText.length * 8.6 + 30;
  const cleanHint = (hint || "").replace(/^Узкое место:[^.]*\.\s*/, "");

  // Блик по внутренней левой кромке — следует за силуэтом при любых ширинах.
  const shineTop = balanced ? "" :
    `${CX - geo.hw(TOP_Y + 10) + 10},${TOP_Y + 10} ${CX - geo.neckHW + 3},${NECK_Y - 6}` +
    ` ${CX},${NECK_Y - 6} ${CX - geo.hw(TOP_Y + 10) + 26},${TOP_Y + 10}`;
  const shineBot = balanced ? "" :
    `${CX - geo.neckHW + 3},${NECK_Y + 8} ${CX - geo.hw(BOT_Y - 8) + 10},${BOT_Y - 8}` +
    ` ${CX - geo.hw(BOT_Y - 8) + 30},${BOT_Y - 8} ${CX},${NECK_Y + 8}`;

  return (
    <div className="hg">
      <div className="hg-head">
        <h1 className="hg-title">Состояние бизнеса</h1>
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

        <svg className="hg-svg" viewBox={`0 ${VB_TOP} 320 ${VB_H}`} role="img"
             aria-label={balanced ? "Цилиндр состояния бизнеса" : "Песочные часы состояния бизнеса"}>
          <defs>
            <clipPath id="glass"><path d={geo.SIL} /></clipPath>
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

          <path d={geo.SIL} fill="none" stroke="#8fd3ff" strokeWidth="3" opacity="0.5" filter="url(#glowBig)" />
          <path d={geo.SIL} fill="url(#glassBody)" />

          <g clipPath="url(#glass)">
            {slots.map((s) => (
              <rect key={s.slot} x="58" y={s.surf} width="204" height={s.zone[1] - s.surf}
                    fill={`url(#liq-${s.aspect})`} />
            ))}
            {balanced ? (
              <rect x={CX - CYL_RX + 10} y={TOP_Y} width="16" height={BOT_Y - TOP_Y}
                    fill="url(#shine)" opacity="0.35" />
            ) : (
              <>
                <polygon points={shineTop} fill="url(#shine)" opacity="0.5" />
                <polygon points={shineBot} fill="url(#shine)" opacity="0.4" />
              </>
            )}
          </g>

          {slots.map((s) => {
            const rx = Math.max(geo.hw(s.surf), 6);
            const ry = rx * 0.17 + 1.5;
            return (
              <g key={s.slot}>
                <ellipse cx={CX} cy={s.surf} rx={rx} ry={ry} fill={s.light} opacity="0.5" />
                <ellipse cx={CX} cy={s.surf} rx={rx} ry={ry} fill="none"
                         stroke={s.light} strokeWidth="2" filter="url(#glow)" />
                <line x1="6" y1={s.yc} x2={CX - geo.hw(s.yc) - 6} y2={s.yc} stroke={s.base}
                      strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
                <line x1={CX + geo.hw(s.yc) + 6} y1={s.yc} x2="314" y2={s.yc} stroke={s.base}
                      strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
              </g>
            );
          })}

          <ellipse cx={CX} cy={TOP_Y} rx={geo.topRx} ry={RIM_RY} fill="#0a1626" opacity="0.5" />
          <ellipse cx={CX} cy={TOP_Y} rx={geo.topRx} ry={RIM_RY} fill="none"
                   stroke="#a9dcff" strokeWidth="2.4" filter="url(#glow)" />
          <ellipse cx={CX} cy={BOT_Y} rx={geo.botRx} ry={RIM_RY} fill="none"
                   stroke="#a9dcff" strokeWidth="2.4" filter="url(#glow)" />
          {!balanced && (
            <ellipse cx={CX} cy={NECK_Y} rx={geo.neckHW} ry="4" fill="none"
                     stroke="#a9dcff" strokeWidth="1.6" opacity="0.8" />
          )}

          <path d={geo.SIL} fill="none" stroke="#cfeaff" strokeWidth="1.5" opacity="0.55" />

          {!balanced && (
            <>
              <g filter="url(#glow)">
                <rect x={CX - pillW / 2} y={NECK_Y - 16} width={pillW} height="32" rx="16"
                      fill="rgba(6,11,22,0.92)" stroke={bn.base} strokeWidth="1.6" />
              </g>
              <text x={CX} y={NECK_Y + 5} textAnchor="middle" fill={bn.light}
                    fontSize="13.5" fontWeight="700">{bnText}</text>
            </>
          )}
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
