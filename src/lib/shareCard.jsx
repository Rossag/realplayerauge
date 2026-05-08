import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { EFFECT_DEFS, STAT_LABELS, STAT_COLOURS } from './engine.js'

// Renders a hidden card DOM node then exports it as a PNG for sharing
export function useShareCard() {
  const cardRef = useRef(null)

  async function generateAndShare({ username, stats, activeEffects, avatarUrl }) {
    if (!cardRef.current) return

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0d0a06',
      })

      // Try native share sheet first (mobile)
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'my-status.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My RealPlayerGauge Status' })
          return
        }
      }

      // Fallback — download
      const link = document.createElement('a')
      link.download = 'rpg-status.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Share failed:', err)
    }
  }

  return { cardRef, generateAndShare }
}

// The actual card component — rendered off-screen, captured as image
export function ShareCard({ cardRef, username, stats, activeEffects, avatarUrl }) {
  const buffs   = activeEffects.filter(e => EFFECT_DEFS[e.effect_key]?.type === 'buff').slice(0, 3)
  const debuffs = activeEffects.filter(e => EFFECT_DEFS[e.effect_key]?.type === 'debuff').slice(0, 3)
  const today   = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed', left: -9999, top: 0,
        width: 360, background: '#0d0a06',
        border: '1px solid #5a4520',
        borderRadius: 16, padding: 24,
        fontFamily: 'Crimson Pro, Georgia, serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em' }}>
            {username}
          </p>
          <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>{today}</p>
        </div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a4520', letterSpacing: '0.06em' }}>
          RealPlayerGauge
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #5a4520, transparent)', marginBottom: 16 }} />

      {/* Portrait + stats side by side */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {/* Portrait */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
          border: '2px solid #5a4520', overflow: 'hidden',
          background: '#13100a', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 36 }}>⚔️</span>}
        </div>

        {/* Stat grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} style={{ background: 'rgba(19,16,10,0.8)', border: '1px solid #3d2e10', borderRadius: 6, padding: '5px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontFamily: 'Cinzel, serif', color: '#5a4520', letterSpacing: '0.06em' }}>
                  {key.slice(0, 3).toUpperCase()}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: STAT_COLOURS[key] }}>{Math.round(val)}</span>
              </div>
              <div style={{ height: 2, background: '#2a1e08', borderRadius: 1 }}>
                <div style={{ height: '100%', width: `${val}%`, background: STAT_COLOURS[key], borderRadius: 1 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #5a4520, transparent)', marginBottom: 12 }} />

      {/* Effects */}
      {buffs.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#5a4520', letterSpacing: '0.1em', marginBottom: 6 }}>ACTIVE BOONS</p>
          {buffs.map(e => {
            const def = EFFECT_DEFS[e.effect_key]
            return def ? (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{def.icon}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#3d9e5a' }}>{def.name}</span>
              </div>
            ) : null
          })}
        </div>
      )}

      {debuffs.length > 0 && (
        <div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#5a4520', letterSpacing: '0.1em', marginBottom: 6 }}>ACTIVE AFFLICTIONS</p>
          {debuffs.map(e => {
            const def = EFFECT_DEFS[e.effect_key]
            return def ? (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{def.icon}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#c05050' }}>{def.name}</span>
              </div>
            ) : null
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 14, height: 1, background: 'linear-gradient(to right, transparent, #5a4520, transparent)', marginBottom: 10 }} />
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#3d2e10', textAlign: 'center', letterSpacing: '0.1em' }}>
        realplayergauge.com
      </p>
    </div>
  )
}
