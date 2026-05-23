"use client";

import { FormEvent, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUFFIXES = [".se", ".com", ".nu", ".io", ".app", ".ai", ".co", ".org"] as const;
type Suffix = (typeof SUFFIXES)[number];

const PRICES: Record<Suffix, { price: number; original?: number }> = {
  ".se":  { price: 149, original: 199 },
  ".com": { price: 119 },
  ".nu":  { price: 159 },
  ".io":  { price: 399 },
  ".app": { price: 249 },
  ".ai":  { price: 699 },
  ".co":  { price: 189 },
  ".org": { price: 139 },
};

const TLD_CARDS: { tld: Suffix; desc: string }[] = [
  { tld: ".se",  desc: "Svenska företag" },
  { tld: ".com", desc: "Globalt standard" },
  { tld: ".nu",  desc: "Nordisk & modern" },
  { tld: ".io",  desc: "Tech & startups" },
  { tld: ".app", desc: "Appar & tjänster" },
  { tld: ".ai",  desc: "AI & tech" },
  { tld: ".co",  desc: "Kortare .com-alt" },
  { tld: ".org", desc: "Org. & ideella" },
];

const FEATURES = [
  { icon: "⚡", title: "Blixtsnabb sökning",   desc: "Realtidssök mot alla register direkt när du skriver" },
  { icon: "🏷",  title: "Transparenta priser",  desc: "Priset du ser är priset du betalar — inga dolda avgifter" },
  { icon: "🛡",  title: "Du äger domänen",      desc: "Full kontroll — flytta när du vill, inga bindningstider" },
  { icon: "🔄",  title: "Autoförnyelse",         desc: "Slipp tappa domänen — sätt autoförnyelse med ett klick" },
  { icon: "✉️",  title: "Mejlpåminnelse",       desc: "Vi påminner dig 60 och 30 dagar innan domänen löper ut" },
  { icon: "🏪",  title: "Koppla direkt",         desc: "DNS-guide för Vercel, Netlify, WordPress och fler" },
];

const TLD_PILLS = [".se", ".com", ".nu", ".io", ".app", ".ai", ".co", "+100 till"];

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailStatus = "checking" | "available" | "taken" | "unknown";

type DomainRow = {
  fullName: string;
  suffix: Suffix;
  status: AvailStatus;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDomainBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 63);
}

function readAvailability(item: unknown): boolean | null {
  if (typeof item !== "object" || item === null) return null;
  const r = item as Record<string, unknown>;
  for (const key of ["available", "isAvailable"]) {
    if (typeof r[key] === "boolean") return r[key] as boolean;
    if (typeof r[key] === "string") {
      const v = (r[key] as string).toLowerCase();
      if (["true", "yes", "1", "available"].includes(v)) return true;
      if (["false", "no", "0", "taken", "unavailable"].includes(v)) return false;
    }
  }
  return null;
}

function parseDomainResults(
  data: unknown[],
  domainNames: string[],
): Map<string, AvailStatus> {
  const out = new Map<string, AvailStatus>();
  data.forEach((item, i) => {
    const rawName =
      (item as Record<string, unknown>)?.name ??
      (item as Record<string, unknown>)?.domain ??
      (item as Record<string, unknown>)?.fqdn ??
      domainNames[i] ??
      "";
    const name = String(rawName).toLowerCase();
    const avail = readAvailability(item);
    out.set(name, avail === true ? "available" : avail === false ? "taken" : "unknown");
  });
  return out;
}

// ─── Shared styles (inline object helpers) ───────────────────────────────────

