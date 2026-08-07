// Траектория развития (viz) для дизайн-системы Lumen.
// Наследует геометрию HourglassV2 (узкое место = горлышко песочных часов),
// но перекрашена в язык лендинга: зелёное стекло, люминесцентные контуры,
// прозрачные слои и мягкое свечение. Cyan/violet — только точечные акценты.
// Диаграмма остаётся понятной: слева подписи аспектов и уровни, справа — объект.

const ASPECTS = {
  management: { label: "Менеджмент", base: "#63f04f", light: "#aaff98" },
  marketing:  { label: "Маркетинг",  base: "#46d6e6", light: "#9beef5" },
  sales:      { label: "Продажи",    base: "#a472ff", light: "#cdb4ff" },
};
const ORDER = ["management", "marketing", "sales"];

const CX = 160, RIM_RY = 16, TOP_Y = 44, BOT_Y = 392;
const NECK_Y = 212;
const HW_WIDE_MIN = 74, HW_WIDE_MAX = 94;
const HW_NECK_MIN = 22, HW_NECK_MAX = 34;

function _frac(level, maxLevel) {
  const n = Math.max(1, maxLevel || 1);
  const l = Math.max(1, Math.min(n, level));
  return n > 1 ? (l - 1) / (n - 1) : 1;
}
function wideForLevel(level, maxLevel) {
  return HW_WIDE_MIN + _frac(level, maxLevel) * (HW_WIDE_MAX - HW_WIDE_MIN);
}
function neckForLevel(level, maxLevel) {
  return HW_NECK_MIN + _frac(level, maxLevel) * (HW_NECK_MAX - HW_NECK_MIN);
}

const VB_TOP = 16, VB_H = 408;

function surfaceY(zone, level, maxLevel) {
  const frac = Math.min(1, level / Math.max(1, maxLevel || 1));
  return zone[1] - frac * (zone[1] - zone[0]);
}
function pct(y) {
  return Math.min(94, Math.max(6, ((y - VB_TOP) / VB_H) * 100));
}

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

function cylinderGeo(rx) {
  const SIL =
    `M${CX - rx},${TOP_Y} L${CX + rx},${TOP_Y}` +
    ` L${CX + rx},${BOT_Y} L${CX - rx},${BOT_Y} Z`;
  const H = (BOT_Y - TOP_Y) / 3;
  return {
    SIL, hw: () => rx, topRx: rx, botRx: rx,
    order: ["top", "mid", "bottom"],
    slots: {
      top:    { yc: TOP_Y + H * 0.5, zone: [TOP_Y, TOP_Y + H] },
      mid:    { yc: TOP_Y + H * 1.5, zone: [TOP_Y + H, TOP_Y + 2 * H] },
      bottom: { yc: TOP_Y + H * 2.5, zone: [TOP_Y + 2 * H, BOT_Y] },
    },
  };
}

