import { NextResponse } from "next/server";
import { listApplicants, addApplicant } from "@/lib/applicants";
import type { ApplicantInput } from "@/lib/applicants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await listApplicants();
    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error("GET /api/applicants:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    let body: ApplicantInput;
    try {
      body = (await req.json()) as ApplicantInput;
    } catch {
      return NextResponse.json({ error: "Неверный JSON в теле запроса." }, { status: 400 });
    }
    if (!body || typeof body.fio !== "string" || !String(body.fio).trim()) {
      return NextResponse.json({ error: "Укажите ФИО." }, { status: 400 });
    }
    const row = await addApplicant(body);
    return NextResponse.json({ data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка добавления";
    console.error("POST /api/applicants:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
