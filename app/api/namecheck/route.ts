import { NextResponse } from "next/server";
import { createNamecheckReport } from "@/lib/namecheck/generate-report";
import { validateNamecheckQuery } from "@/lib/namecheck/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const query = typeof body === "object" && body !== null && "query" in body
    ? (body as { query?: unknown }).query
    : undefined;
  const validation = validateNamecheckQuery(query);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const report = await createNamecheckReport(validation.query);

  return NextResponse.json(report);
}
