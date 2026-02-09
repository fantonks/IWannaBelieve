import { NextResponse } from "next/server";
import { getPassingScores } from "@/lib/admission";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listDate = searchParams.get("date") || undefined;
    const data = await getPassingScores(listDate);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/admission/passing-scores:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
