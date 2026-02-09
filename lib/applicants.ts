import { isMySQLAvailable } from "@/lib/db";
import poolProxy from "@/lib/db";

export interface ApplicantRow {
  id: number;
  fio: string;
  matematika: number;
  russkiy: number;
  informatika: number;
  summa: number;
  prioritet: number;
  soglasie: boolean;
  program: string;
  created_at: string;
}

type DbRow = Omit<ApplicantRow, "soglasie" | "created_at"> & { soglasie: number; created_at: Date | string };

export interface ApplicantInput {
  fio: string;
  matematika: number;
  russkiy: number;
  informatika: number;
  prioritet?: number;
  soglasie?: boolean;
  program?: string;
}

const STORAGE_KEY = "applicants_db";

let serverStore: ApplicantRow[] = [];
let useStorageFallback = false;

const SERVER_STORE_PATH =
  typeof process !== "undefined" && process.cwd
    ? require("path").join(process.cwd(), "data", "applicants.json")
    : "";

function loadServerStore(): ApplicantRow[] {
  if (typeof window !== "undefined" || !SERVER_STORE_PATH) return serverStore;
  try {
    const fs = require("fs");
    if (fs.existsSync(SERVER_STORE_PATH)) {
      const raw = fs.readFileSync(SERVER_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      serverStore = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn("Не удалось загрузить data/applicants.json:", e);
  }
  return serverStore;
}

function persistServerStore(data: ApplicantRow[]): void {
  if (typeof window !== "undefined" || !SERVER_STORE_PATH) return;
  try {
    const fs = require("fs");
    const path = require("path");
    const dir = path.dirname(SERVER_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SERVER_STORE_PATH, JSON.stringify(data), "utf-8");
  } catch (e) {
    console.warn("Не удалось сохранить data/applicants.json:", e);
  }
}

function getFromStorage(): ApplicantRow[] {
  if (typeof window === "undefined") {
    if (serverStore.length === 0) loadServerStore();
    return serverStore;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToStorage(data: ApplicantRow[]): void {
  if (typeof window === "undefined") {
    serverStore = data;
    persistServerStore(data);
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function toRow(a: ApplicantInput): Omit<ApplicantRow, "id" | "created_at"> {
  const summa = a.matematika + a.russkiy + a.informatika;
  return {
    fio: String(a.fio).trim(),
    matematika: Math.max(0, Math.min(100, a.matematika | 0)),
    russkiy: Math.max(0, Math.min(100, a.russkiy | 0)),
    informatika: Math.max(0, Math.min(100, a.informatika | 0)),
    summa,
    prioritet: Math.max(1, Math.min(10, a.prioritet ?? 1)),
    soglasie: Boolean(a.soglasie),
    program: String(a.program ?? "").trim(),
  };
}

async function listFromMySQL(): Promise<ApplicantRow[]> {
  const [rows] = await poolProxy.query<DbRow[]>(
    "SELECT id, fio, matematika, russkiy, informatika, summa, prioritet, soglasie, program, created_at FROM applicants ORDER BY summa DESC, id ASC"
  );
  return (rows || []).map((r: DbRow) => ({
    ...r,
    soglasie: Boolean(r.soglasie),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString().slice(0, 10) : String(r.created_at),
  }));
}

async function listFromStorage(): Promise<ApplicantRow[]> {
  return getFromStorage();
}

export async function listApplicants(): Promise<ApplicantRow[]> {
  if (useStorageFallback) return listFromStorage();
  if (isMySQLAvailable()) {
    try {
      return await listFromMySQL();
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return listFromStorage();
    }
  }
  return listFromStorage();
}

function dupKey(r: { fio: string; summa: number; program: string }): string {
  return `${r.fio}|${r.summa}|${r.program}`;
}

async function addToMySQL(a: ApplicantInput): Promise<ApplicantRow> {
  const r = toRow(a);
  const [existing] = await poolProxy.query<DbRow[]>(
    "SELECT * FROM applicants WHERE fio = ? AND summa = ? AND program = ? LIMIT 1",
    [r.fio, r.summa, r.program]
  );
  if (existing?.[0]) {
    const row = existing[0];
    return {
      ...row,
      soglasie: Boolean(row.soglasie),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 10) : String(row.created_at),
    };
  }
  const [res] = await poolProxy.query<{ insertId: number }>(
    "INSERT INTO applicants (fio, matematika, russkiy, informatika, summa, prioritet, soglasie, program) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [r.fio, r.matematika, r.russkiy, r.informatika, r.summa, r.prioritet, r.soglasie ? 1 : 0, r.program]
  );
  const [rows] = await poolProxy.query<DbRow[]>("SELECT * FROM applicants WHERE id = ?", [res.insertId]);
  const row = rows?.[0];
  if (!row) throw new Error("Inserted row not found");
  return {
    ...row,
    soglasie: Boolean(row.soglasie),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 10) : String(row.created_at),
  };
}

async function addToStorage(a: ApplicantInput): Promise<ApplicantRow> {
  const data = getFromStorage();
  const r = toRow(a);
  const found = data.find((x) => x.fio === r.fio && x.summa === r.summa && x.program === r.program);
  if (found) return found;
  const newId = data.length > 0 ? Math.max(...data.map((x) => x.id)) + 1 : 1;
  const newRow: ApplicantRow = {
    id: newId,
    ...r,
    created_at: new Date().toISOString().slice(0, 10),
  };
  data.push(newRow);
  saveToStorage(data);
  return newRow;
}

export async function addApplicant(a: ApplicantInput): Promise<ApplicantRow> {
  if (useStorageFallback) return addToStorage(a);
  if (isMySQLAvailable()) {
    try {
      return await addToMySQL(a);
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return addToStorage(a);
    }
  }
  return addToStorage(a);
}

async function addBulkToMySQL(
  items: ApplicantInput[],
  opts: { autoPriority?: boolean; replace?: boolean } = {}
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  if (opts.replace) {
    await poolProxy.query("DELETE FROM applicants");
  }
  let rows = items.map((a) => toRow(a)).filter((r) => r.fio.length > 0);
  if (rows.length === 0) {
    return { added: 0, errors: items.length ? ["Нет валидных записей (ФИО обязательно)."] : errors };
  }
  const [existingRows] = await poolProxy.query<{ fio: string; summa: number; program: string }[]>(
    "SELECT fio, summa, program FROM applicants"
  );
  const existingKeys = new Set((existingRows || []).map((x) => dupKey(x)));
  rows = rows.filter((r) => {
    const key = dupKey(r);
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
  if (opts.autoPriority) {
    rows = [...rows].sort((a, b) => b.summa - a.summa);
    rows.forEach((r, i) => {
      r.prioritet = i + 1;
    });
  }
  let added = 0;
  for (const r of rows) {
    try {
      await poolProxy.query(
        "INSERT INTO applicants (fio, matematika, russkiy, informatika, summa, prioritet, soglasie, program) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [r.fio, r.matematika, r.russkiy, r.informatika, r.summa, r.prioritet, r.soglasie ? 1 : 0, r.program]
      );
      added++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ошибка";
      errors.push(`${r.fio}: ${msg}`);
    }
  }
  return { added, errors };
}

async function addBulkToStorage(
  items: ApplicantInput[],
  opts: { autoPriority?: boolean; replace?: boolean } = {}
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  let data = opts.replace ? [] : getFromStorage();
  let rows = items.map((a) => toRow(a)).filter((r) => r.fio.length > 0);
  if (rows.length === 0) {
    return { added: 0, errors: items.length ? ["Нет валидных записей (ФИО обязательно)."] : errors };
  }
  const existingKeys = new Set(data.map((x) => dupKey(x)));
  rows = rows.filter((r) => {
    const key = dupKey(r);
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
  if (opts.autoPriority) {
    rows = [...rows].sort((a, b) => b.summa - a.summa);
    rows.forEach((r, i) => {
      r.prioritet = i + 1;
    });
  }
  const maxId = data.length > 0 ? Math.max(...data.map((x) => x.id)) : 0;
  let nextId = maxId + 1;
  for (const r of rows) {
    try {
      data.push({
        id: nextId++,
        ...r,
        created_at: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      errors.push(`${r.fio}: ${e instanceof Error ? e.message : "ошибка"}`);
    }
  }
  saveToStorage(data);
  return { added: rows.length, errors };
}

export async function addApplicantsBulk(
  items: ApplicantInput[],
  opts: { autoPriority?: boolean; replace?: boolean } = {}
): Promise<{ added: number; errors: string[] }> {
  if (useStorageFallback) return addBulkToStorage(items, opts);
  if (isMySQLAvailable()) {
    try {
      return await addBulkToMySQL(items, opts);
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return addBulkToStorage(items, opts);
    }
  }
  return addBulkToStorage(items, opts);
}

async function updateInMySQL(id: number, upd: Partial<Pick<ApplicantInput, "soglasie" | "prioritet">>): Promise<void> {
  const sets: string[] = [];
  const vals: (number | boolean)[] = [];
  if (upd.soglasie !== undefined) {
    sets.push("soglasie = ?");
    vals.push(upd.soglasie ? 1 : 0);
  }
  if (upd.prioritet !== undefined) {
    sets.push("prioritet = ?");
    vals.push(upd.prioritet);
  }
  if (sets.length === 0) return;
  vals.push(id);
  await poolProxy.query(`UPDATE applicants SET ${sets.join(", ")} WHERE id = ?`, vals);
}

async function updateInStorage(id: number, upd: Partial<Pick<ApplicantInput, "soglasie" | "prioritet">>): Promise<void> {
  const data = getFromStorage();
  const idx = data.findIndex((x) => x.id === id);
  if (idx >= 0) {
    if (upd.soglasie !== undefined) data[idx].soglasie = upd.soglasie;
    if (upd.prioritet !== undefined) data[idx].prioritet = upd.prioritet;
    saveToStorage(data);
  }
}

export async function updateApplicant(
  id: number,
  upd: Partial<Pick<ApplicantInput, "soglasie" | "prioritet">>
): Promise<void> {
  if (useStorageFallback) return updateInStorage(id, upd);
  if (isMySQLAvailable()) {
    try {
      return await updateInMySQL(id, upd);
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return updateInStorage(id, upd);
    }
  }
  return updateInStorage(id, upd);
}

async function deleteFromMySQL(id: number): Promise<void> {
  await poolProxy.query("DELETE FROM applicants WHERE id = ?", [id]);
}

async function deleteFromStorage(id: number): Promise<void> {
  const data = getFromStorage();
  saveToStorage(data.filter((x) => x.id !== id));
}

export async function deleteApplicant(id: number): Promise<void> {
  if (useStorageFallback) return deleteFromStorage(id);
  if (isMySQLAvailable()) {
    try {
      return await deleteFromMySQL(id);
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return deleteFromStorage(id);
    }
  }
  return deleteFromStorage(id);
}

async function clearMySQL(): Promise<void> {
  await poolProxy.query("DELETE FROM applicants");
}

async function clearStorage(): Promise<void> {
  saveToStorage([]);
}

export async function clearApplicants(): Promise<void> {
  if (useStorageFallback) return clearStorage();
  if (isMySQLAvailable()) {
    try {
      return await clearMySQL();
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return clearStorage();
    }
  }
  return clearStorage();
}

async function getStatsFromMySQL(): Promise<{
  total: number;
  sSoglasiem: number;
  sredniyBall: number;
  maxBall: number;
  minBall: number;
  prioritet1: number;
  prioritet2: number;
  prioritet3: number;
}> {
  const [rows] = await poolProxy.query<
    { total: number; sSoglasiem: number; avgBall: number; maxBall: number; minBall: number }[]
  >(
    `SELECT
      COUNT(*) AS total,
      SUM(soglasie) AS sSoglasiem,
      COALESCE(ROUND(AVG(summa)), 0) AS avgBall,
      COALESCE(MAX(summa), 0) AS maxBall,
      COALESCE(MIN(summa), 999) AS minBall
     FROM applicants`
  );
  const r = rows[0] ?? { total: 0, sSoglasiem: 0, avgBall: 0, maxBall: 0, minBall: 0 };
  const [pRows] = await poolProxy.query<{ prioritet: number; cnt: number }[]>(
    "SELECT prioritet, COUNT(*) AS cnt FROM applicants GROUP BY prioritet"
  );
  const priorMap: Record<number, number> = {};
  (pRows || []).forEach((x: { prioritet: number; cnt: number }) => (priorMap[x.prioritet] = x.cnt));
  return {
    total: Number(r.total),
    sSoglasiem: Number(r.sSoglasiem),
    sredniyBall: Number(r.avgBall),
    maxBall: Number(r.maxBall),
    minBall: r.minBall === 999 ? 0 : Number(r.minBall),
    prioritet1: priorMap[1] ?? 0,
    prioritet2: priorMap[2] ?? 0,
    prioritet3: priorMap[3] ?? 0,
  };
}

function getStatsFromStorage(): {
  total: number;
  sSoglasiem: number;
  sredniyBall: number;
  maxBall: number;
  minBall: number;
  prioritet1: number;
  prioritet2: number;
  prioritet3: number;
} {
  const data = getFromStorage();
  if (data.length === 0) {
    return { total: 0, sSoglasiem: 0, sredniyBall: 0, maxBall: 0, minBall: 0, prioritet1: 0, prioritet2: 0, prioritet3: 0 };
  }
  const total = data.length;
  const sSoglasiem = data.filter((x) => x.soglasie).length;
  const sum = data.reduce((s, x) => s + x.summa, 0);
  const sredniyBall = Math.round(sum / total);
  const maxBall = Math.max(...data.map((x) => x.summa));
  const minBall = Math.min(...data.map((x) => x.summa));
  const priorMap: Record<number, number> = {};
  data.forEach((x) => {
    priorMap[x.prioritet] = (priorMap[x.prioritet] || 0) + 1;
  });
  return {
    total,
    sSoglasiem,
    sredniyBall,
    maxBall,
    minBall,
    prioritet1: priorMap[1] ?? 0,
    prioritet2: priorMap[2] ?? 0,
    prioritet3: priorMap[3] ?? 0,
  };
}

export async function getStats(): Promise<{
  total: number;
  sSoglasiem: number;
  sredniyBall: number;
  maxBall: number;
  minBall: number;
  prioritet1: number;
  prioritet2: number;
  prioritet3: number;
}> {
  if (useStorageFallback) return getStatsFromStorage();
  if (isMySQLAvailable()) {
    try {
      return await getStatsFromMySQL();
    } catch (e) {
      console.warn("MySQL ошибка, используем storage:", e);
      useStorageFallback = true;
      return getStatsFromStorage();
    }
  }
  return getStatsFromStorage();
}
