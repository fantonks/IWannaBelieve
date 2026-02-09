import { NextResponse } from "next/server";
import { getLists } from "@/lib/admission";

export const dynamic = "force-dynamic";

/** Получить все списки или фильтровать по программе и дате */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programCode = searchParams.get("program") || undefined;
    const listDate = searchParams.get("date") || undefined;
    const data = await getLists(programCode, listDate);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/lists:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
