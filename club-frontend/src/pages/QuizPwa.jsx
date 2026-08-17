import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pwa.css";

// Новый дизайн опросника по макету Figma (справа от профиля): нижний лист с
// вопросом, вариантами-радио, кнопками «Назад/Далее» и «Закрыть». Демо —
// статичные вопросы, по завершении возвращает на дашборд /pwa.
const QUESTIONS = [
  {
    topic: "Маркетинг",
    q: "Как к вам приходят новые клиенты?",
    options: [
      "Только сарафанка/партнёрка",
      "Реклама плюс сарафанка",
      "Есть отдел маркетинга и воронки",
      "Системный маркетинг с аналитикой",
    ],
  },
  {
    topic: "Продажи",
    q: "Кто закрывает ключевые сделки?",
    options: [
      "Только я лично",
      "Я и один менеджер",
      "Отдел продаж по скриптам",
      "РОП и команда без меня",
    ],
  },
  {
    topic: "Менеджмент",
    q: "Как устроены процессы в команде?",
    options: [
      "Всё держится на мне",
      "Есть частичные регламенты",
      "Прописаны основные процессы",
      "Системный менеджмент и метрики",
    ],
  },
];

export default function QuizPwa() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const total = QUESTIONS.length;
  const cur = QUESTIONS[step];
  const selected = answers[step] ?? 0;

  function pick(i) {
    setAnswers((a) => ({ ...a, [step]: i }));
  }
  function next() {
    if (step < total - 1) setStep(step + 1);
    else navigate("/pwa");
  }
  function back() {
    if (step > 0) setStep(step - 1);
    else navigate(-1);
  }

  return (
    <div className="pwa">
      <div className="pwa-frame pwa-quiz-frame">
        <div className="pwa-quiz-backdrop" onClick={() => navigate("/pwa")} />

        <div className="pwa-quiz-sheet">
          <div className="pwa-quiz-head">
            <span className="pwa-quiz-topic">{cur.topic}</span>
            <span className="pwa-quiz-step">{step + 1}/{total}</span>
          </div>
          <div className="pwa-quiz-progress">
            <div className="pwa-quiz-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>

          <h2 className="pwa-quiz-q">{cur.q}</h2>

          <div className="pwa-quiz-opts">
            {cur.options.map((o, i) => (
              <button type="button" key={o}
                      className={`pwa-quiz-opt${i === selected ? " is-active" : ""}`}
                      onClick={() => pick(i)}>
                <span className="pwa-radio" aria-hidden="true" />
                {o}
              </button>
            ))}
          </div>

          <div className="pwa-quiz-foot">
            <button type="button" className="pwa-quiz-btn-ghost" onClick={back}>Назад</button>
            <button type="button" className="pwa-quiz-btn-next" onClick={next}>
              Далее <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>

        <button type="button" className="pwa-quiz-close" onClick={() => navigate("/pwa")}>Закрыть</button>
      </div>
    </div>
  );
}