const s = {
  section: (maxW = 660): React.CSSProperties => ({
    maxWidth: maxW, margin: "0 auto", padding: "0 24px 40px",
  }),
  card: (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "var(--dm-bg-white)",
    border: "1px solid var(--dm-border)",
    borderRadius: 14, overflow: "hidden",
    ...extra,
  }),
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      background: "var(--dm-bg-white)",
      borderBottom: "1px solid var(--dm-border)",
      padding: "18px 40px",
      position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <a href="/" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "var(--dm-font-syne), Syne, sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
          <span style={{ color: "var(--dm-text)" }}>domain</span>
          <span style={{ color: "var(--dm-green)" }}>.onl</span>
        </span>
        <span style={{ fontSize: 11, color: "var(--dm-text-muted)", lineHeight: 1 }}>by mad.onl</span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <a href="#tld-grid" style={{ fontSize: 14, color: "var(--dm-text-secondary)" }}>Populära TLD:er</a>
        <a href="#tld-grid" style={{ fontSize: 14, color: "var(--dm-text-secondary)" }}>Priser</a>
        <a href="https://foretagsnamn.mad.onl" style={{ fontSize: 14, color: "var(--dm-text-secondary)" }}>Företagsnamn</a>
        <button style={{
          fontSize: 13, fontWeight: 500,
          color: "var(--dm-text)", background: "var(--dm-bg)",
          border: "1px solid var(--dm-border)", borderRadius: 8,
          padding: "7px 16px",
        }}>
          Mina domäner
        </button>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onSearch }: { onSearch: (q: string) => void }) {
  const [input, setInput] = useState("");

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const base = normalizeDomainBase(input);
    if (base) onSearch(base);
  }

  return (
    <section style={{
      background: "var(--dm-bg-white)",
      borderBottom: "1px solid var(--dm-border)",
      padding: "64px 40px 52px",
      textAlign: "center",
    }}>
      {/* Badge */}
      <div style={{ display: "inline-block", marginBottom: 22 }}>
        <span style={{
          background: "var(--dm-green-light)", color: "var(--dm-green-dark)",
          fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20,
        }}>
          Snabb, enkel, transparent prissättning
        </span>
      </div>

      {/* H1 */}
      <h1 style={{
        fontFamily: "var(--dm-font-syne), Syne, sans-serif",
        fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 700,
        color: "var(--dm-text)", maxWidth: 560, margin: "0 auto 18px",
        lineHeight: 1.1,
      }}>
        Din domän.<br />
        <span style={{ color: "var(--dm-green)" }}>Ditt pris.</span>
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: 16, color: "var(--dm-text-secondary)",
        maxWidth: 420, margin: "0 auto 32px", lineHeight: 1.6,
      }}>
        Sök och registrera domäner direkt — .se, .com, .nu och 100+ andra ändelser till konkurrenskraftiga priser.
      </p>

      {/* Search box */}
      <form onSubmit={submit} style={{ maxWidth: 580, margin: "0 auto 20px", position: "relative" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sök din domän, t.ex. mittforetag"
          style={{
            width: "100%",
            background: "#f4f8f6",
            border: "1.5px solid var(--dm-border-input)",
            borderRadius: 12,
            padding: "16px 150px 16px 20px",
            fontSize: 16,
            color: "var(--dm-text)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        />
        <button
          type="submit"
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "var(--dm-green)", color: "#fff",
            fontWeight: 600, fontSize: 14,
            padding: "10px 22px", borderRadius: 8,
            whiteSpace: "nowrap",
          }}
        >
          Sök →
        </button>
      </form>

      {/* TLD pills */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {TLD_PILLS.map((tld) => (
          <span key={tld} style={{
            background: "var(--dm-green-light)", color: "var(--dm-green-dark)",
            fontSize: 12, fontWeight: 500,
            padding: "4px 10px", borderRadius: 6,
          }}>
            {tld}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Search Results ───────────────────────────────────────────────────────────

function AvailDot({ status }: { status: AvailStatus }) {
  const color =
    status === "available" ? "#0ea05a" :
    status === "taken"     ? "#e84040" : "#c0ccc8";
  return (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
  );
}

function DomainResultRow({ row, base }: { row: DomainRow; base: string }) {
  const pricing = PRICES[row.suffix];
  const isSe = row.suffix === ".se";
  const available = row.status === "available";
  const checking  = row.status === "checking";
  const taken     = row.status === "taken";

  const statusLabel =
    checking ? "Kollar..." :
    available ? "Ledigt" :
    taken     ? "Taget"  : "Okänt";

  const statusColor =
    available ? "var(--dm-green)" :
    taken     ? "#e84040" : "var(--dm-text-muted)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 20px",
      borderBottom: "1px solid #f0f5f2",
      background: isSe ? "#f4fbf7" : "var(--dm-bg-white)",
    }}>
      {/* TLD badge */}
      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 52, color: "var(--dm-text)" }}>
        {row.suffix}
      </span>

      {/* Full domain */}
      <span style={{ fontSize: 14, color: "var(--dm-text-secondary)", flex: 1 }}>
        {base}{row.suffix}
      </span>

      {/* Availability */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
        <AvailDot status={row.status} />
        <span style={{ fontSize: 12, color: statusColor, minWidth: 52 }}>{statusLabel}</span>
      </div>

      {/* Price */}
      <div style={{ minWidth: 90, textAlign: "right" }}>
        {!taken && !checking && pricing ? (
          <>
            {pricing.original ? (
              <span style={{ fontSize: 11, color: "var(--dm-text-muted)", textDecoration: "line-through", display: "block" }}>
                {pricing.original} kr
              </span>
            ) : null}
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dm-text)" }}>
              {pricing.price} kr/år
            </span>
          </>
        ) : taken ? (
          <span style={{ fontSize: 14, color: "var(--dm-text-muted)" }}>—</span>
        ) : (
          <span style={{ fontSize: 13, color: "var(--dm-text-muted)" }}>…</span>
        )}
      </div>

      {/* Action */}
      {checking ? (
        <span style={{
          fontSize: 13, padding: "7px 18px", borderRadius: 7, minWidth: 100, textAlign: "center",
          background: "#f0f5f2", color: "var(--dm-text-muted)",
        }}>
          Kollar…
        </span>
      ) : available ? (
        <button style={{
          fontSize: 13, fontWeight: 500,
          padding: "7px 18px", borderRadius: 7, minWidth: 100,
          background: "var(--dm-green)", color: "#fff",
        }}>
          Lägg till 🛒
        </button>
      ) : (
        <span style={{
          fontSize: 13, padding: "7px 18px", borderRadius: 7, minWidth: 100, textAlign: "center",
          background: "#f0f5f2", color: "var(--dm-text-muted)", cursor: "default",
        }}>
          Taget
        </span>
      )}
    </div>
  );
}

function SearchResults({ rows, searchedBase, isLoading }: {
  rows: DomainRow[];
  searchedBase: string;
  isLoading: boolean;
}) {
  const availCount = rows.filter((r) => r.status === "available").length;

  return (
    <section style={{ maxWidth: 660, margin: "0 auto", padding: "32px 24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{
          fontFamily: "var(--dm-font-syne), Syne, sans-serif",
          fontSize: 18, fontWeight: 700, color: "var(--dm-text)",
        }}>
          Resultat för <span style={{ color: "var(--dm-green)" }}>{searchedBase}</span>
        </h2>
        {!isLoading && (
          <span style={{ fontSize: 13, color: "var(--dm-text-muted)" }}>
            {availCount} av {rows.length} lediga
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{
          background: "var(--dm-bg-white)",
          border: "1px solid var(--dm-border)",
          borderRadius: 14, padding: "20px 24px",
          display: "flex", alignItems: "center", gap: 12,
          color: "var(--dm-text-secondary)", fontSize: 14,
        }}>
          <span style={{
            width: 16, height: 16,
            border: "2px solid var(--dm-border-input)",
            borderTopColor: "var(--dm-green)",
            borderRadius: "50%",
            display: "inline-block",
            animation: "dm-spin 0.8s linear infinite",
            flexShrink: 0,
          }} />
          Kollar tillgänglighet för {SUFFIXES.length} domänändelser…
        </div>
      )}

      {/* Results list */}
      {!isLoading && rows.length > 0 && (
        <div style={s.card()}>
          {rows.map((row) => (
            <DomainResultRow key={row.suffix} row={row} base={searchedBase} />
          ))}
        </div>
      )}

      {/* Cross-sell bar */}
      {!isLoading && (
        <div style={{
          background: "#0d1f17", borderRadius: 14,
          padding: "22px 24px", marginTop: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
              Kolla också företagsnamnet
            </p>
            <p style={{ fontSize: 13, color: "#7aac90" }}>
              AI-analys av namn, varumärken och sociala handles — 49 kr engång
            </p>
          </div>
          <a
            href="https://foretagsnamn.mad.onl"
            style={{
              background: "var(--dm-green)", color: "#fff",
              fontSize: 13, fontWeight: 600,
              padding: "10px 20px", borderRadius: 8,
              whiteSpace: "nowrap",
            }}
          >
            Analysera namnet →
          </a>
        </div>
      )}

      <style>{`@keyframes dm-spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

// ─── Popular TLD Grid ─────────────────────────────────────────────────────────

function TldGrid() {
  return (
    <section id="tld-grid" style={s.section()}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{
          fontFamily: "var(--dm-font-syne), Syne, sans-serif",
          fontSize: 24, fontWeight: 700, color: "var(--dm-text)", marginBottom: 6,
        }}>
          Populära domänändelser
        </h2>
        <p style={{ fontSize: 14, color: "var(--dm-text-secondary)" }}>Välj rätt TLD för din verksamhet</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {TLD_CARDS.map(({ tld, desc }) => (
          <div
            key={tld}
            style={{
              background: "var(--dm-bg-white)",
              border: "1px solid var(--dm-border)",
              borderRadius: 10, padding: "14px 12px", textAlign: "center",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--dm-green)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--dm-border)")}
          >
            <p style={{
              fontFamily: "var(--dm-font-syne), Syne, sans-serif",
              fontSize: 20, fontWeight: 700, color: "var(--dm-green)", marginBottom: 4,
            }}>
              {tld}
            </p>
            <p style={{ fontSize: 11, color: "var(--dm-text-muted)", marginBottom: 8 }}>{desc}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dm-text)" }}>
              {PRICES[tld].price} kr/år
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section style={s.section()}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{
          fontFamily: "var(--dm-font-syne), Syne, sans-serif",
          fontSize: 24, fontWeight: 700, color: "var(--dm-text)", marginBottom: 6,
        }}>
          Därför domain.onl
        </h2>
        <p style={{ fontSize: 14, color: "var(--dm-text-secondary)" }}>Enkelt, snabbt och utan krångel</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{
            background: "var(--dm-bg-white)",
            border: "1px solid var(--dm-border)",
            borderRadius: 12, padding: "18px 16px",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--dm-green-light)", color: "var(--dm-green)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, marginBottom: 12,
            }}>
              {f.icon}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--dm-text)", marginBottom: 6 }}>{f.title}</p>
            <p style={{ fontSize: 12, color: "#6b8f7a", lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--dm-border)",
      padding: "24px 40px",
      background: "var(--dm-bg-white)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
    }}>
      <a href="/" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "var(--dm-font-syne), Syne, sans-serif", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
          <span style={{ color: "var(--dm-text)" }}>domain</span>
          <span style={{ color: "var(--dm-green)" }}>.onl</span>
        </span>
        <span style={{ fontSize: 11, color: "var(--dm-text-muted)" }}>by mad.onl</span>
      </a>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {["Integritetspolicy", "Villkor"].map((l) => (
          <a key={l} href="#" style={{ fontSize: 13, color: "var(--dm-text-muted)" }}>{l}</a>
        ))}
        <a href="https://foretagsnamn.mad.onl" style={{ fontSize: 13, color: "var(--dm-text-muted)" }}>Företagsnamn.app</a>
        <a href="#" style={{ fontSize: 13, color: "var(--dm-text-muted)" }}>Kontakt</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--dm-text-muted)" }}>© 2026 · mad.onl</p>
    </footer>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DomainShopPage() {
  const [rows, setRows]               = useState<DomainRow[]>([]);
  const [searchedBase, setSearchedBase] = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const resultsRef                    = useRef<HTMLDivElement>(null);

  async function handleSearch(base: string) {
    setSearchedBase(base);
    setIsLoading(true);
    setRows([]);

    // Scroll to results after a tick
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

    const domainNames = SUFFIXES.map((s) => `${base}${s}`);

    try {
      const res = await fetch("/api/hostup/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: domainNames }),
      });

      const payload = await res.json() as { success?: boolean; data?: unknown[]; error?: string };
      const statusMap = payload.success && Array.isArray(payload.data)
        ? parseDomainResults(payload.data, domainNames)
        : new Map<string, AvailStatus>();

      const newRows: DomainRow[] = SUFFIXES.map((suffix) => {
        const fullName = `${base}${suffix}`;
        const status = statusMap.get(fullName) ?? "unknown";
        return { fullName, suffix, status };
      });

      setRows(newRows);
    } catch {
      // Show all as unknown on network error
      setRows(SUFFIXES.map((suffix) => ({ fullName: `${base}${suffix}`, suffix, status: "unknown" })));
    } finally {
      setIsLoading(false);
    }
  }

  const showResults = isLoading || rows.length > 0;

  return (
    <>
      <Nav />
      <Hero onSearch={handleSearch} />

      <div ref={resultsRef}>
        {showResults && (
          <SearchResults rows={rows} searchedBase={searchedBase} isLoading={isLoading} />
        )}
      </div>

      <div style={{ paddingTop: showResults ? 40 : 0 }}>
        <TldGrid />
        <FeaturesSection />
      </div>

      <Footer />
    </>
  );
}
