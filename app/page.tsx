import { HomeClient } from "./page-client";

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

const FAQ_ITEMS = [
  {
    q: "Är detta en officiell Bolagsverket-kontroll?",
    a: "Nej. Det här är en preliminär förhandskontroll baserad på namnregler och tillgänglig data. För en officiell bedömning måste namnet prövas av Bolagsverket vid registrering via Verksamt.se.",
  },
  {
    q: "Kan ni garantera att namnet är ledigt?",
    a: "Nej. Resultatet är en teknisk förhandskoll. Domäner kontrolleras i realtid men kan ändras. Sociala handles är indikativa och bör alltid verifieras manuellt.",
  },
  {
    q: "Vad händer med mina 49 kr om namnet är taget?",
    a: "Du får full rapport oavsett. Om huvudnamnet är taget ingår 10 AI-genererade alternativ som är lediga — du hittar rätt namn i samma köp.",
  },
  {
    q: "Var registreras domänerna?",
    a: "Via vår domänplattform Domain by mad.onl — du hanterar och äger domänen direkt hos oss, utan mellanhänder.",
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      {/* NAV */}
      <nav style={{
        background: "rgba(10,14,26,0.95)",
        borderBottom: "1px solid var(--border)",
        padding: "20px 40px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(8px)",
      }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif",
            fontSize: "20px",
            color: "var(--text-primary)",
          }}>
            Företagsnamn
          </span>
          <span style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
          }}>
            {" by "}
          </span>
          <span style={{
            fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif",
            fontSize: "20px",
            color: "var(--se-yellow)",
          }}>
            mad.onl
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <a href="#how-it-works" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "14px" }}>
            Hur det fungerar
          </a>
          <a href="#domains" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "14px" }}>
            Domäner
          </a>
          <a href="#deep-search" style={{
            background: "var(--se-blue)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "8px",
            padding: "8px 18px",
            fontSize: "14px",
            fontWeight: 500,
          }}>
            Djupsökning 49 kr
          </a>
        </div>
      </nav>

      <main>
        <HomeClient />

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--se-yellow-muted)", marginBottom: 10 }}>
            Så fungerar det
          </p>
          <h2 style={{ fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "var(--text-primary)", marginBottom: 24 }}>
            Från namnidé till trygg registrering
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { n: 1, title: "Skriv namnet", desc: "Ange ditt tilltänkta företagsnamn" },
              { n: 2, title: "Gratis förhandskoll", desc: "Domäner, sociala, AI-analys direkt" },
              { n: 3, title: "Djupsökning 49 kr", desc: "Varumärken, PDF och bevakning" },
              { n: 4, title: "Registrera tryggt", desc: "Ta med rapporten till Verksamt" },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 14px",
                textAlign: "center",
              }}>
                <div style={{
                  width: 32, height: 32,
                  borderRadius: "50%",
                  background: "rgba(45,125,210,0.15)",
                  border: "1px solid rgba(45,125,210,0.25)",
                  color: "#7ab3e8",
                  fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                }}>
                  {n}
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section id="deep-search" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--se-yellow-muted)", marginBottom: 10 }}>
            Djupsökning
          </p>
          <h2 style={{ fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "var(--text-primary)", marginBottom: 24 }}>
            Vad ingår för 49 kr?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "14px 16px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}>
                <div style={{
                  width: 28, height: 28, flexShrink: 0,
                  background: "rgba(245,200,66,0.1)",
                  borderRadius: 7,
                  color: "var(--se-yellow)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15,
                }}>
                  {f.icon}
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--text-primary)", fontSize: 13, marginBottom: 3 }}>{f.title}</strong>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <DeepSearchCta />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
              Betalning via Stripe · Ingen prenumeration · Engångsbelopp
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--se-yellow-muted)", marginBottom: 10 }}>
            Vanliga frågor
          </p>
          <h2 style={{ fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "var(--text-primary)", marginBottom: 4 }}>
            FAQ
          </h2>
          <div>
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} style={{
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                padding: "18px 0",
              }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>{item.q}</p>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{
          borderTop: "1px solid var(--border)",
          padding: "28px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif", fontSize: 18, color: "var(--text-primary)" }}>Företagsnamn</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{" by "}</span>
            <span style={{ fontFamily: "var(--font-dm-serif-display), 'DM Serif Display', serif", fontSize: 18, color: "var(--se-yellow)" }}>mad.onl</span>
          </a>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Integritetspolicy", href: "#" },
              { label: "Villkor", href: "#" },
              { label: "Domain by mad.onl", href: "https://domain.mad.onl" },
              { label: "Kontakt", href: "#" },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>{label}</a>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>© 2026 · Ej juridisk rådgivning</p>
        </footer>
      </main>
    </>
  );
}

const FEATURES = [
  { icon: "🛡", title: "Varumärkeskoll", desc: "Svenska PRV + EU-register via TMview" },
  { icon: "🌐", title: "Fullständig domänkoll", desc: "10+ ändelser med priser och köplänkar" },
  { icon: "🧠", title: "10 namnalternativ", desc: "AI föreslår varianter som är lediga" },
  { icon: "📄", title: "PDF-rapport", desc: "Redo att skriva ut och spara" },
  { icon: "🔔", title: "30 dagars bevakning", desc: "Notis om liknande namn dyker upp" },
  { icon: "⚠️", title: "Fonetisk riskanalys", desc: "Känner av 'låter som'-konflikter" },
];

function DeepSearchCta() {
  return (
    <a
      href="/api/checkout/deep-search"
      style={{
        display: "inline-block",
        background: "var(--se-yellow)",
        color: "#0a0e1a",
        fontWeight: 700,
        fontSize: 16,
        padding: "14px 40px",
        borderRadius: 9,
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      Starta djupsökning — 49 kr
    </a>
  );
}
