import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import PwaShell from "../components/PwaShell.jsx";
import PwaGraph from "../components/PwaGraph.jsx";
import {
  PlayIcon, QuestionIcon, BookIcon, BoltIcon, BulbIcon,
} from "../components/PwaIcons.jsx";

// PWA-дашборд по макету Figma (node 0-403). Данные статичны — демо-версия для
// показа. Отдельная ссылка /club/pwa; логика/бэкенд не задействованы.
export default function DashboardPwa() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <PwaShell cta="Запустить траекторию развития">
      {/* Шапка: «Смотреть» · профиль · «Выйти» */}
      <header className="pwa-header">
        <div className="side left">
          <button type="button" className="pwa-pill">
            Смотреть
            <PlayIcon size={15} color="#fff" />
          </button>
        </div>
        <div className="pwa-profile">
          <div className="pwa-avatar">ИП</div>
          <div className="pwa-name">Иван</div>
          <div className="pwa-biz">Юридическое бюро “Гарант”</div>
        </div>
        <div className="side right">
          <button type="button" className="pwa-pill muted" onClick={logout}>Выйти</button>
        </div>
      </header>

      <div className="pwa-stack">
        {/* Уровень вашего бизнеса */}
        <section className="pwa-level">
          <div className="pwa-card-head">
            <span className="pwa-card-title">Уровень вашего бизнеса</span>
            <QuestionIcon size={20} bg="#1b1b1b" />
          </div>
          <div className="pwa-level-body">
            <div className="pwa-level-top">
              <div className="pwa-level-num">
                <b>4</b><i>/10</i>
              </div>
              <div className="pwa-level-days">
                Вы находитесь <b>23 дня</b> на этом уровне
              </div>
            </div>
            <div className="pwa-level-prog">
              <div className="pwa-progress">
                <div className="pwa-progress-fill" style={{ width: "80%" }} />
                <span className="pwa-progress-pct">80%</span>
              </div>
              <div className="pwa-progress-cap">
                <b>2 из 5</b><span>материалов пройдено до следующего уровня</span>
              </div>
            </div>
          </div>
        </section>

        {/* Знание / Влияние */}
        <div className="pwa-metrics">
          <div className="pwa-metric">
            <span className="q"><QuestionIcon size={15} bg="#1b1b1b" /></span>
            <span className="pwa-metric-ic"><BookIcon size={24} /></span>
            <div className="pwa-metric-txt">
              <span className="pwa-metric-val">14</span>
              <span className="pwa-metric-lbl">Знание</span>
            </div>
          </div>
          <div className="pwa-metric">
            <span className="q"><QuestionIcon size={15} bg="#1b1b1b" /></span>
            <span className="pwa-metric-ic"><BoltIcon size={24} /></span>
            <div className="pwa-metric-txt">
              <span className="pwa-metric-val">128</span>
              <span className="pwa-metric-lbl">Влияние</span>
            </div>
          </div>
        </div>

        {/* Граф «Узкое место» */}
        <section className="pwa-graph">
          <PwaGraph />
          <div className="pwa-graph-lbl" style={{ left: "50%", top: "24px" }}>
            <div className="pwa-cat">
              <span className="dot" style={{ background: "#b4f1ec" }} />
              <span>Менеджмент</span>
            </div>
            <div className="pwa-cat-lvl">уровень: 5</div>
          </div>
          <div className="pwa-graph-neck" style={{ left: "22.4%", top: "134px" }}>
            <span className="pwa-neck-title">Узкое место</span>
            <div className="pwa-cat">
              <span className="dot" style={{ background: "#7779ff" }} />
              <span>Продажи</span>
            </div>
          </div>
          <div className="pwa-graph-lvl4" style={{ left: "59.6%", top: "165px" }}>уровень: 4</div>
          <div className="pwa-graph-lbl" style={{ left: "50%", top: "231px" }}>
            <div className="pwa-cat">
              <span className="dot" style={{ background: "#70d8bd" }} />
              <span>Маркетинг</span>
            </div>
            <div className="pwa-cat-lvl">уровень: 5</div>
          </div>
        </section>

        {/* Рекомендация */}
        <section className="pwa-reco">
          <div className="pwa-reco-head">
            <BulbIcon size={20} color="#6ddd51" />
            <span>Рекомендация</span>
          </div>
          <p className="pwa-reco-text">
            Продажи — ваше узкое место. Отдел работает, но ключевые сделки всё ещё
            держатся на вас: пропишите стандарты и передайте их руководителю продаж.
          </p>
        </section>

        {/* Пройти тест заново */}
        <button type="button" className="pwa-retake" onClick={() => navigate("/pwa/quiz")}>
          Пройти тест заново
        </button>
      </div>
    </PwaShell>
  );
}
