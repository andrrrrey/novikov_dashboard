// Декоративная «сетка песочных часов» из макета Figma (node 0:465): тонкие
// белые кривые сходятся к перешейку в центре и веерами расходятся вверх и вниз,
// поверх — редкие горизонтальные линии-сетки. Значения статичны (демо).

const CX = 180;
const CY = 150;
const R = 170;      // радиус вееров (верх/низ выходят за карточку — обрезается)
const N = 11;       // число кривых в каждом веере
const GRID_Y = [30, 90, 150, 210, 270];

function fan(dir) {
  // dir = -1 веер вверх, +1 веер вниз
  const paths = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const ang = (-82 + 164 * t) * (Math.PI / 180);
    const ex = CX + Math.sin(ang) * R;
    const ey = CY + dir * Math.cos(ang) * R;
    const cAng = ang * 0.32;
    const cR = R * 0.55;
    const cx = CX + Math.sin(cAng) * cR;
    const cy = CY + dir * Math.cos(cAng) * cR;
    paths.push(`M${CX} ${CY} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
  }
  return paths;
}

export default function PwaGraph() {
  const lines = [...fan(-1), ...fan(1)];
  return (
    <svg className="pwa-graph-svg" viewBox="0 0 361 299" preserveAspectRatio="xMidYMid slice"
         aria-hidden="true">
      {GRID_Y.map((y) => (
        <line key={y} x1="-12" y1={y} x2="373" y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <g fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.13">
        {lines.map((d, i) => <path key={i} d={d} />)}
      </g>
      {/* Мягкий блик у перешейка */}
      <circle cx={CX} cy={CY} r="1.6" fill="#ffffff" fillOpacity="0.5" />
    </svg>
  );
}
