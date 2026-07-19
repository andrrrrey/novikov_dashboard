// Компактная версия «колбы состояния бизнеса» для дашборда V2 (приборная панель).
// Геометрия и цвета — те же, что в Hourglass.jsx: узкий аспект (узкое место)
// занимает горлышко песочных часов, два других — верхнюю и нижнюю чаши.
// Если все три уровня равны (balanced) — рисуем прямой цилиндр без горлышка.
// Отличие от Hourglass.jsx: рендерится только «сцена» (подписи + SVG + цифры),
// без заголовка и без карточки рекомендации — их размещает страница DashboardV2.

const ASPECTS = {
  management: { label: "Менеджмент", base: "#34e39a", light: "#7ffcc9" },
  marketing:  { label: "Маркетинг",  base: "#3b9eff", light: "#8fc7ff" },
  sales:      { label: "Продажи",    base: "#a472ff", light: "#c9a8ff" },
};
const ORDER = ["management", "marketing", "sales"]; // канонический порядок

const CX = 160, RIM_RY = 16, TOP_Y = 44, BOT_Y = 392;

// Песочные часы
const HG_TOP_RX = 94, HG_BOT_RX = 94, NECK_Y = 212, NECK_HW = 13;
// Цилиндр (постоянная полуширина)
const CYL_RX = 76;

const VB_TOP = 16, VB_H = 408;

function surfaceY(zone, level) {
  return zone[1] - (level / 3) * (zone[1] - zone[0]);
}
function pct(y) {
  return Math.min(94, Math.max(6, ((y - VB_TOP) / VB_H) * 100));
}

function hourglassGeo() {
  const SIL =
    `M${CX - HG_TOP_RX},${TOP_Y} L${CX + HG_TOP_RX},${TOP_Y} L${CX + NECK_HW},${NECK_Y}` +
    ` L${CX + HG_BOT_RX},${BOT_Y} L${CX - HG_BOT_RX},${BOT_Y} L${CX - NECK_HW},${NECK_Y} Z`;
  const hw = (y) =>
    y <= NECK_Y
      ? Math.max(HG_TOP_RX + (y - TOP_Y) / (NECK_Y - TOP_Y) * (NECK_HW - HG_TOP_RX), NECK_HW)
      : NECK_HW + (y - NECK_Y) / (BOT_Y - NECK_Y) * (HG_BOT_RX - NECK_HW);
  return {
    SIL, hw, topRx: HG_TOP_RX, botRx: HG_BOT_RX,
    order: ["top", "neck", "bottom"],
    slots: {
      top:    { yc: 128, zone: [72, 190] },
      neck:   { yc: 212, zone: [186, 238] },
      bottom: { yc: 316, zone: [252, 384] },
    },
  };
}

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

export default function HourglassV2({ levels, bottleneck, balanced = false }) {
  const geo = balanced ? cylinderGeo() : hourglassGeo();

  const placement = balanced
    ? { top: ORDER[0], mid: ORDER[1], bottom: ORDER[2] }
    : (() => {
        const rest = ORDER.filter((a) => a !== bottleneck.aspect);
        return { top: rest[0], neck: bottleneck.aspect, bottom: rest[1] };
      })();

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

  return (
    <div className="hgv2-stage">
      <div className="hgv2-col hgv2-col-left">
        {slots.map((s) => (
          <div className="hgv2-aspect" key={s.slot} style={{ top: `${pct(s.yc)}%` }}>
            <span className="hgv2-aspect-name" style={{ color: s.base }}>{s.label}</span>
            <span className="hgv2-aspect-lvl">Уровень {s.level}</span>
          </div>
        ))}
      </div>

      <svg className="hgv2-svg" viewBox={`0 ${VB_TOP} 320 ${VB_H}`} role="img"
           aria-label={balanced ? "Цилиндр состояния бизнеса" : "Песочные часы состояния бизнеса"}>
        <defs>
          <clipPath id="glassV2"><path d={geo.SIL} /></clipPath>
          <filter id="glowV2" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowBigV2" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <linearGradient id="glassBodyV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6fd3e8" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#6fd3e8" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="shineV2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {ORDER.map((k) => (
            <linearGradient id={`liqV2-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ASPECTS[k].light} stopOpacity="0.5" />
              <stop offset="100%" stopColor={ASPECTS[k].base} stopOpacity="0.92" />
            </linearGradient>
          ))}
        </defs>

        <path d={geo.SIL} fill="none" stroke="#8fd3ff" strokeWidth="3" opacity="0.5" filter="url(#glowBigV2)" />
        <path d={geo.SIL} fill="url(#glassBodyV2)" />

        <g clipPath="url(#glassV2)">
          {slots.map((s) => (
            <rect key={s.slot} x="58" y={s.surf} width="204" height={s.zone[1] - s.surf}
                  fill={`url(#liqV2-${s.aspect})`} />
          ))}
          {balanced ? (
            <rect x={CX - CYL_RX + 10} y={TOP_Y} width="16" height={BOT_Y - TOP_Y}
                  fill="url(#shineV2)" opacity="0.35" />
          ) : (
            <>
              <polygon points="76,54 150,206 160,206 92,54" fill="url(#shineV2)" opacity="0.5" />
              <polygon points="150,220 76,384 96,384 160,220" fill="url(#shineV2)" opacity="0.4" />
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
                       stroke={s.light} strokeWidth="2" filter="url(#glowV2)" />
              <line x1="6" y1={s.yc} x2={CX - geo.hw(s.yc) - 6} y2={s.yc} stroke={s.base}
                    strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
              <line x1={CX + geo.hw(s.yc) + 6} y1={s.yc} x2="314" y2={s.yc} stroke={s.base}
                    strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
            </g>
          );
        })}

        <ellipse cx={CX} cy={TOP_Y} rx={geo.topRx} ry={RIM_RY} fill="#0a1626" opacity="0.5" />
        <ellipse cx={CX} cy={TOP_Y} rx={geo.topRx} ry={RIM_RY} fill="none"
                 stroke="#a9dcff" strokeWidth="2.4" filter="url(#glowV2)" />
        <ellipse cx={CX} cy={BOT_Y} rx={geo.botRx} ry={RIM_RY} fill="none"
                 stroke="#a9dcff" strokeWidth="2.4" filter="url(#glowV2)" />
        {!balanced && (
          <ellipse cx={CX} cy={NECK_Y} rx={NECK_HW} ry="4" fill="none"
                   stroke="#a9dcff" strokeWidth="1.6" opacity="0.8" />
        )}

        <path d={geo.SIL} fill="none" stroke="#cfeaff" strokeWidth="1.5" opacity="0.55" />

        {!balanced && (
          <>
            <g filter="url(#glowV2)">
              <rect x={CX - pillW / 2} y={NECK_Y - 16} width={pillW} height="32" rx="16"
                    fill="rgba(6,11,22,0.92)" stroke={bn.base} strokeWidth="1.6" />
            </g>
            <text x={CX} y={NECK_Y + 5} textAnchor="middle" fill={bn.light}
                  fontSize="13.5" fontWeight="700">{bnText}</text>
          </>
        )}
      </svg>
    </div>
  );
}
