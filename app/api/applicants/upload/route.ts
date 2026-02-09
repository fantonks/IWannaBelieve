import { NextResponse } from "next/server";
import { addApplicantsBulk } from "@/lib/applicants";
import { parseApplicantsCSV, parseApplicantsExcel } from "@/lib/parse-applicants";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const list = (form.get("list") as string)?.trim() || "";
    const autoPriority = form.get("autoPriority") === "true" || form.get("autoPriority") === "1";
    const replace = form.get("replace") === "true" || form.get("replace") === "1";

    let rows: { rows: { fio: string; matematika: number; russkiy: number; informatika: number; prioritet?: number; soglasie?: boolean; program?: string }[]; errors: string[] };

    if (file && file.size > 0) {
      const name = (file.name || "").toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());
      if (name.endsWith(".csv") || name.endsWith(".txt")) {
        rows = parseApplicantsCSV(buf.toString("utf-8"));
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        rows = parseApplicantsExcel(buf);
      } else {
        return NextResponse.json(
          { error: "Поддерживаются только CSV и Excel (.xlsx, .xls)." },
          { status: 400 }
        );
      }
    } else if (list) {
      rows = parseApplicantsCSV(list);
    } else {
      return NextResponse.json({ error: "Укажите файл или вставьте список (CSV)." }, { status: 400 });
    }

    if (rows.errors.length && rows.rows.length === 0) {
      return NextResponse.json({ error: rows.errors[0], errors: rows.errors }, { status: 400 });
    }

    const { added, errors } = await addApplicantsBulk(rows.rows, { autoPriority, replace });
    return NextResponse.json({ added, errors, parseErrors: rows.errors });
  } catch (e) {
    console.error("POST /api/applicants/upload:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
