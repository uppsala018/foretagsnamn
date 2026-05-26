import { NextResponse } from "next/server";
import { createAdminPassword } from "@/lib/admin-auth";

function readString(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null || !(key in body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createAdminPassword(readString(body, "password"), readString(body, "setupToken"));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
