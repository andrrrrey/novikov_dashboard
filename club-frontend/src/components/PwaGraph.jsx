// «Песочные часы» узкого места из макета Figma (node 0:465): плотные пучки
// тонких кривых из четырёх квадрантов сходятся в тугой перешеек по центру и
// выгибаются к краям, образуя силуэт песочных часов. Поверх — редкие
// горизонтальные линии-сетки. Значения статичны (демо).

const CX = 180;
const CY = 150;
const R = 250;    // длина кривых (края выходят за карточку — обрезается)
const PER = 15;   // кривых в каждом из 4 квадрантов

// Один квадрант: sx — знак по горизонтали, sy — по вертикали (−1 вверх).
function quadrant(sx, sy) {
  const arr = [];
  for (let i = 0; i < PER; i++) {
    const t = i / (PER - 1);
    // угол от почти вертикали (перешеек) до почти горизонтали (край)
    const ang = 0.04 + t * (Math.PI / 2 - 0.02);
    const ex = CX + sx * Math.sin(ang) * R;
    const ey = CY + sy * Math.cos(ang) * R;
    // контрольная точка у вертикальной оси: касательная в перешейке —
    // вертикаль, поэтому кривые сходятся в точку и плавно выгибаются наружу
    const cx = CX + sx * Math.sin(ang) * R * 0.07;
    const cy = CY + sy * R * (0.42 + 0.16 * t);
    arr.push(`M${CX} ${CY} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
  }
  return arr;
}

const LINES = [
  ...quadrant(-1, -1), ...quadrant(1, -1),
  ...quadrant(-1, 1), ...quadrant(1, 1),
];
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
