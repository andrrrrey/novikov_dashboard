// «Песочные часы» узкого места из макета Figma (node 0:465): плотные пучки
// тонких кривых выходят из перешейка в центре ВВЕРХ и ВНИЗ (концы лежат на
// верхней и нижней кромке карточки), образуя высокий вертикальный силуэт часов.
// Белые линии плавно исчезают у верхней и нижней кромки (маска-градиент), а по
// каждой линии от кромки к центру «текут» белые точки. Значения статичны (демо).

const CX = 180;
const CY = 150;
const H = 178;      // вертикальный размах (края выходят за карточку — обрезается)
const SPREAD = 250; // разброс концов по X вдоль кромки (шире карточки → углы)
const N = 22;       // кривых в каждой (верхней/нижней) половине

const K = 0.46;    // «мягкость» изгиба (вертикальные касательные на обоих концах)

// Одна половина: dir = −1 вверх, +1 вниз. Все концы — на горизонтальной кромке
// y = CY + dir*H. Кубическая кривая (ogee): вертикальная касательная и в перешейке,
// и у кромки — линии сходятся в тугой пинч и плавно S-образно изгибаются.
function half(dir) {
  const arr = [];
  const edgeY = CY + dir * H;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const ex = CX - SPREAD + 2 * SPREAD * t;
    const c1x = CX;                 // из перешейка — строго вверх/вниз
    const c1y = CY + dir * H * K;
    const c2x = ex;                 // к кромке — приходит вертикально
    const c2y = edgeY - dir * H * K;
    arr.push(`M${CX} ${CY} C ${c1x} ${c1y.toFixed(1)} ${ex.toFixed(1)} ${c2y.toFixed(1)} ${ex.toFixed(1)} ${edgeY.toFixed(1)}`);
  }
  return arr;
}

const LINES = [...half(-1), ...half(1)];

export default function PwaGraph() {
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
        {/* Белые точки текут от кромки (keyPoints 1→0) к центру-перешейку.
            Смещённый begin по каждой линии даёт эффект «бегущего» потока. */}
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
