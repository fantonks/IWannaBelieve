import { NextResponse } from "next/server";
import { PROGRAMS, LIST_DATES } from "@/lib/constants";
import { getLists } from "@/lib/admission";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const HEADERS = [
  "ID",
  "ФИО",
  "Дата списка",
  "Согласие",
  "Приоритет",
  "Физика/ИКТ",
  "Русский язык",
  "Математика",
  "Индивидуальные достижения",
  "Сумма баллов",
];

function rowToExcel(r: { applicant_id: number; fio?: string | null; list_date: string; consent: boolean; priority: number; ball_physics_ict: number; ball_russian: number; ball_math: number; ball_achievements: number; sum_balls: number }) {
  return [
    r.applicant_id,
    r.fio ?? "",
    r.list_date,
    r.consent ? "да" : "нет",
    r.priority,
    r.ball_physics_ict,
    r.ball_russian,
    r.ball_math,
    r.ball_achievements,
    r.sum_balls,
  ];
}

/** Экспорт списков в Excel. ?date=2026-08-01 — только эта дата; без параметра — все даты (листы по датам). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") ?? undefined;
    const datesToExport = dateParam && LIST_DATES.includes(dateParam as typeof LIST_DATES[number])
      ? [dateParam]
      : [...LIST_DATES];

    const wb = XLSX.utils.book_new();

    for (const listDate of datesToExport) {
      const [, m, d] = listDate.split("-");
      const dateLabel = `${d}.${m}`;
      for (const program of PROGRAMS) {
        const entries = await getLists(program.code, listDate);
        const rows = entries.filter((e) => e.program_code === program.code && e.list_date === listDate);
        const data = [HEADERS, ...rows.map(rowToExcel)];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const sheetName = `${program.code}_${dateLabel}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    }

    const filename = dateParam
      ? `competitive_lists_${dateParam}.xlsx`
      : `competitive_lists_${new Date().toISOString().split("T")[0]}.xlsx`;
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("GET /api/lists/export:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
