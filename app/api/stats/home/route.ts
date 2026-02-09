import { NextResponse } from "next/server";
import { getStats } from "@/lib/applicants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ data: stats });
  } catch (e) {
    console.error("GET /api/stats/home:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
