import pool, { PROGRAMS, LIST_DATES } from "./db";
import type { NormalizedEntry } from "./excel";

const codeToId = new Map<string, number>();
let codesLoaded = false;

async function ensureProgramIds(): Promise<void> {
  if (codesLoaded) return;
  const [rows] = await pool.query<{ id: number; code: string }[]>("SELECT id, code FROM programs");
  rows.forEach((r) => codeToId.set(r.code, r.id));
  codesLoaded = true;
}

async function getProgramId(code: string): Promise<number> {
  await ensureProgramIds();
  const id = codeToId.get(code);
  if (id != null) return id;
  const [rows] = await pool.query<{ id: number }[]>("SELECT id FROM programs WHERE code = ?", [code]);
  if (rows[0]) {
    codeToId.set(code, rows[0].id);
    return rows[0].id;
  }
  throw new Error(`Unknown program: ${code}`);
}

export interface LoadResult {
  programCode: string;
  listDate: string;
  deleted: number;
  added: number;
  updated: number;
  errors: string[];
}

/** Обновляет БД для одного листа: удаление, добавление, обновление записей. fioMap — applicant_id -> ФИО для list_applicants. */
export async function updateList(
  programCode: string,
  listDate: string,
  entries: NormalizedEntry[],
  fioMap?: Map<number, string> | Record<number, string>
): Promise<LoadResult> {
  const errors: string[] = [];
  const programId = await getProgramId(programCode);

  if (fioMap && typeof fioMap === "object" && !(fioMap instanceof Map)) {
    const m = new Map<number, string>();
    for (const [k, v] of Object.entries(fioMap)) if (v) m.set(Number(k), String(v));
    fioMap = m;
  }

  const [existingRows] = await pool.query<{ applicant_id: number }[]>(
    "SELECT applicant_id FROM competitive_list_entries WHERE program_id = ? AND list_date = ?",
    [programId, listDate]
  );
  const existingIds = new Set(existingRows.map((r) => r.applicant_id));
  const incomingIds = new Set(entries.map((e) => e.applicant_id));

  let deleted = 0;
  let added = 0;
  let updated = 0;

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length) {
    const placeholders = toDelete.map(() => "?").join(",");
    const [r] = await pool.query<{ affectedRows: number }>(
      `DELETE FROM competitive_list_entries WHERE program_id = ? AND list_date = ? AND applicant_id IN (${placeholders})`,
      [programId, listDate, ...toDelete]
    );
    deleted = r.affectedRows ?? toDelete.length;
  }

  const conn = await pool.getConnection();
  try {
    for (const e of entries) {
      const fio = fioMap?.get(e.applicant_id) ?? (e as NormalizedEntry & { fio?: string }).fio;
      if (fio) {
        await conn.query(
          "INSERT INTO list_applicants (applicant_id, fio) VALUES (?, ?) ON DUPLICATE KEY UPDATE fio = VALUES(fio)",
          [e.applicant_id, fio]
        );
      }
      const vals = [
        e.applicant_id,
        programId,
        listDate,
        e.consent ? 1 : 0,
        e.priority,
        e.ball_physics_ict,
        e.ball_russian,
        e.ball_math,
        e.ball_achievements,
        e.sum_balls,
      ];
      const upd = `
        INSERT INTO competitive_list_entries (
          applicant_id, program_id, list_date, consent, priority,
          ball_physics_ict, ball_russian, ball_math, ball_achievements, sum_balls
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          consent = VALUES(consent),
          priority = VALUES(priority),
          ball_physics_ict = VALUES(ball_physics_ict),
          ball_russian = VALUES(ball_russian),
          ball_math = VALUES(ball_math),
          ball_achievements = VALUES(ball_achievements),
          sum_balls = VALUES(sum_balls),
          updated_at = CURRENT_TIMESTAMP
      `;
      const [res] = await conn.query(upd, vals);
      const info = res as { affectedRows: number };
      if (info.affectedRows === 1) added++;
      else if (info.affectedRows === 2) updated++;
    }
  } finally {
    conn.release();
  }

  return { programCode, listDate, deleted, added, updated, errors };
}

/** Загрузка всех листов из книги */
export async function loadWorkbook(
  sheets: { programCode: string; listDate: string; entries: NormalizedEntry[] }[]
): Promise<{ results: LoadResult[]; totalTimeMs: number }> {
  const start = Date.now();
  const results: LoadResult[] = [];
  for (const s of sheets) {
    const fioMap = new Map<number, string>();
    for (const e of s.entries) if (e.fio) fioMap.set(e.applicant_id, e.fio);
    const res = await updateList(s.programCode, s.listDate, s.entries, fioMap);
    results.push(res);
  }
  const totalTimeMs = Date.now() - start;
  return { results, totalTimeMs };
}

/** Проходной балл по ОП на дату. Учитываются только абитуриенты с согласием. */
export async function getPassingScores(
  listDate: string
): Promise<{ programCode: string; passingScore: number | "НЕДОБОР"; enrolledCount: number }[]> {
  const [progs] = await pool.query<{ id: number; code: string; budget_places: number }[]>(
    "SELECT id, code, budget_places FROM programs"
  );
  const out: { programCode: string; passingScore: number | "НЕДОБОР"; enrolledCount: number }[] = [];

  for (const p of progs) {
    const [rows] = await pool.query<{ sum_balls: number }[]>(
      `SELECT sum_balls FROM competitive_list_entries
       WHERE program_id = ? AND list_date = ? AND consent = 1
       ORDER BY priority ASC, sum_balls DESC, applicant_id ASC`,
      [p.id, listDate]
    );
    const withConsent = rows;
    const places = p.budget_places;
    if (withConsent.length < places) {
      out.push({ programCode: p.code, passingScore: "НЕДОБОР", enrolledCount: withConsent.length });
      continue;
    }
    const lastEnrolled = withConsent[places - 1];
    out.push({
      programCode: p.code,
      passingScore: lastEnrolled.sum_balls,
      enrolledCount: places,
    });
  }
  return out;
}

export async function clearAllLists(): Promise<void> {
  await pool.query("DELETE FROM competitive_list_entries");
}
