import { AdminAuthPanel, AdminLogoutButton } from "./admin-client";
import { getAdminEmail, getAdminSession, hasAdminPassword } from "@/lib/admin-auth";
import { getAdminStats } from "@/lib/analytics";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("sv-SE");
  }
  return "-";
}

function readString(value: unknown): string {
  return typeof value === "string" && value ? value : "-";
}

export default async function AdminPage() {
  const [session, passwordExists] = await Promise.all([
    getAdminSession(),
    hasAdminPassword(),
  ]);

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-5 py-12 text-[#15201b]">
        <AdminAuthPanel needsSetup={!passwordExists} adminEmail={getAdminEmail()} />
      </main>
    );
  }

  const stats = await getAdminStats();

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-[#15201b]">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#54665c]">Dold adminpanel</p>
            <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
          </div>
          <AdminLogoutButton />
        </header>

        {!stats.configured ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Firebase Admin är inte konfigurerat, så statistik kan inte läsas.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Besök" value={stats.visitors} />
          <StatCard label="Gratis rapporter" value={stats.freeReports} />
          <StatCard label="Betalda rapporter" value={stats.paidReports} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentTable
            title="Senaste gratis rapporter"
            rows={stats.recentFreeReports}
            columns={["createdAt", "email", "normalizedQuery"]}
          />
          <RecentTable
            title="Senaste betalda rapporter"
            rows={stats.recentPaidReports}
            columns={["createdAt", "customerEmail", "query"]}
          />
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#54665c]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function RecentTable({ title, rows, columns }: { title: string; rows: Array<Record<string, unknown>>; columns: string[] }) {
  return (
    <section className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={readString(row.id)} className="border-t border-[#ece9dd]">
                <td className="py-3 pr-3 text-[#54665c]">{formatDate(row[columns[0]])}</td>
                <td className="py-3 pr-3">{readString(row[columns[1]])}</td>
                <td className="py-3">{readString(row[columns[2]])}</td>
              </tr>
            )) : (
              <tr>
                <td className="py-4 text-[#54665c]">Inga poster ännu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
