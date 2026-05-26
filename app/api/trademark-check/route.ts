import { NextResponse } from "next/server";
import { validateNamecheckQuery } from "@/lib/namecheck/validation";
import { checkTrademarks } from "@/lib/trademark";

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
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  return NextResponse.json(await checkTrademarks(validation.query));
}
