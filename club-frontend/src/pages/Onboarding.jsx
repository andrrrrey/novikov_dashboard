import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import Avatar from "../components/Avatar.jsx";

// Анкета-онбординг при первом входе. Все поля, кроме фото, обязательны.
export default function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    last_name: "", first_name: "", business_name: "",
    business_field: "", birth_date: "", photo_url: "", telegram: "",
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Если анкета уже пройдена (или это админ/демо) — не держим на онбординге.
  useEffect(() => {
    api.getProfile().then((p) => {
      if (p.completed) navigate("/", { replace: true });
    }).catch(() => {});
  }, []);

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const required = ["last_name", "first_name", "business_name", "business_field", "birth_date"];
  const filled = required.every((k) => form[k].trim());

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await api.uploadMyPhoto(file);
      set("photo_url", url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!filled) return;
    setBusy(true);
    setError("");
    try {
      await api.saveProfile({
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
        business_name: form.business_name.trim(),
        business_field: form.business_field.trim(),
        birth_date: form.birth_date,
        photo_url: form.photo_url || null,
        telegram: form.telegram.trim() || null,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="quiz-wrap">
      <form className="panel quiz-card onb-card" onSubmit={submit}>
        <h2 className="onb-title">Расскажите о себе</h2>
        <p className="muted onb-sub">Пара минут — и мы настроим ваш кабинет резидента.</p>

        <div className="onb-photo">
          <Avatar photoUrl={form.photo_url} firstName={form.first_name}
                  lastName={form.last_name} size={72} />
          <div className="onb-photo-actions">
            <label className="btn admin-mini">
              {uploading ? "Загрузка…" : form.photo_url ? "Заменить фото" : "Прикрепить фото"}
              <input type="file" accept="image/png,image/jpeg,image/webp"
                     hidden onChange={onPhoto} disabled={uploading} />
            </label>
            {form.photo_url && (
              <button type="button" className="btn admin-mini"
                      onClick={() => set("photo_url", "")}>Убрать</button>
            )}
            <span className="muted onb-photo-hint">Необязательно</span>
          </div>
        </div>

        <div className="onb-grid">
          <label className="onb-field">
            <span className="label">Фамилия *</span>
            <input className="input" value={form.last_name}
                   onChange={(e) => set("last_name", e.target.value)} required />
          </label>
          <label className="onb-field">
            <span className="label">Имя *</span>
            <input className="input" value={form.first_name}
                   onChange={(e) => set("first_name", e.target.value)} required />
          </label>
          <label className="onb-field onb-field-wide">
            <span className="label">Название бизнеса / компании *</span>
            <input className="input" value={form.business_name}
                   onChange={(e) => set("business_name", e.target.value)} required />
          </label>
          <label className="onb-field onb-field-wide">
            <span className="label">Сфера или специализация *</span>
            <input className="input" placeholder="например, Юридические услуги"
                   value={form.business_field}
                   onChange={(e) => set("business_field", e.target.value)} required />
          </label>
          <label className="onb-field">
            <span className="label">Дата рождения *</span>
            <input className="input" type="date" value={form.birth_date}
                   onChange={(e) => set("birth_date", e.target.value)} required />
          </label>
          <label className="onb-field">
            <span className="label">Телеграм</span>
            <input className="input" placeholder="@username" value={form.telegram}
                   onChange={(e) => set("telegram", e.target.value)} />
          </label>
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="btn btn-primary onb-submit" disabled={!filled || busy || uploading}>
          {busy ? "Сохраняем…" : "Продолжить"}
        </button>
      </form>
    </div>
  );
}
