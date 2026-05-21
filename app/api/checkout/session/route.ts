import { NextResponse } from "next/server";
import { verifyDeepSearchCheckoutSession } from "@/lib/stripe";

function safeSessionId(value: string | null): string {
  return value?.slice(0, 120) ?? "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = safeSessionId(searchParams.get("session_id"));

  if (!sessionId) {
    return NextResponse.json(
      { paid: false, query: null, sessionId },
      { status: 400 },
    );
  }

  try {
    const verification = await verifyDeepSearchCheckoutSession(sessionId);

    return NextResponse.json({
      paid: verification.paid,
      query: verification.query,
      sessionId: verification.sessionId,
    });
  } catch (error) {
    console.warn(
      "Stripe checkout session verification failed.",
      error instanceof Error ? error.name : "UnknownError",
    );

    return NextResponse.json({
      paid: false,
      query: null,
      sessionId,
    });
  }
}
