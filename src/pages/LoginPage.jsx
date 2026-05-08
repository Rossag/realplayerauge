import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function LoginPage() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signInWithEmail(email)
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0d0a06', padding: '24px 24px',
      fontFamily: 'Crimson Pro, Georgia, serif',
    }}>
      {/* Crest */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 12, lineHeight: 1 }}>⚔️</div>
        <h1 style={{
          fontFamily: 'Cinzel, serif', fontSize: 30, fontWeight: 700,
          color: '#c9a84c', letterSpacing: '0.06em', marginBottom: 8,
        }}>StatusRPG</h1>
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #5a4520, transparent)', margin: '12px auto', width: 200 }} />
        <p style={{ fontSize: 15, color: '#7a6a4a', fontStyle: 'italic', maxWidth: 280, lineHeight: 1.5 }}>
          Track your daily buffs and debuffs. Share your status with your guild.
        </p>
      </div>

      {sent ? (
        <div style={{
          width: '100%', maxWidth: 340, background: 'rgba(19,16,10,0.9)',
          border: '1px solid #3d2e10', borderRadius: 14, padding: '28px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c9a84c', marginBottom: 8 }}>Missive Dispatched</h2>
          <p style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', lineHeight: 1.5 }}>
            A magic link has been sent to{' '}
            <span style={{ color: '#d4bc8a' }}>{email}</span>.
            Tap it to enter the realm.
          </p>
          <button onClick={() => setSent(false)} style={{
            marginTop: 16, fontSize: 13, color: '#8a6e30', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif',
          }}>Use a different scroll</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.1em', color: '#5a4520', marginBottom: 8 }}>
              YOUR EMAIL
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="adventurer@realm.com" required
              style={{
                width: '100%', background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10',
                borderRadius: 10, padding: '12px 16px', fontSize: 15,
                color: '#d4bc8a', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'Crimson Pro, serif',
              }}
            />
          </div>
          {error && <p style={{ color: '#c05050', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px 0', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
            background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30',
            color: '#c9a84c', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Sending…' : 'Enter the Realm'}
          </button>
          <p style={{ textAlign: 'center', color: '#4a3e28', fontSize: 13, fontStyle: 'italic', marginTop: 12 }}>
            No account needed — just your email
          </p>
        </form>
      )}

      {/* Sample effects teaser */}
      <div style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 300 }}>
        {['🌙 Well Rested', '⚔️ Battle Ready', '☀️ Blessed', '💀 Afflicted', '☕ Caffeine Boost', '😴 Exhausted'].map(b => (
          <span key={b} style={{
            fontSize: 12, background: 'rgba(19,16,10,0.8)', border: '1px solid #3d2e10',
            borderRadius: 20, padding: '4px 12px', color: '#4a3e28', fontStyle: 'italic',
          }}>{b}</span>
        ))}
      </div>
    </div>
  )
}
