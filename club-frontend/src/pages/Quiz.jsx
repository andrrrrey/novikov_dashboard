import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import "../styles/pwa.css";

// Боевой опросник в дизайне PWA (макет Figma): нижний лист с темой, прогрессом,
// вопросом, вариантами-радио и кнопками «Назад/Далее». Вопросы и ответы —
// реальные (api.getQuiz / api.submitQuiz), по завершении ведём в кабинет.
const ASPECT_LABEL = { marketing: "Маркетинг", sales: "Продажи", management: "Менеджмент" };

export default function Quiz() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getQuiz().then(setQuestions).catch((e) => setError(e.message));
  }, []);

  if (error && !questions.length) {
    return (
      <div className="pwa">
        <div className="pwa-frame pwa-quiz-frame">
          <div className="pwa-quiz-sheet"><div className="pwa-state is-error">{error}</div></div>
        </div>
      </div>
    );
  }
  if (!questions.length) {
    return (
      <div className="pwa">
        <div className="pwa-frame pwa-quiz-frame">
          <div className="pwa-quiz-sheet"><div className="pwa-state">Загрузка…</div></div>
        </div>
      </div>
    );
  }

  const q = questions[step];
  const total = questions.length;
  const selected = answers[q.code];
  const isLast = step === total - 1;

  function pick(index) {
    setAnswers((prev) => ({ ...prev, [q.code]: index }));
  }

  async function next() {
    if (selected == null) return;
    if (!isLast) { setStep(step + 1); return; }
    setBusy(true);
    setError("");
    try {
      await api.submitQuiz(answers);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else navigate("/");
  }

  return (
    <div className="pwa">
      <div className="pwa-frame pwa-quiz-frame">
        <div className="pwa-quiz-backdrop" onClick={() => navigate("/")} />

        <div className="pwa-quiz-sheet">
          <div className="pwa-quiz-head">
            <span className="pwa-quiz-topic">{ASPECT_LABEL[q.aspect] || q.aspect}</span>
            <span className="pwa-quiz-step">{step + 1}/{total}</span>
          </div>
          <div className="pwa-quiz-progress">
            <div className="pwa-quiz-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>

          <h2 className="pwa-quiz-q">{q.text}</h2>

          <div className="pwa-quiz-opts">
            {q.options.map((opt) => (
              <button type="button" key={opt.index}
                      className={`pwa-quiz-opt${selected === opt.index ? " is-active" : ""}`}
                      onClick={() => pick(opt.index)}>
                <span className="pwa-radio" aria-hidden="true" />
                {opt.text}
              </button>
            ))}
          </div>

          {error && <div className="pwa-login-err" style={{ padding: "0 4px" }}>{error}</div>}

          <div className="pwa-quiz-foot">
            <button type="button" className="pwa-quiz-btn-ghost" onClick={back}>Назад</button>
            <button type="button" className="pwa-quiz-btn-next" onClick={next}
                    disabled={selected == null || busy}>
              {isLast ? (busy ? "Считаем…" : "Показать результат") : "Далее"}
              {!isLast && <span aria-hidden="true"> ›</span>}
            </button>
          </div>
        </div>

        <button type="button" className="pwa-quiz-close" onClick={() => navigate("/")}>Закрыть</button>
      </div>
    </div>
  );
}
