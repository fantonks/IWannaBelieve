import { NextResponse } from "next/server";
import { loadWorkbook } from "@/lib/lists";
import { parseWorkbook, normalizeSheet } from "@/lib/excel";
import { isMySQLAvailable } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST: загрузка Excel с листами ПМ_01.08, ИВТ_01.08 и т.д. */
export async function POST(req: Request) {
  if (!isMySQLAvailable()) {
    return NextResponse.json(
      { error: "Для загрузки конкурсных списков нужен MySQL." },
      { status: 503 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file?.size) {
      return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedSheets = parseWorkbook(buffer);
    if (parsedSheets.length === 0) {
      return NextResponse.json(
        { error: "В книге нет листов с именами ПМ_01.08, ИВТ_02.08 и т.д." },
        { status: 400 }
      );
    }
    const allErrors: string[] = [];
    const sheets: { programCode: string; listDate: string; entries: import("@/lib/excel").NormalizedEntry[] }[] = [];
    for (const sheet of parsedSheets) {
      const { entries, errors } = normalizeSheet(sheet);
      if (errors.length) allErrors.push(...errors);
      if (entries.length) sheets.push({ programCode: sheet.programCode, listDate: sheet.listDate, entries });
    }
    const { results, totalTimeMs } = await loadWorkbook(sheets);
    return NextResponse.json({
      message: "Загружено",
      results,
      totalTimeMs,
      errors: allErrors.length ? allErrors : undefined,
    });
  } catch (e) {
    console.error("POST /api/lists/upload:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки" },
      { status: 500 }
    );
  }
}
