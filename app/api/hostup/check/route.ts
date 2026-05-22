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

    const apiKey = process.env.HOSTUP_API_KEY;
    if (!apiKey) {
      console.error("HOSTUP_API_KEY saknas i Vercel env");
      return NextResponse.json({
        error: "HOSTUP_API_KEY saknas i Vercel",
        fix: "Lägg till HOSTUP_API_KEY i Vercel Settings → Environment Variables"
      }, { status: 500 });
    }

    console.log("HostUp check startad för", names.length, "domäner");

    // Steg 1: Skicka check-förfrågan
    const startRes = await fetch(HOSTUP_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ names }),
    });

    if (!startRes.ok) {
      const errorText = await startRes.text();
      console.error("HostUp start-fel:", startRes.status, errorText);
      return NextResponse.json({ error: `HostUp startfel: ${startRes.status}` }, { status: startRes.status });
    }

    const startData = await startRes.json();

    // Steg 2: Inline-svar (200)
    if (startData.data) {
      console.log("HostUp gav inline-svar");
      return NextResponse.json({ success: true, data: startData.data });
    }

    // Steg 3: Queued-svar
    if (startData.operation?.pollUrl) {
      const pollUrl = `https://cloud.hostup.se${startData.operation.pollUrl}`;
      console.log("HostUp köade – pollUrl:", pollUrl);

      for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        await new Promise(resolve => setTimeout(resolve, POLL_DELAY_MS));

        const pollRes = await fetch(pollUrl, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json",
          },
        });

        const pollData = await pollRes.json();

        if (pollRes.ok && pollData.status === "completed" && pollData.data) {
          console.log("HostUp polling klar –", pollData.data.length, "resultat");
          return NextResponse.json({ success: true, data: pollData.data });
        }

        if (pollData.status === "failed") {
          return NextResponse.json({ error: "HostUp check misslyckades", details: pollData }, { status: 500 });
        }
      }
      return NextResponse.json({ error: "HostUp timeout vid polling" }, { status: 504 });
    }

    // Fallback
    console.error("Okänt HostUp-svar:", startData);
    return NextResponse.json({
      error: "HostUp gav okänt svar",
      debug: startData
    }, { status: 502 });

  } catch (err: any) {
    console.error("HostUp API catch error:", err.message, err.stack);
    return NextResponse.json({
      error: "Kunde inte kontrollera domäner just nu",
      debug: err.message
    }, { status: 500 });
  }
}
