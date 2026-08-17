// «Песочные часы» узкого места из макета Figma (node 0:465): плотные пучки
// тонких кривых выходят из перешейка в центре ВВЕРХ и ВНИЗ (концы лежат на
// верхней и нижней кромке карточки), образуя высокий вертикальный силуэт часов.
// Поверх — редкие горизонтальные линии-сетки. Значения статичны (демо).

const CX = 180;
const CY = 150;
const H = 178;      // вертикальный размах (края выходят за карточку — обрезается)
const SPREAD = 250; // разброс концов по X вдоль кромки (шире карточки → углы)
const N = 22;       // кривых в каждой (верхней/нижней) половине

// Одна половина: dir = −1 вверх, +1 вниз. Все концы — на горизонтальной кромке
// y = CY + dir*H; касательная в перешейке вертикальная → линии идут вверх/вниз.
function half(dir) {
  const arr = [];
  const edgeY = CY + dir * H;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const ex = CX - SPREAD + 2 * SPREAD * t;
    const ey = edgeY;
    const cx = CX + (ex - CX) * 0.12;   // контроль у оси → тугой вертикальный перешеек
    const cy = CY + dir * H * 0.52;
    arr.push(`M${CX} ${CY} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
  }
  return arr;
}

const LINES = [...half(-1), ...half(1)];
const GRID_Y = [30, 90, 150, 210, 270];

export default function PwaGraph() {
  return (
    <svg className="pwa-graph-svg" viewBox="0 0 361 299" preserveAspectRatio="xMidYMid slice"
         aria-hidden="true">
      {GRID_Y.map((y) => (
        <line key={y} x1="-12" y1={y} x2="373" y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <g fill="none" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.32">
        {LINES.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}
