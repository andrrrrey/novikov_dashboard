// «Песочные часы» узкого места в стиле макета Figma (node 0:465): плотные пучки
// тонких кривых выходят из перешейка ВВЕРХ и ВНИЗ (концы — на кромках карточки),
// образуя вертикальный силуэт часов. Белые линии затухают у кромок (маска), а по
// каждой линии от кромки к центру «текут» точки.
//
// Форма — по логике старого дашборда (HourglassV2): ширина чаши кодирует уровень
// направления, а ширина горлышка — уровень узкого места. Чем ниже уровень узкого
// места, тем туже перешеек; чем выше уровни чаш — тем шире они расходятся. При
// равных уровнях (balanced) рисуем «цилиндр» — вертикальные параллельные линии.
//
// Без пропсов (levels/placement) компонент рисует исходную симметричную форму —
// это сохраняет демо-экран /club/pwa без изменений.

const CX = 180;
const NECK_Y = 150;   // вертикальное положение перешейка (совпадает с подписью «Узкое место»)
const H = 178;        // размах вверх/вниз — концы выходят за карточку и обрезаются
const N = 22;         // кривых в каждой половине
const K = 0.46;       // мягкость S-изгиба (вертикальные касательные на обоих концах)

// Диапазоны полуширины (viewBox 361, CX=180). Чаши — всегда широкие (доходят к
// углам), горлышко — всегда узкое; уровень слегка сдвигает значение внутри диапазона.
const WIDE_MIN = 158, WIDE_MAX = 250;   // полуширина чаши (верх/низ)
const NECK_MIN = 5,  NECK_MAX = 34;     // полуширина горлышка (узкое место)

function frac(level, maxLevel) {
  const n = Math.max(1, maxLevel || 1);
  const l = Math.max(1, Math.min(n, level || 1));
  return n > 1 ? (l - 1) / (n - 1) : 1;
}
function wideFor(level, maxLevel) {
  return WIDE_MIN + frac(level, maxLevel) * (WIDE_MAX - WIDE_MIN);
}
function neckFor(level, maxLevel) {
  return NECK_MIN + frac(level, maxLevel) * (NECK_MAX - NECK_MIN);
}

// Одна половина: dir = −1 вверх, +1 вниз. Линии идут от перешейка (полоса шириной
// 2·neckHW у NECK_Y) к кромке (веер шириной 2·spread у edgeY). Кубическая ogee-кривая
// с вертикальными касательными в перешейке и у кромки — тугой пинч и плавный S-изгиб.
function halfPaths(dir, spread, neckHW) {
  const arr = [];
  const edgeY = NECK_Y + dir * H;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const sx = CX - neckHW + 2 * neckHW * t;   // старт на полосе перешейка
    const ex = CX - spread + 2 * spread * t;   // конец на кромке
    const c1y = NECK_Y + dir * H * K;
    const c2y = edgeY - dir * H * K;
    arr.push(
      `M${sx.toFixed(1)} ${NECK_Y} C ${sx.toFixed(1)} ${c1y.toFixed(1)} ` +
      `${ex.toFixed(1)} ${c2y.toFixed(1)} ${ex.toFixed(1)} ${edgeY.toFixed(1)}`,
    );
  }
  return arr;
}

export default function PwaGraph({ levels, placement, balanced = false, maxLevel = 10 }) {
  // По умолчанию (демо /pwa без данных) — исходная симметричная форма.
  let topSpread = 250, botSpread = 250, neckHW = 0;
  if (levels && placement) {
    if (balanced) {
      // Все уровни равны → цилиндр: вертикальные параллельные линии (spread = neckHW).
      const w = wideFor(levels[placement.top], maxLevel);
      topSpread = botSpread = neckHW = w;
    } else {
      topSpread = wideFor(levels[placement.top], maxLevel);
      botSpread = wideFor(levels[placement.bottom], maxLevel);
      neckHW = neckFor(levels[placement.neck], maxLevel);
    }
  }

  const LINES = [...halfPaths(-1, topSpread, neckHW), ...halfPaths(1, botSpread, neckHW)];

  return (
    <svg className="pwa-graph-svg" viewBox="0 0 361 299" preserveAspectRatio="xMidYMid slice"
         aria-hidden="true">
      <defs>
        {/* Плавное затухание линий у верхней и нижней кромки карточки. */}
        <linearGradient id="pwaLineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.16" stopColor="#fff" />
          <stop offset="0.84" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id="pwaLineMask">
          <rect x="0" y="0" width="361" height="299" fill="url(#pwaLineFade)" />
        </mask>
      </defs>

      <g mask="url(#pwaLineMask)">
        <g fill="none" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.32">
          {LINES.map((d, i) => <path key={i} d={d} />)}
        </g>
        {/* Белые точки текут от кромки (keyPoints 1→0) к центру-перешейку. */}
        {LINES.map((d, i) => (
          <circle key={`dot-${i}`} r="1.5" fill="#ffffff">
            <animateMotion dur="3s" begin={`${((i % 11) * 0.27).toFixed(2)}s`}
                           repeatCount="indefinite" calcMode="linear"
                           keyPoints="1;0" keyTimes="0;1" path={d} />
            <animate attributeName="opacity" dur="3s"
                     begin={`${((i % 11) * 0.27).toFixed(2)}s`} repeatCount="indefinite"
                     values="0;0.9;0.9;0" keyTimes="0;0.2;0.8;1" />
          </circle>
        ))}
      </g>
    </svg>
  );
}
