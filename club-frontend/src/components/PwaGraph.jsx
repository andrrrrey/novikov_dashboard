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

// Полуширина зон (viewBox 361, CX=180). Ширина растёт на фиксированный шаг за
// каждый уровень — так разница между чашами хорошо видна (где уровень выше, там
// чаша заметно шире). Чаши всегда широкие, горлышко (узкое место) — всегда узкое.
const WIDE_MIN = 150, WIDE_MAX = 262, WIDE_STEP = 18;  // чаша: +18 полуширины на уровень
const NECK_MIN = 5,  NECK_MAX = 34,  NECK_STEP = 4;    // горлышко (узкое место)
const CYL_MIN = 66,  CYL_MAX = 96,  CYL_STEP = 5;      // «цилиндр» при равных уровнях

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lvl = (level) => Math.max(1, level || 1);
function wideFor(level) { return clamp(WIDE_MIN + (lvl(level) - 1) * WIDE_STEP, WIDE_MIN, WIDE_MAX); }
function neckFor(level) { return clamp(NECK_MIN + (lvl(level) - 1) * NECK_STEP, NECK_MIN, NECK_MAX); }
function cylFor(level)  { return clamp(CYL_MIN + (lvl(level) - 1) * CYL_STEP, CYL_MIN, CYL_MAX); }

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

export default function PwaGraph({ levels, placement, balanced = false }) {
  // По умолчанию (демо /pwa без данных) — исходная симметричная форма.
  let topSpread = 250, botSpread = 250, neckHW = 0;
  if (levels && placement) {
    if (balanced) {
      // Все уровни равны → узкий цилиндр (не на всю ширину): вертикальные
      // параллельные линии, spread = neckHW, ширина умеренная (CYL_*).
      const w = cylFor(levels[placement.top]);
      topSpread = botSpread = neckHW = w;
    } else {
      // Чаши — по своим уровням (видно, где уровень выше), горлышко — узкое место.
      topSpread = wideFor(levels[placement.top]);
      botSpread = wideFor(levels[placement.bottom]);
      neckHW = neckFor(levels[placement.neck]);
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
