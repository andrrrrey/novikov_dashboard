import { useEffect, useRef } from "react";
import AuroraBackground from "./aurora-bg.js";

// Полноэкранный WebGL-фон Aurora (бесшовный луп). Инстанс живёт, пока смонтирован
// компонент; при размонтировании освобождается через destroy().
export default function AuroraCanvas({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const bg = new AuroraBackground(ref.current);
    return () => bg.destroy();
  }, []);

  return <canvas ref={ref} className={`aurora-canvas ${className}`} aria-hidden="true" />;
}
