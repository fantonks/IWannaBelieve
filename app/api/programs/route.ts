import { NextResponse } from "next/server";
import { getProgramsWithDates } from "@/lib/admission";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getProgramsWithDates();
    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/programs:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
