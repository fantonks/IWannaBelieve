/** API для списков и проходных баллов. */
import pool, { PROGRAMS, LIST_DATES, isMySQLAvailable } from "./db";
import { listApplicants } from "./applicants";

export type ListEntry = {
  applicant_id: number;
  fio?: string | null;
  program_code: string;
  program_name: string;
  list_date: string;
  consent: boolean;
  priority: number;
  ball_physics_ict: number;
  ball_russian: number;
  ball_math: number;
  ball_achievements: number;
  sum_balls: number;
};

export type PassingScore = {
  program_code: string;
  program_name: string;
  passing_score: number | "НЕДОБОР";
  enrolled_count: number;
  budget_places: number;
};

// Коды ОП (короткие) и маппинг длинных названий в коды
const SHORT_CODES = ["ПМ", "ИВТ", "ИТСС", "ИБ"] as const;
const PROGRAM_MAP: Record<string, string> = {
  "09.03.01 Информатика и вычислительная техника": "ИВТ",
  "09.03.02 Информационные системы и технологии": "ИТСС",
  "09.03.03 Прикладная информатика": "ПМ",
  "09.03.04 Программная инженерия": "ИБ",
  ПМ: "ПМ",
  ИВТ: "ИВТ",
  ИТСС: "ИТСС",
  ИБ: "ИБ",
};

/** Конвертация applicants в ListEntry для даты */
function applicantsToEntries(
  applicants: { id: number; fio?: string; matematika: number; russkiy: number; informatika: number; summa: number; prioritet: number; soglasie: boolean; program: string }[],
  listDate: string
): ListEntry[] {
  return applicants.map((a) => {
    const code = SHORT_CODES.includes(a.program as any) ? a.program : (PROGRAM_MAP[a.program] || "ИВТ");
    const prog = PROGRAMS.find((p) => p.code === code);
    return {
      applicant_id: a.id,
      fio: a.fio ?? null,
      program_code: code,
      program_name: prog?.name ?? a.program,
      list_date: listDate,
      consent: a.soglasie,
      priority: Math.min(4, Math.max(1, a.prioritet)),
      ball_physics_ict: a.informatika,
      ball_russian: a.russkiy,
      ball_math: a.matematika,
      ball_achievements: 0,
      sum_balls: a.summa,
    };
  });
}

export type ProgramWithDate = {
  code: string;
  name: string;
  budget_places: number;
  commission_date: string | null;
};

/** Список ОП с датами комиссий (из MySQL при наличии). */
export async function getProgramsWithDates(): Promise<ProgramWithDate[]> {
  if (isMySQLAvailable()) {
    try {
      const [rows] = await pool.query<ProgramWithDate[]>(
        "SELECT code, name, budget_places, commission_date FROM programs ORDER BY code"
      );
      if (rows?.length) return rows;
    } catch {
      /* fallback */
    }
  }
  return PROGRAMS.map((p) => ({
    code: p.code,
    name: p.name,
    budget_places: p.budget_places,
    commission_date: p.commission_date ?? null,
  }));
}

/** Получить списки (MySQL или applicants fallback) */
export async function getLists(programCode?: string, listDate?: string): Promise<ListEntry[]> {
  if (isMySQLAvailable()) {
    try {
      let query = `
        SELECT e.applicant_id, a.fio, p.code AS program_code, p.name AS program_name, e.list_date,
          e.consent, e.priority, e.ball_physics_ict, e.ball_russian, e.ball_math, e.ball_achievements, e.sum_balls
        FROM competitive_list_entries e
        JOIN programs p ON e.program_id = p.id
        LEFT JOIN list_applicants a ON e.applicant_id = a.applicant_id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];
      if (programCode) {
        query += " AND p.code = ?";
        params.push(programCode);
      }
      if (listDate) {
        query += " AND e.list_date = ?";
        params.push(listDate);
      }
      query += " ORDER BY e.list_date ASC, p.code ASC, e.priority ASC, e.sum_balls DESC, e.applicant_id ASC";
      const [rows] = await pool.query<(Omit<ListEntry, "consent"> & { consent: number })[]>(query, params);
      return (rows || []).map((r) => ({ applicant_id: r.applicant_id, fio: r.fio ?? undefined, program_code: r.program_code, program_name: r.program_name, list_date: r.list_date, consent: Boolean(r.consent), priority: r.priority, ball_physics_ict: r.ball_physics_ict, ball_russian: r.ball_russian, ball_math: r.ball_math, ball_achievements: r.ball_achievements, sum_balls: r.sum_balls }));
    } catch {
      /* fallback to applicants */
    }
  }
  const applicants = await listApplicants();
  const date = listDate || LIST_DATES[0];
  let entries = applicantsToEntries(applicants, date);
  if (programCode) {
    entries = entries.filter((e) => e.program_code === programCode);
  }
  return entries;
}

/** Проходной балл: только с согласием, приоритет, бюджет мест */
function calcPassingScore(
  entries: ListEntry[],
  programCode: string,
  budgetPlaces: number
): PassingScore {
  const prog = PROGRAMS.find((p) => p.code === programCode);
  const withConsent = entries
    .filter((e) => e.program_code === programCode && e.consent)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (b.sum_balls !== a.sum_balls) return b.sum_balls - a.sum_balls;
      return a.applicant_id - b.applicant_id;
    });
  if (withConsent.length < budgetPlaces) {
    return {
      program_code: programCode,
      program_name: prog?.name ?? programCode,
      passing_score: "НЕДОБОР",
      enrolled_count: withConsent.length,
      budget_places: budgetPlaces,
    };
  }
  const last = withConsent[budgetPlaces - 1];
  return {
    program_code: programCode,
    program_name: prog?.name ?? programCode,
    passing_score: last.sum_balls,
    enrolled_count: budgetPlaces,
    budget_places: budgetPlaces,
  };
}

/** Проходные баллы по всем ОП на дату */
export async function getPassingScores(listDate?: string): Promise<PassingScore[]> {
  const date = listDate || LIST_DATES[0];
  const entries = await getLists(undefined, date);
  return PROGRAMS.map((p) => calcPassingScore(entries, p.code, p.budget_places));
}
