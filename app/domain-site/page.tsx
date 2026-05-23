"use client"

import { useState } from 'react'
import { DomainResultRow } from './DomainResultRow'
import { MY_PRICES, formatPrice } from './pricing'
import { useAuth } from '@/lib/AuthContext'
import { AuthModal } from '@/components/AuthModal'

// TLDs to always check when user searches
const DEFAULT_TLDS = ['se', 'com', 'nu', 'io', 'app', 'ai', 'co', 'org', 'net', 'eu', 'xyz']

interface DomainResult {
  domain: string
  tld: string
  available: boolean
  checking?: boolean
}

export default function DomainSitePage() {
  const { user, logOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DomainResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSearch() {
    const q = query.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!q) return

    setHasSearched(true)
    setIsLoading(true)

    // Show checking state immediately for all TLDs
    const checking: DomainResult[] = DEFAULT_TLDS.map(tld => ({
      domain: `${q}.${tld}`,
      tld,
      available: false,
      checking: true,
    }))
    setResults(checking)

    try {
      // Call the existing domain-check backend API
      const names = DEFAULT_TLDS.map(tld => `${q}.${tld}`)
      const res = await fetch('/api/hostup/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      })
      const data = await res.json() as { success?: boolean; data?: unknown[] }

      const rawResults: unknown[] = data?.success && Array.isArray(data?.data) ? data.data : []

      const mapped: DomainResult[] = DEFAULT_TLDS.map(tld => {
        const fullDomain = `${q}.${tld}`
        const match = rawResults.find((item) => {
          if (typeof item !== 'object' || item === null) return false
          const r = item as Record<string, unknown>
          const name = String(r.name ?? r.domain ?? r.fqdn ?? '').toLowerCase()
          return name === fullDomain
        }) as Record<string, unknown> | undefined

        let available = false
        if (match) {
          const a = match.available ?? match.isAvailable
          if (typeof a === 'boolean') available = a
          else if (typeof a === 'string') available = ['true', 'yes', '1', 'available'].includes(a.toLowerCase())
        }

        return { domain: fullDomain, tld, available, checking: false }
      })

      setResults(mapped)
    } catch (err) {
      console.error('Domain check failed:', err)
      setResults(DEFAULT_TLDS.map(tld => ({
        domain: `${q}.${tld}`,
        tld,
        available: false,
        checking: false,
      })))
    } finally {
      setIsLoading(false)
    }
  }

  const availableCount = results.filter(r => r.available).length

  return (
    <div style={{ background: '#f8faf9', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#0d1f17' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px', background: '#fff', borderBottom: '1px solid #e0ede6',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '19px', fontWeight: 700 }}>
          Domain
          <span style={{ fontSize: '14px', fontWeight: 400, color: '#9ab8a8' }}> by </span>
          <span style={{ color: '#0ea05a' }}>mad.onl</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#priser" style={{ fontSize: '14px', color: '#4a6b58', textDecoration: 'none' }}>Priser</a>
          <a href="https://foretagsnamn.mad.onl" style={{ fontSize: '14px', color: '#4a6b58', textDecoration: 'none' }}>Analysera företagsnamn</a>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#4a6b58' }}>{user.email}</span>
              <button
                onClick={() => logOut()}
                style={{ fontSize: '13px', padding: '6px 14px', border: '1px solid #c8ddd2', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}
              >
                Logga ut
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              style={{ fontSize: '14px', padding: '7px 16px', border: '1px solid #c8ddd2', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}
            >
              Logga in / Mina domäner
            </button>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: '#fff', padding: '64px 40px 52px', textAlign: 'center', borderBottom: '1px solid #e0ede6' }}>
        <div style={{
          display: 'inline-block', background: '#eaf7f1', color: '#0a7a44',
          fontSize: '12px', fontWeight: 500, padding: '4px 14px',
          borderRadius: '20px', marginBottom: '20px'
        }}>
          Snabb registrering · Transparenta priser · Inga dolda avgifter
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 46px)',
          fontWeight: 700, lineHeight: 1.12, color: '#0d1f17',
          maxWidth: '520px', margin: '0 auto 14px'
        }}>
          Din domän.<br />
          <span style={{ color: '#0ea05a' }}>Ditt pris.</span>
        </h1>

        <p style={{ fontSize: '16px', color: '#4a6b58', maxWidth: '400px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Sök och registrera domäner direkt — .se, .com, .nu och fler ändelser till fasta priser.
        </p>

        {/* SEARCH */}
        <div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Sök din domän, t.ex. mittforetag"
            style={{
              width: '100%', background: '#f4f8f6', border: '1.5px solid #c0ddd0',
              borderRadius: '12px', padding: '16px 150px 16px 20px',
              fontSize: '16px', fontFamily: 'Inter, sans-serif', color: '#0d1f17',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              background: '#0ea05a', color: '#fff', border: 'none',
              padding: '10px 22px', borderRadius: '8px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}
          >
            {isLoading ? 'Söker...' : 'Sök →'}
          </button>
        </div>

        {/* TLD PILLS */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          {DEFAULT_TLDS.map(tld => (
            <span key={tld} style={{
              background: '#eaf7f1', color: '#0a7a44', fontSize: '12px',
              fontWeight: 500, padding: '4px 10px', borderRadius: '6px'
            }}>.{tld}</span>
          ))}
        </div>
      </section>

      {/* RESULTS */}
      {hasSearched && (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', color: '#4a6b58' }}>
              Resultat för <strong style={{ color: '#0d1f17' }}>{query}</strong>
            </div>
            {!isLoading && (
              <div style={{ fontSize: '13px', color: '#9ab8a8' }}>
                {availableCount} av {results.length} lediga
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e0ede6', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
            {results.map(r => <DomainResultRow key={r.tld} result={r} />)}
          </div>

          {/* CROSS-SELL */}
          <div style={{
            background: '#0d1f17', borderRadius: '14px', padding: '22px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', marginBottom: '40px', flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                Kolla också företagsnamnet
              </div>
              <div style={{ fontSize: '13px', color: '#7aac90' }}>
                AI-analys av namn, varumärken och sociala handles — 49 kr engång
              </div>
            </div>
            <a href="https://foretagsnamn.mad.onl" style={{
              background: '#0ea05a', color: '#fff', border: 'none',
              padding: '10px 22px', borderRadius: '8px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
              whiteSpace: 'nowrap', flexShrink: 0
            }}>
              Analysera namnet →
            </a>
          </div>
        </div>
      )}

      {/* PRICE TABLE */}
      <div id="priser" style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b8f7a', marginBottom: '8px' }}>
            Priser
          </div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, color: '#0d1f17' }}>
            Fasta priser — inga överraskningar
          </h2>
          <p style={{ fontSize: '14px', color: '#4a6b58', marginTop: '8px' }}>
            Priset du ser är priset du betalar. Förnyelsepris visas alltid tydligt.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0ede6', borderRadius: '14px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr',
            padding: '12px 20px', background: '#f4fbf7',
            borderBottom: '1px solid #e0ede6', fontSize: '12px',
            fontWeight: 600, color: '#6b8f7a', textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            <span>TLD</span>
            <span style={{ textAlign: 'right' }}>År 1</span>
            <span style={{ textAlign: 'right' }}>Förnyelse/år</span>
            <span style={{ textAlign: 'right' }}>10 år totalt</span>
          </div>
          {Object.entries(MY_PRICES).map(([tld, p]) => (
            <div key={tld} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr',
              padding: '13px 20px', borderBottom: '1px solid #f0f5f2',
              fontSize: '14px', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 700, color: '#0ea05a', fontFamily: 'Syne, sans-serif' }}>.{tld}</span>
              <span style={{ textAlign: 'right', fontWeight: 600, color: '#0d1f17' }}>{formatPrice(p.year1)}</span>
              <span style={{ textAlign: 'right', color: '#4a6b58' }}>{formatPrice(p.renewal)}</span>
              <span style={{ textAlign: 'right', color: '#9ab8a8', fontSize: '13px' }}>
                {formatPrice(p.year1 + p.renewal * 9)}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#9ab8a8', marginTop: '10px', textAlign: 'center' }}>
          Alla priser inkl. moms. Ytterligare TLD:er tillgängliga vid sökning.
        </p>
      </div>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #e0ede6', padding: '24px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '13px', color: '#9ab8a8', background: '#fff', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#0d1f17' }}>
          Domain
          <span style={{ fontWeight: 400, color: '#9ab8a8' }}> by </span>
          <span style={{ color: '#0ea05a' }}>mad.onl</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#" style={{ color: '#9ab8a8', textDecoration: 'none' }}>Integritetspolicy</a>
          <a href="#" style={{ color: '#9ab8a8', textDecoration: 'none' }}>Villkor</a>
          <a href="https://foretagsnamn.mad.onl" style={{ color: '#9ab8a8', textDecoration: 'none' }}>Företagsnamn by mad.onl</a>
        </div>
        <div>© 2026 · mad.onl</div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
