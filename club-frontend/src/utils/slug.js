// Транслитерация кириллицы и построение «человекочитаемого» слага для URL
// (например «Мария Волкова» → «mariya-volkova»). Используется для ссылок на
// профили резидентов, чтобы адрес был вида /residents/mariya-volkova, а не /residents/2.
const MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(str) {
  const s = (str || "").toLowerCase().trim();
  let out = "";
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(MAP, ch)) out += MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += "-";
  }
  out = out.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return out || "resident";
}
