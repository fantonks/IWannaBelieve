import { NextResponse } from "next/server";
import { listApplicants } from "@/lib/applicants";
import type { ApplicantRow } from "@/lib/applicants";

export const dynamic = "force-dynamic";

const COLS = [
  "ФИО",
  "Математика",
  "Русский язык",
  "Информатика",
  "Сумма",
  "Приоритет",
  "Согласие",
  "Образовательная программа",
];

function toCSV(rows: { fio: string; matematika: number; russkiy: number; informatika: number; summa: number; prioritet: number; soglasie: boolean; program: string }[]): string {
  const header = COLS.join(";");
  const body = rows
    .map((r) =>
      [
        r.fio,
        r.matematika,
        r.russkiy,
        r.informatika,
        r.summa,
        r.prioritet,
        r.soglasie ? "да" : "нет",
        (r.program || "").replace(/;/g, ","),
      ].join(";")
    )
    .join("\n");
  return "\uFEFF" + header + "\n" + body;
}

/** Даты приёмной комиссии (01.08–04.08) */
const ADMISSION_DATES = ["01.08", "02.08", "03.08", "04.08"] as const;

/** Строит таблицу абитуриентов для одной даты приёмной комиссии */
function buildDateSheet(rows: ApplicantRow[]) {
  return [
    COLS,
    ...rows.map((r) => [
      r.fio,
      r.matematika,
      r.russkiy,
      r.informatika,
      r.summa,
      r.prioritet,
      r.soglasie ? "да" : "нет",
      r.program || "",
    ]),
  ];
}

export async function GET() {
  try {
    const rows = await listApplicants();
    let buf: Buffer;
    let contentType: string;
    let filename: string;

    try {
      const XLSX = require("xlsx");
      const wb = XLSX.utils.book_new();
      const sheetData = buildDateSheet(rows);

      // 4 таблицы по датам приёмной комиссии (01.08, 02.08, 03.08, 04.08)
      for (const date of ADMISSION_DATES) {
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, date);
      }

      buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = "applicants.xlsx";
    } catch {
      const csv = toCSV(rows);
      buf = Buffer.from(csv, "utf-8");
      contentType = "text/csv; charset=utf-8";
      filename = "applicants.csv";
    }

    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("GET /api/applicants/export:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
