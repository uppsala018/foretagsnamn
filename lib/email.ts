import "server-only";

import type { NamecheckReport } from "@/lib/namecheck/types";

export type EmailSendResult = {
  configured: boolean;
  sent: boolean;
  message: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function reportText(report: NamecheckReport): string {
  const rows = report.results.map((result) => {
    const status = result.status === "available" ? "OK" : result.status === "taken" ? "Träff/risk" : result.status;
    return `${result.label}: ${status}. ${result.summary}`;
  });

  return [
    `Rapport för ${report.normalizedQuery}`,
    "",
    ...rows,
    "",
    report.disclaimer,
  ].join("\n");
}

export async function sendReportEmail(
  to: string,
  subject: string,
  report: NamecheckReport,
): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      sent: false,
      message: "E-postleverantör är inte konfigurerad.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: reportText(report),
    }),
  });

  if (!response.ok) {
    return {
      configured: true,
      sent: false,
      message: "E-post kunde inte skickas just nu.",
    };
  }

  return {
    configured: true,
    sent: true,
    message: "Rapporten har skickats.",
  };
}
