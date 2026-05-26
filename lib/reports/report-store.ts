import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, hasFirebaseAdminConfig } from "@/lib/firebase-admin";
import type { NamecheckReport } from "@/lib/namecheck/types";

const PAID_REPORTS_COLLECTION = "paid_reports";

export type PaidReportRecord = {
  sessionId: string;
  query: string;
  report: NamecheckReport;
  stripePaymentStatus: string;
  product: string;
  customerEmail?: string | null;
  emailSent?: boolean;
};

export function isReportStoreConfigured(): boolean {
  return hasFirebaseAdminConfig();
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getPaidReport(sessionId: string): Promise<PaidReportRecord | null> {
  const snapshot = await getAdminFirestore()
    .collection(PAID_REPORTS_COLLECTION)
    .doc(sessionId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as PaidReportRecord | undefined;
  return data ?? null;
}

export async function savePaidReport(record: PaidReportRecord): Promise<PaidReportRecord> {
  const cleanRecord = stripUndefined(record);

  await getAdminFirestore()
    .collection(PAID_REPORTS_COLLECTION)
    .doc(record.sessionId)
    .set(
      {
        ...cleanRecord,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return cleanRecord;
}
