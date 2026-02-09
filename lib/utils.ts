import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PROGRAM_TO_CODE: Record<string, string> = {
  "09.03.01 Информатика и вычислительная техника": "ИВТ",
  "09.03.02 Информационные системы и технологии": "ИТСС",
  "09.03.03 Прикладная информатика": "ПМ",
  "09.03.04 Программная инженерия": "ИБ",
  ПМ: "ПМ",
  ИВТ: "ИВТ",
  ИТСС: "ИТСС",
  ИБ: "ИБ",
};

export function programToShortCode(program: string): string {
  return PROGRAM_TO_CODE[program] ?? program;
}

/** ФИО полностью → короткий формат "Фамилия И.О." */
export function formatFioShort(fio: string | null | undefined): string {
  if (!fio?.trim()) return "—";
  const parts = fio.trim().split(/\s+/);
  if (parts.length < 2) return fio;
  const fam = parts[0];
  const init1 = parts[1]?.[0] ?? "";
  const init2 = parts[2]?.[0] ?? "";
  if (!init1) return fam;
  return init2 ? `${fam} ${init1}.${init2}.` : `${fam} ${init1}.`;
}
