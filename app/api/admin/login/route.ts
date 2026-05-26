import { NextResponse } from "next/server";
import { loginAdmin, setAdminCookie } from "@/lib/admin-auth";

function readString(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null || !(key in body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await loginAdmin(readString(body, "email"), readString(body, "password"));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response, readString(body, "email").toLowerCase());
  return response;
}
