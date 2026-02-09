import { NextResponse } from "next/server";
import { clearApplicants } from "@/lib/applicants";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    await clearApplicants();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/applicants/clear:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
