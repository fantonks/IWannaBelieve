// node scripts/generate-sample-excel.mjs — создаёт public/samples/konkurs_sample_16.xlsx

import * as XLSX from "xlsx";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "samples");

const CODES = ["ПМ", "ИВТ", "ИТСС", "ИБ"];
const DATES = ["01.08", "02.08", "03.08", "04.08"];
const COUNT = {
  "01.08": { ПМ: 60, ИВТ: 100, ИТСС: 50, ИБ: 70 },
  "02.08": { ПМ: 380, ИВТ: 370, ИТСС: 350, ИБ: 260 },
  "03.08": { ПМ: 1000, ИВТ: 1150, ИТСС: 1050, ИБ: 800 },
  "04.08": { ПМ: 1240, ИВТ: 1390, ИТСС: 1240, ИБ: 1190 },
};

const headers = [
  "ID",
  "Согласие",
  "Приоритет",
  "Физика/ИКТ",
  "Русский язык",
  "Математика",
  "Индивидуальные достижения",
  "Сумма баллов",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSheet(code, date) {
  const n = COUNT[date][code];
  const rows = [];
  let idBase = code.charCodeAt(0) * 10000 + date.replace(".", "") * 100;
  for (let i = 0; i < n; i++) {
    const phys = randomInt(40, 100);
    const rus = randomInt(50, 100);
    const math = randomInt(40, 100);
    const ach = randomInt(0, 10);
    const sum = phys + rus + math + ach;
    const consent = date === "04.08" ? (i < COUNT[date][code] * 0.6) : i % 3 === 0;
    rows.push([
      idBase + i,
      consent ? "да" : "нет",
      (i % 4) + 1,
      phys,
      rus,
      math,
      ach,
      sum,
    ]);
  }
  return [headers, ...rows];
}

const wb = XLSX.utils.book_new();
for (const code of CODES) {
  for (const date of DATES) {
    const data = generateSheet(code, date);
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `${code}_${date}`);
  }
}

try {
  mkdirSync(outDir, { recursive: true });
} catch (_) {}
const path = join(outDir, "konkurs_sample_16.xlsx");
XLSX.writeFile(wb, path);
console.log("Written:", path);
