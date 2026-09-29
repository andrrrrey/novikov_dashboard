"""
Транслитерация кириллицы и «человекочитаемый» слаг для URL — точная копия
club-frontend/src/utils/slug.js («Мария Волкова» → «mariya-volkova»). Правила
должны совпадать с фронтом, иначе ссылки /residents/<slug> не найдут резидента.
"""

_MAP = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
    "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def _translit(s: str) -> str:
    """Кириллица → латиница, прочие символы (кроме a-z0-9) → «-», без схлопывания."""
    out = []
    for ch in (s or "").lower().strip():
        if ch in _MAP:
            out.append(_MAP[ch])
        elif ("a" <= ch <= "z") or ("0" <= ch <= "9"):
            out.append(ch)
        else:
            out.append("-")
    return "".join(out)


def slugify(s: str) -> str:
    parts = [p for p in _translit(s).split("-") if p]
    return "-".join(parts) or "resident"


def to_latin(s: str) -> str:
    """Имя латиницей для отображения: «Иван» → «Ivan», «Анна-Мария» → «Anna Mariya»."""
    return " ".join(p.capitalize() for p in _translit(s).split("-") if p)


def resident_slug(first_name: str, last_name: str) -> str:
    """Слаг профиля резидента — как на фронте: slugify(«Имя Фамилия»)."""
    return slugify(f"{first_name or ''} {last_name or ''}".strip())
