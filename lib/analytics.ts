import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, hasFirebaseAdminConfig } from "@/lib/firebase-admin";

export type AnalyticsEventName =
  | "page_view"
  | "free_report_created"
  | "paid_report_started"
  | "paid_report_completed";

export async function trackEvent(
  name: AnalyticsEventName,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!hasFirebaseAdminConfig()) return;

  try {
    await getAdminFirestore().collection("analytics_events").add({
      name,
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn("Analytics event tracking failed.", error instanceof Error ? error.name : "UnknownError");
  }
}

export async function getAdminStats() {
  if (!hasFirebaseAdminConfig()) {
    return {
      configured: false,
      visitors: 0,
      freeReports: 0,
      paidReports: 0,
      recentFreeReports: [],
      recentPaidReports: [],
    };
  }

  const db = getAdminFirestore();
  const [events, freeReportsCount, paidCompletedCount, freeReports, paidReports] = await Promise.all([
    db.collection("analytics_events").where("name", "==", "page_view").count().get(),
    db.collection("free_reports").count().get(),
    db.collection("analytics_events").where("name", "==", "paid_report_completed").count().get(),
    db.collection("free_reports").orderBy("createdAt", "desc").limit(10).get(),
    db.collection("paid_reports").orderBy("createdAt", "desc").limit(10).get(),
  ]);

  return {
    configured: true,
    visitors: events.data().count,
    freeReports: freeReportsCount.data().count,
    paidReports: paidCompletedCount.data().count || paidReports.size,
    recentFreeReports: freeReports.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    recentPaidReports: paidReports.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
}
