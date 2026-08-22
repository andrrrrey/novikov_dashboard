import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { initials } from "../components/Avatar.jsx";
import "../styles/pwa.css";

// Анкета-онбординг при первом входе — в дизайне PWA (как опросник), в мобильном
// фрейме 393px, как остальные экраны кабинета. Все поля, кроме фото, обязательны.
export default function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    last_name: "", first_name: "", business_name: "",
    business_field: "", birth_date: "", birth_time: "", birth_city: "",
    photo_url: "", telegram: "",
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
  // Фото теперь обязательно — без него анкету не отправить.
  const filled = required.every((k) => form[k].trim()) && !!form.photo_url;

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
        birth_time: form.birth_time || null,
        birth_city: form.birth_city.trim() || null,
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
    <div className="pwa">
      <div className="pwa-frame pwa-onb">
        <div className="pwa-onb-inner">
          <h1 className="pwa-onb-title">Расскажите о себе</h1>
          <p className="pwa-onb-sub">Пара минут — и мы настроим ваш кабинет резидента.</p>

          <div className="pwa-onb-photo">
            <div className="pwa-onb-av">
              {form.photo_url
                ? <img src={form.photo_url} alt="" />
                : <span>{initials(form.first_name, form.last_name)}</span>}
            </div>
            <div className="pwa-onb-photo-actions">
              <label className="pwa-onb-mini">
                {uploading ? "Загрузка…" : form.photo_url ? "Заменить фото" : "Прикрепить фото *"}
                <input type="file" accept="image/*"
                       hidden onChange={onPhoto} disabled={uploading} />
              </label>
              <span className="pwa-onb-hint">Фото обязательно</span>
            </div>
          </div>

          <form className="pwa-onb-form" onSubmit={submit} noValidate>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Фамилия *</span>
              <input className="pwa-input" value={form.last_name}
                     onChange={(e) => set("last_name", e.target.value)} required />
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Имя *</span>
              <input className="pwa-input" value={form.first_name}
                     onChange={(e) => set("first_name", e.target.value)} required />
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Название бизнеса / компании *</span>
              <input className="pwa-input" value={form.business_name}
                     onChange={(e) => set("business_name", e.target.value)} required />
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Сфера или специализация *</span>
              <input className="pwa-input" placeholder="например, Юридические услуги"
                     value={form.business_field}
                     onChange={(e) => set("business_field", e.target.value)} required />
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Дата рождения *</span>
              <input className="pwa-input" type="date" value={form.birth_date}
                     onChange={(e) => set("birth_date", e.target.value)} required />
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Время рождения</span>
              <input className="pwa-input" type="time" value={form.birth_time}
                     onChange={(e) => set("birth_time", e.target.value)} />
              <span className="pwa-onb-hint">Если известно</span>
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Город рождения</span>
              <input className="pwa-input" placeholder="например, Москва"
                     value={form.birth_city}
                     onChange={(e) => set("birth_city", e.target.value)} />
            </label>
            <label className="pwa-onb-field">
              <span className="pwa-onb-label">Телеграм</span>
              <input className="pwa-input" placeholder="@username" value={form.telegram}
                     onChange={(e) => set("telegram", e.target.value)} />
            </label>

            {error && <div className="pwa-login-err">{error}</div>}

            <button type="submit" className="pwa-btn-white pwa-onb-submit"
                    disabled={!filled || busy || uploading}>
              {busy ? "Сохраняем…" : "Продолжить"}
            </button>
          </form>
          <div className="pwa-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
