/** Парсинг Excel. Листы: ПМ_01.08, ИВТ_02.08 и т.д. */

import * as XLSX from "xlsx";

export type RawRow = Record<string, string | number | boolean>;

const CODES = ["ПМ", "ИВТ", "ИТСС", "ИБ"] as const;
const DATES = ["01.08", "02.08", "03.08", "04.08"] as const;

function norm(s: string): string {
  return (s || "").toString().trim().toLowerCase();
}

function findColKey(headers: string[], names: string[]): string | null {
  const lower = headers.map((h) => norm(h));
  for (const n of names) {
    const nn = norm(n);
    const i = lower.findIndex((h) => h.includes(nn) || nn.includes(h));
    if (i >= 0) return headers[i];
  }
  return null;
}

export interface ParsedListSheet {
  programCode: string;
  listDate: string; // YYYY-MM-DD
  headers: string[];
  rows: RawRow[];
}

/** Парсит лист Excel. Имя: ПМ_01.08, ИВТ_02.08 и т.д. */
export function parseSheet(sheet: XLSX.WorkSheet, sheetName: string): ParsedListSheet | null {
  const [code, datePart] = sheetName.split("_").map((s) => s.trim());
  if (!code || !datePart || !CODES.includes(code as (typeof CODES)[number])) return null;
  const dateMap: Record<string, string> = {
    "01.08": "2026-08-01",
    "02.08": "2026-08-02",
    "03.08": "2026-08-03",
    "04.08": "2026-08-04",
  };
  const listDate = dateMap[datePart] || null;
  if (!listDate) return null;

  const data = XLSX.utils.sheet_to_json<RawRow>(sheet, { header: 1, defval: "" }) as (string | number)[][];
  if (data.length < 2) return { programCode: code, listDate, headers: [], rows: [] };

  const headers = (data[0] as (string | number)[]).map((h) => String(h).trim());
  const rows: RawRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number)[];
    const obj: RawRow = {};
    headers.forEach((h, j) => {
      obj[h] = row[j] ?? "";
    });
    rows.push(obj);
  }

  return { programCode: code, listDate, headers, rows };
}

/** Преобразует строки листа в записи для БД */
export interface NormalizedEntry {
  applicant_id: number;
  fio?: string;
  consent: boolean;
  priority: number;
  ball_physics_ict: number;
  ball_russian: number;
  ball_math: number;
  ball_achievements: number;
  sum_balls: number;
}

export function normalizeSheet(
  parsed: ParsedListSheet
): { entries: NormalizedEntry[]; errors: string[] } {
  const { headers, rows } = parsed;
  const errors: string[] = [];
  const keyId = findColKey(headers, ["ID", "id", "Идентификатор", "идентификатор"]);
  const keyFio = findColKey(headers, ["ФИО", "fio", "Фамилия", "Имя", "ФИО абитуриента"]);
  const keyConsent = findColKey(headers, ["Согласие", "согласие", "consent", "Согл"]);
  const keyPrior = findColKey(headers, ["Приоритет", "приоритет", "priority", "Приор"]);
  const keyPhys = findColKey(headers, ["Физика/ИКТ", "Физика", "ИКТ", "physics"]);
  const keyRus = findColKey(headers, ["Русский язык", "Русский", "русский", "russian", "Рус"]);
  const keyMath = findColKey(headers, ["Математика", "математика", "math", "Мат"]);
  const keyAch = findColKey(headers, ["Индивидуальные достижения", "ИД достижения", "achievements", "Достиж"]);
  const keySum = findColKey(headers, ["Сумма баллов", "Сумма", "сумма", "sum"]);

  if (!keyId) {
    errors.push(`Колонка «ID» не найдена на листе ${parsed.programCode}_${parsed.listDate.slice(5).replace("-", ".")}`);
    return { entries: [], errors };
  }

  const entries: NormalizedEntry[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const idVal = r[keyId];
    const applicant_id = typeof idVal === "number" ? Math.floor(idVal) : parseInt(String(idVal || "0"), 10);
    if (!applicant_id) continue;

    const parseBool = (v: unknown): boolean => {
      const s = norm(String(v ?? ""));
      return ["да", "1", "true", "yes", "+"].includes(s);
    };
    const consent = keyConsent ? parseBool(r[keyConsent]) : false;
    const priority = Math.max(1, Math.min(4, parseInt(String(r[keyPrior] ?? "1"), 10) || 1));
    const ball_physics_ict = Math.max(0, Math.min(100, parseInt(String(r[keyPhys] ?? "0"), 10) || 0));
    const ball_russian = Math.max(0, Math.min(100, parseInt(String(r[keyRus] ?? "0"), 10) || 0));
    const ball_math = Math.max(0, Math.min(100, parseInt(String(r[keyMath] ?? "0"), 10) || 0));
    const ball_achievements = Math.max(0, Math.min(30, parseInt(String(r[keyAch] ?? "0"), 10) || 0));
    let sum_balls = parseInt(String(r[keySum] ?? "0"), 10) || 0;
    if (sum_balls <= 0) sum_balls = ball_physics_ict + ball_russian + ball_math + ball_achievements;
    const fio = keyFio ? String(r[keyFio] ?? "").trim() || undefined : undefined;

    entries.push({
      applicant_id,
      fio,
      consent,
      priority,
      ball_physics_ict,
      ball_russian,
      ball_math,
      ball_achievements,
      sum_balls,
    });
  }

  return { entries, errors };
}

/** Читает книгу Excel из буфера */
export function parseWorkbook(buffer: Buffer): ParsedListSheet[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const out: ParsedListSheet[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const parsed = parseSheet(sheet, name);
    if (parsed) out.push(parsed);
  }
  return out;
}
