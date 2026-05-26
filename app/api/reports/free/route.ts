import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createNamecheckReport } from "@/lib/namecheck/generate-report";
import { validateNamecheckQuery } from "@/lib/namecheck/validation";
import { trackEvent } from "@/lib/analytics";
import { sendReportEmail } from "@/lib/email";
import { getAdminFirestore, hasFirebaseAdminConfig } from "@/lib/firebase-admin";

function readStringField(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null || !(key in body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const email = readStringField(body, "email").toLowerCase();
  const validation = validateNamecheckQuery(readStringField(body, "query"));

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ange en giltig e-postadress." }, { status: 400 });
  }

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const report = await createNamecheckReport(validation.query);
  const emailResult = await sendReportEmail(email, `Din namnkoll: ${report.normalizedQuery}`, report);

  if (hasFirebaseAdminConfig()) {
    await getAdminFirestore().collection("free_reports").add({
      email,
      query: validation.query,
      normalizedQuery: report.normalizedQuery,
      emailSent: emailResult.sent,
      emailConfigured: emailResult.configured,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await trackEvent("free_report_created", { email, query: validation.query, emailSent: emailResult.sent });

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    emailConfigured: emailResult.configured,
    message: emailResult.sent
      ? "Rapporten har skickats till din e-post."
      : "Rapporten är registrerad, men e-postleverantören är inte konfigurerad.",
  });
}
