import { NextResponse } from "next/server";
import { createNamecheckReport } from "@/lib/namecheck/generate-report";
import { validateNamecheckQuery } from "@/lib/namecheck/validation";
import { isReportStoreConfigured, getPaidReport, savePaidReport } from "@/lib/reports/report-store";
import { verifyDeepSearchCheckoutSession } from "@/lib/stripe";
import { sendReportEmail } from "@/lib/email";

function readSessionId(body: unknown): string {
  if (typeof body !== "object" || body === null || !("sessionId" in body)) {
    return "";
  }

  const sessionId = (body as { sessionId?: unknown }).sessionId;
  return typeof sessionId === "string" ? sessionId.trim().slice(0, 120) : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const sessionId = readSessionId(body);

  if (!sessionId) {
    return NextResponse.json(
      { error: "Ingen betalningssession hittades." },
      { status: 400 },
    );
  }

  if (!isReportStoreConfigured()) {
    return NextResponse.json(
      { error: "Rapportlagring är inte konfigurerad ännu." },
      { status: 503 },
    );
  }

  try {
    const verification = await verifyDeepSearchCheckoutSession(sessionId);

    if (!verification.paid || !verification.query || verification.product !== "deep_search") {
      return NextResponse.json(
        { error: "Betalningen kunde inte verifieras." },
        { status: 403 },
      );
    }

    const existingReport = await getPaidReport(verification.sessionId);

    if (existingReport) {
      return NextResponse.json({
        report: existingReport.report,
        sessionId: existingReport.sessionId,
        stored: true,
      });
    }

    const validation = validateNamecheckQuery(verification.query);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const report = await createNamecheckReport(validation.query);
    const emailResult = verification.email
      ? await sendReportEmail(verification.email, `Din djupsökningsrapport: ${validation.query}`, report)
      : { sent: false };

    const savedReport = await savePaidReport({
      sessionId: verification.sessionId,
      query: validation.query,
      report,
      stripePaymentStatus: verification.stripePaymentStatus ?? "unknown",
      product: verification.product ?? "deep_search",
      customerEmail: verification.email,
      emailSent: emailResult.sent,
    });

    return NextResponse.json({
      report: savedReport.report,
      sessionId: savedReport.sessionId,
      stored: true,
    });
  } catch (error) {
    console.warn(
      "Paid report creation failed.",
      error instanceof Error ? error.name : "UnknownError",
    );

    return NextResponse.json(
      { error: "Kunde inte skapa rapporten." },
      { status: 502 },
    );
  }
}