export default function TrajectoryLumen({ levels, bottleneck, balanced = false, maxLevel = 10 }) {
  const placement = balanced
    ? { top: ORDER[0], mid: ORDER[1], bottom: ORDER[2] }
    : (() => {
        const rest = ORDER.filter((a) => a !== bottleneck.aspect);
        return { top: rest[0], neck: bottleneck.aspect, bottom: rest[1] };
      })();

  const geo = balanced
    ? cylinderGeo(wideForLevel(levels[ORDER[0]], maxLevel))
    : hourglassGeo(
        wideForLevel(levels[placement.top], maxLevel),
        neckForLevel(levels[placement.neck], maxLevel),
        wideForLevel(levels[placement.bottom], maxLevel),
      );

  const slots = geo.order.map((slot) => {
    const aspect = placement[slot];
    const zone = geo.slots[slot].zone;
    return {
      slot, aspect, zone, yc: geo.slots[slot].yc,
      level: levels[aspect],
      surf: surfaceY(zone, levels[aspect], maxLevel),
      isBottleneck: slot === "neck",
      ...ASPECTS[aspect],
    };
  });

  const bn = balanced ? null : ASPECTS[bottleneck.aspect];
  const bnText = bn ? `Узкое место: ${bn.label}` : "";
  const pillW = bnText.length * 7.2 + 26;

  const shineTop = balanced ? "" :
    `${CX - geo.hw(TOP_Y + 10) + 10},${TOP_Y + 10} ${CX - geo.neckHW + 3},${NECK_Y - 6}` +
    ` ${CX},${NECK_Y - 6} ${CX - geo.hw(TOP_Y + 10) + 26},${TOP_Y + 10}`;
  const shineBot = balanced ? "" :
    `${CX - geo.neckHW + 3},${NECK_Y + 8} ${CX - geo.hw(BOT_Y - 8) + 10},${BOT_Y - 8}` +
    ` ${CX - geo.hw(BOT_Y - 8) + 30},${BOT_Y - 8} ${CX},${NECK_Y + 8}`;

  // Люминесцентный контур объекта — зелёный (бренд).
  const RIM = "#aaff98";
  const RIM_SOFT = "#69ff4f";

  return (
    <div className="lm-hg">
      <div className="lm-hg-labels">
        {slots.map((s) => (
          <div className="lm-hg-aspect" key={s.slot} style={{ top: `${pct(s.yc)}%` }}>
            <span className="lm-hg-aspect-name" style={{ color: s.base }}>{s.label}</span>
            <span className="lm-hg-aspect-lvl">Уровень {s.level}</span>
          </div>
        ))}
      </div>

      <svg className="lm-hg-svg" viewBox={`0 ${VB_TOP} 320 ${VB_H}`} role="img"
           aria-label={balanced ? "Диаграмма состояния бизнеса" : "Траектория развития: узкое место и уровни направлений"}>
        <defs>
          <clipPath id="lmGlass"><path d={geo.SIL} /></clipPath>
          <filter id="lmGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="lmGlowBig" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <linearGradient id="lmBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8dffb0" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#4fe08a" stopOpacity="0.13" />
          </linearGradient>
          <linearGradient id="lmShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {ORDER.map((k) => (
            <linearGradient id={`lmLiq-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ASPECTS[k].light} stopOpacity="0.45" />
              <stop offset="100%" stopColor={ASPECTS[k].base} stopOpacity="0.9" />
            </linearGradient>
          ))}
        </defs>

        {/* Внешнее свечение силуэта */}
        <path d={geo.SIL} fill="none" stroke={RIM_SOFT} strokeWidth="3" opacity="0.42" filter="url(#lmGlowBig)" />
        <path d={geo.SIL} fill="url(#lmBody)" />

        <g clipPath="url(#lmGlass)">
          {slots.map((s) => (
            <rect key={s.slot} x="58" y={s.surf} width="204" height={s.zone[1] - s.surf}
                  fill={`url(#lmLiq-${s.aspect})`} />
          ))}
          {balanced ? (
            <rect x={CX - geo.topRx + 10} y={TOP_Y} width="16" height={BOT_Y - TOP_Y}
                  fill="url(#lmShine)" opacity="0.32" />
          ) : (
            <>
              <polygon points={shineTop} fill="url(#lmShine)" opacity="0.48" />
              <polygon points={shineBot} fill="url(#lmShine)" opacity="0.38" />
            </>
          )}
        </g>

        {slots.map((s) => {
          const rx = Math.max(geo.hw(s.surf), 6);
          const ry = rx * 0.17 + 1.5;
          return (
            <g key={s.slot}>
              <ellipse cx={CX} cy={s.surf} rx={rx} ry={ry} fill={s.light} opacity="0.45" />
              <ellipse cx={CX} cy={s.surf} rx={rx} ry={ry} fill="none"
                       stroke={s.light} strokeWidth="2" filter="url(#lmGlow)" />
              <line x1="6" y1={s.yc} x2={CX - geo.hw(s.yc) - 6} y2={s.yc} stroke={s.base}
                    strokeWidth="1" strokeDasharray="2 4" opacity="0.35" />
              <line x1={CX + geo.hw(s.yc) + 6} y1={s.yc} x2="314" y2={s.yc} stroke={s.base}
                    strokeWidth="1" strokeDasharray="2 4" opacity="0.35" />
            </g>
          );
        })}

        <ellipse cx={CX} cy={TOP_Y} rx={geo.topRx} ry={RIM_RY} fill="#071108" opacity="0.5" />
        <ellipse cx={CX} cy={TOP_Y} rx={geo.topRx} ry={RIM_RY} fill="none"
                 stroke={RIM} strokeWidth="2.4" filter="url(#lmGlow)" />
        <ellipse cx={CX} cy={BOT_Y} rx={geo.botRx} ry={RIM_RY} fill="none"
                 stroke={RIM} strokeWidth="2.4" filter="url(#lmGlow)" />
        {!balanced && (
          <ellipse cx={CX} cy={NECK_Y} rx={geo.neckHW} ry="4" fill="none"
                   stroke={RIM} strokeWidth="1.6" opacity="0.8" />
        )}

        <path d={geo.SIL} fill="none" stroke="#d6ffcf" strokeWidth="1.5" opacity="0.5" />

        {!balanced && (
          <>
            <g filter="url(#lmGlow)">
              <rect x={CX - pillW / 2} y={NECK_Y - 16} width={pillW} height="32" rx="16"
                    fill="rgba(6,11,7,0.94)" stroke={bn.base} strokeWidth="1.6" />
            </g>
            <text x={CX} y={NECK_Y + 5} textAnchor="middle" fill={bn.light}
                  fontSize="12" fontWeight="700"
                  fontFamily="'Golos Text', sans-serif">{bnText}</text>
          </>
        )}
      </svg>
    </div>
  );
}
