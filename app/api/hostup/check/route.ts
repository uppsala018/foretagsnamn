// HostUp integration – använder testnyckel via env. Byt till live senare.
import { NextRequest, NextResponse } from "next/server";

const HOSTUP_URL = "https://cloud.hostup.se/api/v2/domains/availability";
const MAX_POLL_ATTEMPTS = 18;
const POLL_DELAY_MS = 900;

export async function POST(request: NextRequest) {
  try {
    const { names } = await request.json();

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: "Inga domäner angivna" }, { status: 400 });
    }

    if (!process.env.HOSTUP_API_KEY) {
      return NextResponse.json({ error: "HOSTUP_API_KEY saknas" }, { status: 500 });
    }

    // Steg 1: Skicka check-förfrågan
    const startRes = await fetch(HOSTUP_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HOSTUP_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ names }),
    });

    const startData = await startRes.json();

    // Steg 2: Om det är inline-svar (200) → returnera direkt
    if (startRes.ok && startData.data) {
      return NextResponse.json({ success: true, data: startData.data });
    }

    // Steg 3: Om det är queued (202) → hämta pollUrl
    if (startData.operation?.pollUrl) {
      const pollUrl = `https://cloud.hostup.se${startData.operation.pollUrl}`;

      // Polla tills klart
      for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));

        const pollRes = await fetch(pollUrl, {
          headers: {
            "Authorization": `Bearer ${process.env.HOSTUP_API_KEY}`,
            "Accept": "application/json",
          },
        });

        const pollData = await pollRes.json();

        if (pollRes.ok && pollData.status === "completed" && pollData.data) {
          return NextResponse.json({ success: true, data: pollData.data });
        }

        if (pollData.status === "failed") {
          return NextResponse.json({ error: "HostUp check misslyckades", details: pollData }, { status: 500 });
        }
      }

      return NextResponse.json({ error: "HostUp timeout vid polling" }, { status: 504 });
    }

    // Fallback om pollUrl saknas (detta är det gamla felet)
    console.error("HostUp queued men ingen pollUrl:", startData);
    return NextResponse.json({
      error: "HostUp köade svaret men skickade ingen pollUrl",
      debug: startData
    }, { status: 502 });

  } catch (err: any) {
    console.error("HostUp API error:", err);
    return NextResponse.json({ error: "Internt fel i HostUp-integrationen", message: err.message }, { status: 500 });
  }
}
