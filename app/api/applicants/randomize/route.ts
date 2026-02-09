import { NextResponse } from "next/server";
import { addApplicantsBulk } from "@/lib/applicants";
import type { ApplicantInput } from "@/lib/applicants";
import { PROGRAMS } from "@/lib/constants";

const SURNAMES_M = ["Иванов", "Петров", "Сидоров", "Козлов", "Новиков", "Морозов", "Волков", "Соколов", "Лебедев", "Кузнецов", "Попов", "Васильев", "Смирнов", "Михайлов", "Федоров", "Андреев"];
const SURNAMES_F = ["Иванова", "Петрова", "Сидорова", "Козлова", "Новикова", "Морозова", "Волкова", "Соколова", "Лебедева", "Кузнецова", "Попова", "Васильева", "Смирнова", "Михайлова", "Федорова", "Андреева"];
const FIRST_M = ["Александр", "Дмитрий", "Максим", "Иван", "Артём", "Никита", "Михаил", "Егор", "Андрей", "Кирилл", "Илья", "Роман", "Сергей", "Владимир"];
const FIRST_F = ["Анастасия", "Мария", "Дарья", "Анна", "Елизавета", "Полина", "Виктория", "Екатерина", "Александра", "София", "Валерия", "Ксения", "Вероника", "Алина"];
const PATRONYMICS_M = ["Александрович", "Дмитриевич", "Иванович", "Михайлович", "Сергеевич", "Андреевич", "Артёмович", "Никитич", "Егорович", "Кириллович", "Романович", "Владимирович"];
const PATRONYMICS_F = ["Александровна", "Дмитриевна", "Ивановна", "Михайловна", "Сергеевна", "Андреевна", "Артёмовна", "Никитична", "Егоровна", "Кирилловна", "Романовна", "Владимировна"];

const MIN = 400;
const MAX = 600;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFio(): string {
  const isMale = Math.random() < 0.5;
  const last = isMale ? pick(SURNAMES_M) : pick(SURNAMES_F);
  const first = isMale ? pick(FIRST_M) : pick(FIRST_F);
  const pat = isMale ? pick(PATRONYMICS_M) : pick(PATRONYMICS_F);
  return `${last} ${first} ${pat}`;
}

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const n = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
    const codes = PROGRAMS.map((p) => p.code);
    const items: ApplicantInput[] = [];
    const usedFio = new Set<string>();

    for (let i = 0; i < n; i++) {
      let fio = randomFio();
      while (usedFio.has(fio)) fio = randomFio();
      usedFio.add(fio);
      const mat = 88 + Math.floor(Math.random() * 13);
      const rus = 88 + Math.floor(Math.random() * 13);
      const inf = 88 + Math.floor(Math.random() * 13);
      items.push({
        fio,
        matematika: mat,
        russkiy: rus,
        informatika: inf,
        prioritet: 1 + Math.floor(Math.random() * 4),
        soglasie: Math.random() < 0.4,
        program: codes[Math.floor(Math.random() * codes.length)],
      });
    }

    const { added, errors } = await addApplicantsBulk(items, { autoPriority: true, replace: false });
    const firstError = errors[0] ?? undefined;
    return NextResponse.json({
      added,
      total: items.length,
      errors: errors.length ? errors : undefined,
      firstError: firstError ? String(firstError) : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    console.error("POST /api/applicants/randomize:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
