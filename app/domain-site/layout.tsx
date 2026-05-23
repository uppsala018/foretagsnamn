import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Domain by mad.onl — Registrera din domän direkt',
  description: 'Sök och registrera .se, .com, .nu och 100+ domänändelser. Snabbt, enkelt, transparenta priser.',
  alternates: {
    canonical: 'https://domain.mad.onl',
  },
  openGraph: {
    siteName: 'Domain by mad.onl',
  },
}

export default function DomainSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
