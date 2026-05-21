import { HomeClient } from "./page-client";

const FAQ_ITEMS = [
  {
    question: "Är detta en officiell Bolagsverket-kontroll?",
    answer:
      "Nej. Företagsnamn.app gör en preliminär förhandskontroll av namnformat, särskiljning och riskpunkter. Officiell kontroll behöver göras hos Bolagsverket.",
  },
  {
    question: "Kan ni garantera att namnet är ledigt?",
    answer:
      "Nej. Resultatet är en teknisk förhandskontroll. Domäner kan verifieras via Namecheap när API är konfigurerat, men företagsnamn, sociala medier och AI-risk är indikativa.",
  },
  {
    question: "Vad ingår i djupsökningen?",
    answer:
      "Djupsökningen skapar en sparad rapport med namnförhandskontroll, domänresultat, indikativa sociala profilkontroller och AI-baserad riskbedömning.",
  },
  {
    question: "Hur sparar jag rapporten som PDF?",
    answer:
      "Efter betalning visas rapporten på en utskriftsvänlig sida. Klicka på Skriv ut / spara som PDF och välj PDF i webbläsarens utskriftsdialog.",
  },
  {
    question: "Varför står vissa sociala medier som osäkra?",
    answer:
      "Instagram och TikTok kan blockera automatiska kontroller eller returnera otydliga svar. Därför visas sociala resultat som indikativa och bör alltid kontrolleras manuellt.",
  },
];

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#15201b]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <nav className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-normal">Företagsnamn.app</div>
          <div className="rounded-full border border-[#d8d6c8] bg-white px-4 py-2 text-sm font-medium text-[#475149]">
            Djupsökning 49 kr
          </div>
        </nav>

        <HomeClient />

        <TrustSection />
        <HowItWorksSection />
        <FaqSection />
      </section>
    </main>
  );
}

function TrustSection() {
  const items = [
    {
      title: "Domäner",
      text: "Domäner kontrolleras via Namecheap när API är konfigurerat. Annars visas tydligt att resultatet är indikativt.",
    },
    {
      title: "Sociala medier",
      text: "Instagram och TikTok kontrolleras indikativt via offentliga profil-URL:er utan inloggning, cookies eller skrapning.",
    },
    {
      title: "Företagsnamn",
      text: "Företagsnamn är en preliminär förhandskontroll baserad på regler och namnlogik, inte en Bolagsverket-kontroll.",
    },
    {
      title: "AI-bedömning",
      text: "AI-bedömningen summerar risker och alternativ, men är inte juridisk rådgivning.",
    },
  ];

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">Vad betyder resultatet?</p>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Verifierat, indikativt och inofficiellt markerat var för sig.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.title} className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#58655e]">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    ["Steg 1", "Skriv ett namn"],
    ["Steg 2", "Få gratis förhandskoll"],
    ["Steg 3", "Köp djupsökning för 49 kr"],
    ["Steg 4", "Spara eller skriv ut rapporten"],
  ];

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">Så fungerar det</p>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Från namnidé till utskriftsvänlig rapport.</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([label, text]) => (
          <div key={label} className="rounded-lg border border-[#d8d6c8] bg-[#ecede3] p-5">
            <p className="text-sm font-semibold text-[#54665c]">{label}</p>
            <p className="mt-2 font-semibold">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#54665c]">FAQ</p>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Vanliga frågor</h2>
      </div>
      <div className="grid gap-3">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="rounded-lg border border-[#d8d6c8] bg-white p-5 shadow-sm">
            <h3 className="font-semibold">{item.question}</h3>
            <p className="mt-2 text-sm leading-6 text-[#58655e]">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
