"use client"

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'signup'
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()

  if (!isOpen) return null

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login')  await signIn(email, password)
      if (mode === 'signup') await signUp(email, password)
      if (mode === 'reset') {
        await resetPassword(email)
        setResetSent(true)
        setLoading(false)
        return
      }
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Något gick fel'
      if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError('Fel e-post eller lösenord')
      } else if (msg.includes('email-already-in-use')) {
        setError('E-postadressen används redan')
      } else {
        setError(msg)
      }
    }
    setLoading(false)
  }

  // Detect which site we're on for styling
  const isDomain = typeof window !== 'undefined' && window.location.hostname.startsWith('domain.')
  const accent = isDomain ? '#0ea05a' : '#f5c842'
  const accentText = isDomain ? '#fff' : '#0a0e1a'
  const bg = isDomain ? '#fff' : '#161d2e'
  const text = isDomain ? '#0d1f17' : '#f0f4ff'
  const subtext = isDomain ? '#4a6b58' : '#8b9bbf'
  const inputBg = isDomain ? '#f4f8f6' : 'rgba(255,255,255,0.06)'
  const inputBorder = isDomain ? '#c0ddd0' : 'rgba(45,125,210,0.3)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: bg, borderRadius: '16px', padding: '32px',
        width: '100%', maxWidth: '400px',
        border: `1px solid ${inputBorder}`
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: text, marginBottom: '6px' }}>
          {mode === 'login'  ? 'Logga in'           : ''}
          {mode === 'signup' ? 'Skapa konto'        : ''}
          {mode === 'reset'  ? 'Återställ lösenord' : ''}
        </h2>
        <p style={{ fontSize: '13px', color: subtext, marginBottom: '24px' }}>
          {mode === 'login'  ? 'Välkommen tillbaka'               : ''}
          {mode === 'signup' ? 'Gratis att skapa konto'           : ''}
          {mode === 'reset'  ? 'Vi skickar en länk till din mejl' : ''}
        </p>

        {resetSent ? (
          <p style={{ color: '#22c55e', fontSize: '14px' }}>
            Länk skickad! Kolla din inkorg.
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="E-postadress"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '9px',
                border: `1px solid ${inputBorder}`, background: inputBg,
                color: text, fontSize: '15px', marginBottom: '12px',
                fontFamily: 'inherit', outline: 'none'
              }}
            />

            {mode !== 'reset' && (
              <input
                type="password"
                placeholder="Lösenord"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '9px',
                  border: `1px solid ${inputBorder}`, background: inputBg,
                  color: text, fontSize: '15px', marginBottom: '16px',
                  fontFamily: 'inherit', outline: 'none'
                }}
              />
            )}

            {error && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: '9px',
                background: accent, color: accentText, border: 'none',
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                marginBottom: '16px', opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit'
              }}
            >
              {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : mode === 'signup' ? 'Skapa konto' : 'Skicka länk'}
            </button>

            {mode !== 'reset' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, height: '1px', background: inputBorder }}/>
                  <span style={{ fontSize: '12px', color: subtext }}>eller</span>
                  <div style={{ flex: 1, height: '1px', background: inputBorder }}/>
                </div>
                <button
                  onClick={() => signInWithGoogle().then(onClose)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '9px',
                    background: 'transparent', border: `1px solid ${inputBorder}`,
                    color: text, fontSize: '14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: 'inherit', fontWeight: 500
                  }}
                >
                  Fortsätt med Google
                </button>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px', color: subtext }}>
          {mode === 'login' && (
            <>
              <span style={{ cursor: 'pointer' }} onClick={() => setMode('signup')}>Skapa konto</span>
              <span>·</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setMode('reset')}>Glömt lösenord?</span>
            </>
          )}
          {mode === 'signup' && (
            <span style={{ cursor: 'pointer' }} onClick={() => setMode('login')}>Har du redan ett konto? Logga in</span>
          )}
          {mode === 'reset' && (
            <span style={{ cursor: 'pointer' }} onClick={() => setMode('login')}>Tillbaka till inloggning</span>
          )}
        </div>

      </div>
    </div>
  )
}
