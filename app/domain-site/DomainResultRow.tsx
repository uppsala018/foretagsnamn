"use client"

import type React from 'react'
import { getPrice, getTenYearPrice, formatPrice } from './pricing'

interface DomainResult {
  domain: string      // full domain e.g. "mittforetag.se"
  tld: string         // just the extension e.g. "se"
  available: boolean
  checking?: boolean
}

export function DomainResultRow({ result }: { result: DomainResult }) {
  const price = getPrice(result.tld)
  const tenYear = getTenYearPrice(result.tld)

  if (result.checking) {
    return (
      <div style={rowStyle}>
        <span style={tldStyle}>.{result.tld}</span>
        <span style={domainStyle}>{result.domain}</span>
        <span style={checkingStyle}>Kollar...</span>
      </div>
    )
  }

  if (!result.available) {
    return (
      <div style={rowStyle}>
        <span style={tldStyle}>.{result.tld}</span>
        <span style={domainStyle}>{result.domain}</span>
        <div style={takenDot} />
        <span style={takenLabel}>Taget</span>
        <span style={takenPrice}>—</span>
        <button style={takenBtn} disabled>Ej tillgänglig</button>
      </div>
    )
  }

  return (
    <div style={{ ...rowStyle, background: result.tld === 'se' ? '#f4fbf7' : undefined }}>
      <span style={tldStyle}>.{result.tld}</span>
      <span style={domainStyle}>{result.domain}</span>
      <div style={availDot} />
      <span style={availLabel}>Ledigt</span>

      <div style={priceBlock}>
        <div style={price1Style}>{formatPrice(price.year1)} första året</div>
        <div style={price2Style}>sedan {formatPrice(price.renewal)}/år</div>
        <div style={price3Style}>10 år: {formatPrice(tenYear)}</div>
      </div>

      <div style={btnWrap}>
        {/* TODO: Köp-flöde – här ska Stripe + domänregistrering kopplas in senare */}
        <button style={buyBtn}>
          Registrera nu →
        </button>
        <div style={btnSub}>Säkra din domän direkt</div>
      </div>
    </div>
  )
}

// Styles
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '14px 20px',
  borderBottom: '1px solid #f0f5f2', gap: '12px', flexWrap: 'wrap'
}
const tldStyle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 700, minWidth: '52px', color: '#0d1f17'
}
const domainStyle: React.CSSProperties = {
  fontSize: '14px', color: '#4a6b58', flex: 1, minWidth: '160px'
}
const availDot: React.CSSProperties = {
  width: '7px', height: '7px', borderRadius: '50%', background: '#0ea05a', flexShrink: 0
}
const takenDot: React.CSSProperties = {
  width: '7px', height: '7px', borderRadius: '50%', background: '#e84040', flexShrink: 0
}
const availLabel: React.CSSProperties = {
  fontSize: '12px', color: '#0a7a44', minWidth: '48px', fontWeight: 500
}
const takenLabel: React.CSSProperties = {
  fontSize: '12px', color: '#c03030', minWidth: '48px', fontWeight: 500
}
const takenPrice: React.CSSProperties = {
  fontSize: '14px', color: '#c0ccc8', flex: 1
}
const checkingStyle: React.CSSProperties = {
  fontSize: '13px', color: '#9ab8a8', flex: 1, fontStyle: 'italic'
}
const priceBlock: React.CSSProperties = {
  textAlign: 'right', minWidth: '160px'
}
const price1Style: React.CSSProperties = {
  fontSize: '15px', fontWeight: 700, color: '#0d1f17'
}
const price2Style: React.CSSProperties = {
  fontSize: '12px', color: '#6b8f7a', marginTop: '2px'
}
const price3Style: React.CSSProperties = {
  fontSize: '11px', color: '#9ab8a8', marginTop: '1px'
}
const btnWrap: React.CSSProperties = {
  textAlign: 'center', minWidth: '160px'
}
const buyBtn: React.CSSProperties = {
  background: '#0ea05a', color: '#fff', border: 'none',
  padding: '10px 22px', borderRadius: '8px', fontSize: '14px',
  fontWeight: 700, cursor: 'pointer', width: '100%'
}
const takenBtn: React.CSSProperties = {
  background: '#f0f5f2', color: '#9ab8a8', border: 'none',
  padding: '10px 22px', borderRadius: '8px', fontSize: '14px',
  cursor: 'not-allowed', minWidth: '140px'
}
const btnSub: React.CSSProperties = {
  fontSize: '11px', color: '#9ab8a8', marginTop: '5px'
}
