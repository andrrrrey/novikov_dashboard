import PwaTabBar from "./PwaNav.jsx";
import { PlayIcon } from "./PwaIcons.jsx";
import "../styles/pwa.css";

// Оболочка PWA: мобильный фрейм по центру (макет Figma 393px), hero-фон
// сверху, прокручиваемый контент и «плавающая» нижняя панель (CTA + таб-бар),
// которая остаётся закреплённой при прокрутке (position: sticky).
// dashHref/resHref — адреса вкладок таб-бара (боевой кабинет vs демо /pwa).
// onCta — обработчик кнопки CTA; ctaHref — если задан, CTA становится ссылкой.
export default function PwaShell({
  children,
  cta = "Запустить траекторию развития",
  hero = true,
  heroImage = null,
  nav = true,
  dashHref = "/pwa",
  resHref = "/pwa/residents",
  onCta = null,
  ctaHref = null,
}) {
  const ctaInner = (
    <>
      <span>{cta}</span>
      <PlayIcon size={20} color="#0c1c08" />
    </>
  );
  return (
    <div className="pwa">
      <div className="pwa-frame">
        {hero && (
          <div
            className={`pwa-hero${heroImage ? " pwa-hero-img" : ""}`}
            style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
            aria-hidden="true"
          />
        )}
        <div className="pwa-content">{children}</div>

        {nav && (
          <div className="pwa-bottom">
            {cta && (
              <div className="pwa-cta-wrap">
                {ctaHref ? (
                  <a className="pwa-cta" href={ctaHref} target="_blank" rel="noreferrer">{ctaInner}</a>
                ) : (
                  <button type="button" className="pwa-cta" onClick={onCta || undefined}>{ctaInner}</button>
                )}
              </div>
            )}
            <PwaTabBar dashHref={dashHref} resHref={resHref} />
            <div className="pwa-home-indicator" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
