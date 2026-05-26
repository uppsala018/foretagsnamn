import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body === "object" && body !== null && "name" in body
    ? (body as { name?: unknown }).name
    : undefined;

  if (name === "page_view") {
    await trackEvent("page_view", { path: (body as { path?: unknown }).path });
  }

  return NextResponse.json({ ok: true });
}
