import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

const ASPECT_LABEL = { marketing: "Маркетинг", sales: "Продажи", management: "Менеджмент" };
const ASPECT_COLOR = { marketing: "var(--blue)", sales: "var(--purple)", management: "var(--green)" };

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

  if (error) return <div className="quiz-wrap"><div className="panel quiz-card">{error}</div></div>;
  if (!questions.length) return <div className="quiz-wrap"><div className="panel quiz-card muted">Загрузка…</div></div>;

  const q = questions[step];
  const total = questions.length;
  const selected = answers[q.code];
  const isLast = step === total - 1;
  const answeredAll = questions.every((item) => answers[item.code]);

  function choose(level) {
    setAnswers((prev) => ({ ...prev, [q.code]: level }));
  }

  async function next() {
    if (!selected) return;
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

  return (
    <div className="quiz-wrap">
      <div className="panel quiz-card">
        <div className="quiz-progress">
          <div className="quiz-progress-bar" style={{ width: `${((step) / total) * 100}%` }} />
        </div>
        <div className="quiz-meta">
          <span className="quiz-aspect" style={{ color: ASPECT_COLOR[q.aspect] }}>
            {ASPECT_LABEL[q.aspect]}
          </span>
          <span className="quiz-count">{step + 1} / {total}</span>
        </div>

        <h2 className="quiz-question">{q.text}</h2>

        <div className="quiz-options">
          {q.options.map((opt) => (
            <button key={opt.level}
                    className={`quiz-option ${selected === opt.level ? "is-selected" : ""}`}
                    onClick={() => choose(opt.level)}>
              <span className="quiz-radio" />
              <span>{opt.text}</span>
            </button>
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="quiz-nav">
          <button className="btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Назад
          </button>
          <button className="btn btn-primary" onClick={next} disabled={!selected || busy}>
            {isLast ? (busy ? "Считаем…" : "Показать результат") : "Далее"}
          </button>
        </div>
        {isLast && !answeredAll && (
          <p className="quiz-hint muted">Ответьте на все вопросы, чтобы увидеть результат.</p>
        )}
      </div>
    </div>
  );
}
