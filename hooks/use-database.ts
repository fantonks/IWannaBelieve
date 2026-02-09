"use client";

import { useState, useEffect, useCallback } from "react";

export interface Abiturient {
  id: number;
  fio: string;
  matematika: number;
  russkiy: number;
  informatika: number;
  summa: number;
  prioritet: number;
  soglasie: boolean;
  dataZayavki: string;
  obrazovatelnayaProgramma: string;
  dataPriemnoiKampanii: string;
}

export interface ObrazovatelnayaProgramma {
  kod: string;
  nazvanie: string;
  dataPriemnoiKampanii: string;
}

export const OBRAZOVATELNYE_PROGRAMMY: ObrazovatelnayaProgramma[] = [
  { kod: "09.03.01", nazvanie: "Информатика и вычислительная техника", dataPriemnoiKampanii: "2026-08-01" },
  { kod: "09.03.02", nazvanie: "Информационные системы и технологии", dataPriemnoiKampanii: "2026-08-02" },
  { kod: "09.03.03", nazvanie: "Прикладная информатика", dataPriemnoiKampanii: "2026-08-03" },
  { kod: "09.03.04", nazvanie: "Программная инженерия", dataPriemnoiKampanii: "2026-08-04" },
];

export function getDataByOP(obrazovatelnayaProgramma: string): string {
  const op = OBRAZOVATELNYE_PROGRAMMY.find(
    (p) => `${p.kod} ${p.nazvanie}` === obrazovatelnayaProgramma
  );
  return op ? op.dataPriemnoiKampanii : OBRAZOVATELNYE_PROGRAMMY[0].dataPriemnoiKampanii;
}

export function formatDateEuropean(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

export function getOPDisplayName(op: ObrazovatelnayaProgramma): string {
  return `${op.kod} ${op.nazvanie} (${formatDateEuropean(op.dataPriemnoiKampanii)})`;
}

const DB_KEY = "abiturients_db";
const DB_UPDATE_EVENT = "abiturients_updated";

function getDataFromStorage(): Abiturient[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(DB_KEY);
  if (!saved) return [];
  const data = JSON.parse(saved);
  return data.map((a: any) => {
    const op = a.obrazovatelnayaProgramma || `${OBRAZOVATELNYE_PROGRAMMY[0].kod} ${OBRAZOVATELNYE_PROGRAMMY[0].nazvanie}`;
    return {
      ...a,
      obrazovatelnayaProgramma: op,
      dataPriemnoiKampanii: a.dataPriemnoiKampanii || getDataByOP(op),
    };
  });
}

function saveAndNotify(data: Abiturient[]) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT));
}

/** Парсинг CSV: разделители , или ;, первая строка — заголовки */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const raw = text.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const sep = lines[0].includes(";") ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQ = !inQ;
        continue;
      }
      if (!inQ && c === sep) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = split(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((l) => split(l));
  return { headers, rows };
}

const CSV_HEADERS = [
  "ФИО",
  "Математика",
  "Русский язык",
  "Информатика",
  "Приоритет",
  "Согласие",
  "Образовательная программа",
] as const;

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

function parseBool(v: string): boolean {
  const n = norm(v);
  return n === "да" || n === "1" || n === "true" || n === "yes" || n === "+";
}

function findCol(headers: string[], names: string[]): number {
  const lower = headers.map((h) => norm(h));
  for (const n of names) {
    const i = lower.findIndex((h) => h.includes(norm(n)) || norm(n).includes(h));
    if (i >= 0) return i;
  }
  return -1;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/** Загрузка конкурсного списка из таблицы (CSV) в БД */
export function importFromCSV(
  csvText: string,
  opts: { replace?: boolean } = {}
): ImportResult {
  const { headers, rows } = parseCSV(csvText);
  const errors: string[] = [];
  let skipped = 0;

  const idxFio = findCol(headers, ["ФИО", "фио", "fio", "ФИО абитуриента"]);
  const idxMat = findCol(headers, ["Математика", "мат", "математика", "math"]);
  const idxRus = findCol(headers, ["Русский", "рус", "русский", "russian"]);
  const idxInf = findCol(headers, ["Информатика", "инф", "информатика", "info"]);
  const idxPrior = findCol(headers, ["Приоритет", "приор", "prioritet", "приоритет"]);
  const idxSogl = findCol(headers, ["Согласие", "согласие", "soglasie", "согл"]);
  const idxOP = findCol(headers, ["Образовательная программа", "ОП", "оп", "программа", "специальность"]);

  if (idxFio < 0) {
    return { imported: 0, skipped: 0, errors: ["Не найдена колонка ФИО."] };
  }
  if (idxMat < 0 || idxRus < 0 || idxInf < 0) {
    return {
      imported: 0,
      skipped: 0,
      errors: ["Не найдены колонки с баллами: Математика, Русский язык, Информатика."],
    };
  }

  const currentData = getDataFromStorage();
  const existingIds = new Set(currentData.map((a) => a.id));
  let nextId = existingIds.size > 0 ? Math.max(...existingIds) + 1 : 1;
  const toAdd: Abiturient[] = [];
  const baseOP = `${OBRAZOVATELNYE_PROGRAMMY[0].kod} ${OBRAZOVATELNYE_PROGRAMMY[0].nazvanie}`;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fio = (row[idxFio] || "").trim();
    if (!fio) {
      skipped++;
      continue;
    }

    const mat = Math.max(0, Math.min(100, parseInt(row[idxMat] || "0", 10) || 0));
    const rus = Math.max(0, Math.min(100, parseInt(row[idxRus] || "0", 10) || 0));
    const inf = Math.max(0, Math.min(100, parseInt(row[idxInf] || "0", 10) || 0));
    const summa = mat + rus + inf;
    const prioritet = Math.max(1, Math.min(3, parseInt(row[idxPrior] || "1", 10) || 1));
    const soglasie = idxSogl >= 0 ? parseBool(row[idxSogl] || "") : false;
    let op = baseOP;
    if (idxOP >= 0 && (row[idxOP] || "").trim()) {
      const raw = (row[idxOP] || "").trim();
      const found = OBRAZOVATELNYE_PROGRAMMY.find(
        (p) =>
          p.kod === raw ||
          p.nazvanie === raw ||
          `${p.kod} ${p.nazvanie}` === raw ||
          raw.includes(p.kod) ||
          raw.includes(p.nazvanie)
      );
      op = found ? `${found.kod} ${found.nazvanie}` : baseOP;
    }

    const dataPriemnoiKampanii = getDataByOP(op);
    const dataZayavki = new Date().toISOString().split("T")[0];

    toAdd.push({
      id: nextId++,
      fio,
      matematika: mat,
      russkiy: rus,
      informatika: inf,
      summa,
      prioritet,
      soglasie,
      dataZayavki,
      obrazovatelnayaProgramma: op,
      dataPriemnoiKampanii,
    });
  }

  const updated = opts.replace ? toAdd : [...currentData, ...toAdd];
  saveAndNotify(updated);
  return { imported: toAdd.length, skipped, errors };
}

