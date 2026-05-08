import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { resolveEffects, EFFECT_DEFS, buildExpiresAt, buildStartsAt } from '../lib/engine.js'

const EVENT_TYPES = [
  { key: 'sleep',    icon: '🌙', label: 'Sleep',         unit: 'hours',   min: 0, max: 14, step: 0.5, default: 7  },
  { key: 'alcohol',  icon: '🍺', label: 'Alcohol',       unit: 'drinks',  min: 0, max: 20, step: 1,   default: 2  },
  { key: 'exercise', icon: '⚔️', label: 'Training',      unit: 'minutes', min: 0, max: 180,step: 5,   default: 45 },
  { key: 'rest_day', icon: '🛌', label: 'Rest day',      unit: null,      min: 0, max: 1,  step: 1,   default: 1  },
  { key: 'meal',     icon: '🍖', label: 'Good meal',     unit: 'meals',   min: 1, max: 5,  step: 1,   default: 1  },
  { key: 'junk',     icon: '🍔', label: 'Junk food',     unit: 'meals',   min: 1, max: 5,  step: 1,   default: 1  },
  { key: 'water',    icon: '💧', label: 'Water',         unit: 'glasses', min: 0, max: 15, step: 1,   default: 6  },
  { key: 'caffeine', icon: '☕', label: 'Caffeine',      unit: 'cups',    min: 1, max: 8,  step: 1,   default: 1  },
  { key: 'social',   icon: '🤝', label: 'Fellowship',    unit: null,      min: 0, max: 1,  step: 1,   default: 1  },
  { key: 'recharge', icon: '🔋', label: 'Solitude',      unit: null,      min: 0, max: 1,  step: 1,   default: 1  },
  { key: 'sunlight', icon: '☀️', label: 'Sunlight',      unit: 'minutes', min: 0, max: 180,step: 5,   default: 30 },
  { key: 'stress',   icon: '💀', label: 'Dark times',    unit: null,      min: 0, max: 1,  step: 1,   default: 1  },
]

const INTENSITY_OPTIONS = [
  { key: 'light',    label: 'Light'    },
  { key: 'moderate', label: 'Moderate' },
  { key: 'hard',     label: 'Intense'  },
]

const S = {
  page:     { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 24px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title:    { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 },
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 },
  divider:  { height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', margin: '16px 0', position: 'relative' },
}

export default function LogPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [value, setValue] = useState(0)
  const [intensity, setIntensity] = useState('moderate')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function selectEvent(evt) { setSelected(evt); setValue(evt.default); setSaved(false) }

  function previewEffects() {
    if (!selected) return []
    return resolveEffects(selected.key, value, selected.key === 'exercise' ? { intensity } : {})
  }

  async function handleLog() {
    if (!selected) return
    setSaving(true)
    const meta = selected.key === 'exercise' ? { intensity } : {}
    const effects = resolveEffects(selected.key, value, meta)
    const { data: eventData } = await supabase.from('events').insert({
      user_id: session.user.id, type: selected.key, value: parseFloat(value), metadata: meta,
    }).select().single()
    if (effects.length > 0) {
      await supabase.from('active_effects').insert(effects.map(({ effectKey }) => ({
        user_id: session.user.id, effect_key: effectKey,
        starts_at: buildStartsAt(effectKey),
        expires_at: buildExpiresAt(effectKey),
        source_event_id: eventData?.id || null,
        stat_deltas: EFFECT_DEFS[effectKey]?.stats || {},
      })))
    }
    setSaving(false); setSaved(true)
    setTimeout(() => navigate('/'), 1200)
  }

  const preview = previewEffects()

  return (
    <div style={S.page}>
      <h1 style={S.title}>Chronicle Event</h1>
      <p style={S.subtitle}>Record what has befallen you this day</p>

      {/* Event grid */}
      <div style={S.grid}>
        {EVENT_TYPES.map(evt => (
          <button key={evt.key} onClick={() => selectEvent(evt)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
            background: selected?.key === evt.key ? 'rgba(61,46,16,0.6)' : 'rgba(26,21,16,0.8)',
            border: `1px solid ${selected?.key === evt.key ? '#8a6e30' : '#3d2e10'}`,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{evt.icon}</span>
            <span style={{
              fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.04em',
              color: selected?.key === evt.key ? '#c9a84c' : '#4a3e28',
              textAlign: 'center', lineHeight: 1.3,
            }}>{evt.label}</span>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10',
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          {selected.unit && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>{selected.label}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600, color: '#c9a84c' }}>
                  {value} {selected.unit}
                </span>
              </div>
              <input type="range" min={selected.min} max={selected.max} step={selected.step}
                value={value} onChange={e => setValue(e.target.value)}
                style={{ width: '100%', accentColor: '#c9a84c' }} />
            </div>
          )}

          {selected.key === 'exercise' && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 8 }}>Training intensity</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {INTENSITY_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setIntensity(opt.key)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.06em',
                    background: intensity === opt.key ? 'rgba(61,46,16,0.6)' : 'transparent',
                    border: `1px solid ${intensity === opt.key ? '#8a6e30' : '#3d2e10'}`,
                    color: intensity === opt.key ? '#c9a84c' : '#4a3e28',
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Effect preview */}
          {preview.length > 0 && (
            <div>
              <div style={S.divider}><span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#3d2e10', fontSize: 10, background: '#13100a', padding: '0 6px' }}>✦</span></div>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.1em', marginBottom: 10 }}>EFFECTS UPON LOGGING</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {preview.map(({ effectKey }) => {
                  const def = EFFECT_DEFS[effectKey]
                  if (!def) return null
                  const isBuff = def.type === 'buff'
                  return (
                    <div key={effectKey} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{def.icon}</span>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: isBuff ? '#3d9e5a' : '#c05050', flex: 1 }}>{def.name}</span>
                      <span style={{
                        fontSize: 9, fontFamily: 'Cinzel, serif', padding: '2px 8px', borderRadius: 20,
                        background: def.nextDay ? 'rgba(61,46,16,0.4)' : isBuff ? 'rgba(26,74,42,0.3)' : 'rgba(80,16,16,0.3)',
                        color: def.nextDay ? '#8a6e30' : isBuff ? '#3d9e5a' : '#c05050',
                        border: `0.5px solid ${def.nextDay ? '#5a4520' : isBuff ? 'rgba(45,110,66,0.4)' : 'rgba(120,30,30,0.4)'}`,
                      }}>{def.nextDay ? 'On morrow' : isBuff ? 'Boon' : 'Affliction'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      {selected && (
        <button onClick={handleLog} disabled={saving || saved} style={{
          width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
          background: saved ? 'rgba(26,74,42,0.3)' : 'rgba(61,46,16,0.8)',
          border: `1px solid ${saved ? 'rgba(45,110,66,0.6)' : '#8a6e30'}`,
          color: saved ? '#3d9e5a' : '#c9a84c',
          transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
        }}>
          {saved ? '✦ Chronicle Updated' : saving ? 'Recording…' : `Record ${selected.label}`}
        </button>
      )}
    </div>
  )
}
