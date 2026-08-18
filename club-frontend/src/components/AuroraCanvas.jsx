import { useEffect, useRef } from "react";
import AuroraBackground from "./aurora-bg.js";

// WebGL-фон Aurora (бесшовный луп). Позиционирование задаёт переданный
// className (напр. .pwa-login-aurora — absolute inset:0 внутри фрейма).
// Инстанс живёт, пока смонтирован компонент; при размонтировании — destroy().
export default function AuroraCanvas({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const bg = new AuroraBackground(ref.current);
    return () => bg.destroy();
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