/** Шаблон CSV для загрузки конкурсных списков */
export function getCSVTemplate(): string {
  const header = CSV_HEADERS.join(";");
  const example = [
    "Иванов Иван Иванович",
    "85",
    "78",
    "92",
    "1",
    "да",
    "09.03.01 Информатика и вычислительная техника",
  ].join(";");
  return [header, example].join("\n");
}

export function useDatabase() {
  const [abiturients, setAbiturients] = useState<Abiturient[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadData = useCallback(() => {
    const data = getDataFromStorage();
    setAbiturients(data);
  }, []);

  useEffect(() => {
    reloadData();
    setLoading(false);

    const handleUpdate = () => {
      reloadData();
    };

    window.addEventListener(DB_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [reloadData]);

  const addAbiturient = useCallback(
    (data: Omit<Abiturient, "id" | "summa" | "dataZayavki">) => {
      const currentData = getDataFromStorage();
      const newId = currentData.length > 0 ? Math.max(...currentData.map((a) => a.id)) + 1 : 1;
      const summa = data.matematika + data.russkiy + data.informatika;
      const today = new Date().toISOString().split("T")[0];

      const op = data.obrazovatelnayaProgramma || `${OBRAZOVATELNYE_PROGRAMMY[0].kod} ${OBRAZOVATELNYE_PROGRAMMY[0].nazvanie}`;
      const newAbiturient: Abiturient = {
        ...data,
        id: newId,
        summa,
        dataZayavki: today,
        obrazovatelnayaProgramma: op,
        dataPriemnoiKampanii: getDataByOP(op),
      };

      const updated = [...currentData, newAbiturient];
      saveAndNotify(updated);
      setAbiturients(updated);
      return newAbiturient;
    },
    []
  );

  const deleteAbiturient = useCallback((id: number) => {
    const currentData = getDataFromStorage();
    const updated = currentData.filter((a) => a.id !== id);
    saveAndNotify(updated);
    setAbiturients(updated);
  }, []);

  const updateSoglasie = useCallback((id: number, soglasie: boolean) => {
    const currentData = getDataFromStorage();
    const updated = currentData.map((a) => (a.id === id ? { ...a, soglasie } : a));
    saveAndNotify(updated);
    setAbiturients(updated);
  }, []);

  const loadFromCSV = useCallback(
    (csvText: string, replace: boolean): ImportResult => {
      const res = importFromCSV(csvText, { replace });
      reloadData();
      return res;
    },
    [reloadData]
  );

  const getStatistics = useCallback(() => {
    const data = abiturients.length > 0 ? abiturients : getDataFromStorage();
    if (data.length === 0) return null;

    const total = data.length;
    const sSoglasiem = data.filter((a) => a.soglasie).length;
    const sredniyBall = Math.round(data.reduce((s, a) => s + a.summa, 0) / total);
    const maxBall = Math.max(...data.map((a) => a.summa));
    const minBall = Math.min(...data.map((a) => a.summa));

    const prioritet1 = data.filter((a) => a.prioritet === 1).length;
    const prioritet2 = data.filter((a) => a.prioritet === 2).length;
    const prioritet3 = data.filter((a) => a.prioritet === 3).length;

    return {
      total,
      sSoglasiem,
      sredniyBall,
      maxBall,
      minBall,
      prioritet1,
      prioritet2,
      prioritet3,
    };
  }, [abiturients]);

  return {
    abiturients,
    loading,
    addAbiturient,
    deleteAbiturient,
    updateSoglasie,
    getStatistics,
    reloadData,
    loadFromCSV,
  };
}
