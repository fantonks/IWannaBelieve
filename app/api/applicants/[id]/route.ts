import { NextResponse } from "next/server";
import { updateApplicant, deleteApplicant } from "@/lib/applicants";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Неверный id." }, { status: 400 });
    }
    const body = (await _req.json()) as { soglasie?: boolean; prioritet?: number };
    await updateApplicant(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/applicants/[id]:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Неверный id." }, { status: 400 });
    }
    await deleteApplicant(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/applicants/[id]:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
