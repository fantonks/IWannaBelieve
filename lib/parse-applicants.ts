import type { ApplicantInput } from "./applicants";

const SEP = /[;,]\s*/;

function norm(s: string): string {
  return (s || "").toString().trim().toLowerCase();
}

function findCol(headers: string[], names: string[]): number {
  const lower = headers.map((h) => norm(h));
  for (const n of names) {
    const nn = norm(n);
    const i = lower.findIndex((h) => h.includes(nn) || nn.includes(h));
    if (i >= 0) return i;
  }
  return -1;
}

function parseBool(v: string): boolean {
  const n = norm(v);
  return n === "да" || n === "1" || n === "true" || n === "yes" || n === "+";
}

/** Парсинг CSV. Первая строка — заголовки. */
export function parseApplicantsCSV(text: string): { rows: ApplicantInput[]; errors: string[] } {
  const errors: string[] = [];
  const raw = text.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["Нужна минимум строка заголовков и одна строка данных."] };

  const headers = lines[0].split(SEP).map((h) => h.replace(/^"|"$/g, "").trim());
  const idxFio = findCol(headers, ["ФИО", "фио", "fio"]);
  const idxMat = findCol(headers, ["Математика", "мат", "математика", "math"]);
  const idxRus = findCol(headers, ["Русский", "рус", "русский", "russian", "Русский язык"]);
  const idxInf = findCol(headers, ["Информатика", "инф", "информатика", "info"]);
  const idxPrior = findCol(headers, ["Приоритет", "приор", "prioritet"]);
  const idxSogl = findCol(headers, ["Согласие", "согласие", "soglasie", "Согл"]);
  const idxOP = findCol(headers, ["Образовательная программа", "ОП", "оп", "программа", "Программа"]);

  if (idxFio < 0) return { rows: [], errors: ["Не найдена колонка ФИО."] };
  if (idxMat < 0 || idxRus < 0 || idxInf < 0) {
    return { rows: [], errors: ["Не найдены колонки: Математика, Русский язык, Информатика."] };
  }

  const rows: ApplicantInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(SEP).map((p) => p.replace(/^"|"$/g, "").trim());
    const fio = (parts[idxFio] ?? "").trim();
    if (!fio) continue;

    const mat = Math.max(0, Math.min(100, parseInt(parts[idxMat] ?? "0", 10) || 0));
    const rus = Math.max(0, Math.min(100, parseInt(parts[idxRus] ?? "0", 10) || 0));
    const inf = Math.max(0, Math.min(100, parseInt(parts[idxInf] ?? "0", 10) || 0));
    const prioritet = idxPrior >= 0 ? Math.max(1, parseInt(parts[idxPrior] ?? "1", 10) || 1) : 1;
    const soglasie = idxSogl >= 0 ? parseBool(parts[idxSogl] ?? "") : false;
    const program = idxOP >= 0 ? (parts[idxOP] ?? "").trim() : "";

    rows.push({ fio, matematika: mat, russkiy: rus, informatika: inf, prioritet, soglasie, program });
  }
  return { rows, errors };
}

/** Парсинг Excel. Первый лист, первая строка — заголовки. Требует xlsx (npm install xlsx). */
export function parseApplicantsExcel(buffer: Buffer): { rows: ApplicantInput[]; errors: string[] } {
  const errors: string[] = [];
  let XLSX: any;
  try {
    XLSX = require("xlsx");
  } catch {
    return { rows: [], errors: ["Модуль xlsx не установлен. Используйте CSV или выполните: npm install xlsx"] };
  }
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], errors: ["Нет листов в файле."] };

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as (string | number)[][];
  if (data.length < 2) return { rows: [], errors: ["Нужна минимум строка заголовков и одна строка данных."] };

  const headers = (data[0] as (string | number)[]).map((h) => String(h).trim());
  const idxFio = findCol(headers, ["ФИО", "фио", "fio"]);
  const idxMat = findCol(headers, ["Математика", "мат", "математика", "math"]);
  const idxRus = findCol(headers, ["Русский", "рус", "русский", "russian", "Русский язык"]);
  const idxInf = findCol(headers, ["Информатика", "инф", "информатика", "info"]);
  const idxPrior = findCol(headers, ["Приоритет", "приор", "prioritet"]);
  const idxSogl = findCol(headers, ["Согласие", "согласие", "soglasie", "Согл"]);
  const idxOP = findCol(headers, ["Образовательная программа", "ОП", "оп", "программа", "Программа"]);

  if (idxFio < 0) return { rows: [], errors: ["Не найдена колонка ФИО."] };
  if (idxMat < 0 || idxRus < 0 || idxInf < 0) {
    return { rows: [], errors: ["Не найдены колонки: Математика, Русский язык, Информатика."] };
  }

  const rows: ApplicantInput[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number)[];
    const get = (j: number) => (row[j] != null ? String(row[j]).trim() : "");

    const fio = get(idxFio);
    if (!fio) continue;

    const mat = Math.max(0, Math.min(100, parseInt(get(idxMat), 10) || 0));
    const rus = Math.max(0, Math.min(100, parseInt(get(idxRus), 10) || 0));
    const inf = Math.max(0, Math.min(100, parseInt(get(idxInf), 10) || 0));
    const prioritet = idxPrior >= 0 ? Math.max(1, parseInt(get(idxPrior), 10) || 1) : 1;
    const soglasie = idxSogl >= 0 ? parseBool(get(idxSogl)) : false;
    const program = idxOP >= 0 ? get(idxOP) : "";

    rows.push({ fio, matematika: mat, russkiy: rus, informatika: inf, prioritet, soglasie, program });
  }
  return { rows, errors };
}
