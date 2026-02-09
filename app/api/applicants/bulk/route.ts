import { NextResponse } from "next/server";
import { addApplicantsBulk } from "@/lib/applicants";
import type { ApplicantInput } from "@/lib/applicants";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      items: ApplicantInput[];
      autoPriority?: boolean;
      replace?: boolean;
    };
    const { items = [], autoPriority = false, replace = false } = body;
    const { added, errors } = await addApplicantsBulk(items, { autoPriority, replace });
    return NextResponse.json({ added, errors });
  } catch (e) {
    console.error("POST /api/applicants/bulk:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      { status: 500 }
    );
  }
}
