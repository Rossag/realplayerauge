import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { resolveEffects, EFFECT_DEFS, buildExpiresAt, buildStartsAt } from '../lib/engine.js'
import { checkConflicts, resolveConflict } from '../lib/conflictRules.js'

// ─────────────────────────────────────────────────────────────
//  EVENT GROUPS — rendered as labelled sections in the grid
// ─────────────────────────────────────────────────────────────
const EVENT_GROUPS = [
  {
    label: 'Body',
    events: [
      { key: 'sleep',    icon: '🌙', label: 'Sleep',       unit: 'hours',   min: 0,  max: 14,  step: 0.5, default: 7  },
      { key: 'exercise', icon: '⚔️', label: 'Training',    unit: 'minutes', min: 0,  max: 180, step: 5,   default: 45 },
      { key: 'rest_day', icon: '🛌', label: 'Rest day',    unit: null,      min: 0,  max: 1,   step: 1,   default: 1  },
    ],
  },
  {
    label: 'Nourishment',
    events: [
      { key: 'meal',         icon: '🍖', label: 'Good meal',    unit: 'meals',   min: 1, max: 5,  step: 1, default: 1 },
      { key: 'junk',         icon: '🍔', label: 'Junk food',    unit: 'meals',   min: 1, max: 5,  step: 1, default: 1 },
      { key: 'water',        icon: '💧', label: 'Water',        unit: 'glasses', min: 0, max: 15, step: 1, default: 6 },
      { key: 'alcohol',      icon: '🍺', label: 'Alcohol',      unit: 'drinks',  min: 0, max: 20, step: 1, default: 2 },
      { key: 'caffeine',     icon: '☕', label: 'Caffeine',     unit: 'cups',    min: 1, max: 8,  step: 1, default: 1 },
      { key: 'energy_drink', icon: '⚡', label: 'Energy drink', unit: 'cans',    min: 1, max: 4,  step: 1, default: 1 },
    ],
  },
  {
    label: 'Mind & Social',
    events: [
      { key: 'social',    icon: '🤝', label: 'Fellowship', unit: null,      min: 0,  max: 1,   step: 1, default: 1  },
      { key: 'recharge',  icon: '🔋', label: 'Solitude',   unit: null,      min: 0,  max: 1,   step: 1, default: 1  },
      { key: 'sunlight',  icon: '☀️', label: 'Sunlight',   unit: 'minutes', min: 0,  max: 180, step: 5, default: 30 },
      { key: 'stress',    icon: '💀', label: 'Dark times', unit: null,      min: 0,  max: 1,   step: 1, default: 1  },
      { key: 'big_event', icon: '🎉', label: 'Big event',  unit: null,      min: 0,  max: 1,   step: 1, default: 1  },
    ],
  },
  {
    label: 'Work & Life',
    events: [
      { key: 'work_long', icon: '🕯️', label: 'Long hours', unit: 'hours', min: 6, max: 16, step: 0.5, default: 10 },
      { key: 'travel',    icon: '🗺️', label: 'Travelling', unit: null,    min: 0, max: 1,  step: 1,   default: 1  },
    ],
  },
]

const ALL_EVENTS = EVENT_GROUPS.flatMap(g => g.events)

const INTENSITY_OPTIONS = [
  { key: 'light',    label: 'Light'   },
  { key: 'moderate', label: 'Moderate'},
  { key: 'hard',     label: 'Intense' },
]

const EVENT_DESCRIPTIONS = {
  energy_drink: 'A sharp spike in energy and focus — but the crash follows.',
  work_long:    'Long hours build discipline, but fatigue compounds silently.',
  travel:       'New places shift your rhythm. Adventure lifts mood; routine suffers.',
  big_event:    'Concerts, nights out, major occasions. Charisma surges — social drain follows.',
}

const S = {
  page:       { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 24px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title:      { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  subtitle:   { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 },
  groupLabel: { fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.14em', color: '#5a4520', marginBottom: 8, marginTop: 2 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4 },
  divider:    { height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', margin: '16px 0', position: 'relative' },
}

// ── Conflict Modal ────────────────────────────────────────────
function ConflictModal({ conflict, onChoose }) {
  const isBlock = conflict.severity === 'block'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#13100a',
        border: `1px solid ${isBlock ? '#8b1a1a' : '#8a6e30'}`,
        borderBottom: 'none', borderRadius: '16px 16px 0 0',
        padding: '24px 20px 36px',
        boxShadow: `0 -8px 40px ${isBlock ? 'rgba(139,26,26,0.3)' : 'rgba(138,110,48,0.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>{isBlock ? '⚠️' : '🔍'}</span>
          <div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: isBlock ? '#c05050' : '#8a6e30', letterSpacing: '0.12em', marginBottom: 2 }}>
              {isBlock ? 'CONTRADICTION DETECTED' : 'SUSPICIOUS CHRONICLE'}
            </p>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: isBlock ? '#e07070' : '#c9a84c' }}>{conflict.title}</h2>
          </div>
        </div>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${isBlock ? '#5a1a1a' : '#3d2e10'}, transparent)`, marginBottom: 14 }} />
        <p style={{ fontSize: 14, color: '#9a8a6a', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20 }}>{conflict.message}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conflict.options.map((opt, i) => (
            <button key={i} onClick={() => onChoose(opt.resolution, conflict)} style={{
              width: '100%', padding: '13px 16px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
              textAlign: 'left',
              background: i === 0 ? 'rgba(61,46,16,0.7)' : 'rgba(19,16,10,0.6)',
              border: `1px solid ${i === 0 ? '#8a6e30' : '#3d2e10'}`,
              color: i === 0 ? '#c9a84c' : '#6a5a3a',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

export default function LogPage() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [selected, setSelected]   = useState(null)
  const [value, setValue]         = useState(0)
  const [intensity, setIntensity] = useState('moderate')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [todayKeys, setTodayKeys] = useState([])
  const [conflict, setConflict]   = useState(null)

  // Fetch what's already been logged today
  useEffect(() => {
    if (!session) return
    const today = new Date().toISOString().split('T')[0]
    supabase.from('events').select('type')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .then(({ data }) => { if (data) setTodayKeys(data.map(e => e.type)) })
  }, [session])

  function selectEvent(evt) { setSelected(evt); setValue(evt.default); setSaved(false) }

  function previewEffects() {
    if (!selected) return []
    return resolveEffects(selected.key, value, selected.key === 'exercise' ? { intensity } : {})
  }

  async function commitLog() {
    if (!selected) return
    setSaving(true)
    const meta    = selected.key === 'exercise' ? { intensity } : {}
    const effects = resolveEffects(selected.key, value, meta)
    const { data: eventData } = await supabase.from('events').insert({
      user_id: session.user.id, type: selected.key, value: parseFloat(value), metadata: meta,
    }).select().single()
    if (effects.length > 0) {
      await supabase.from('active_effects').insert(effects.map(({ effectKey }) => ({
        user_id:         session.user.id,
        effect_key:      effectKey,
        starts_at:       buildStartsAt(effectKey),
        expires_at:      buildExpiresAt(effectKey),
        source_event_id: eventData?.id || null,
        stat_deltas:     EFFECT_DEFS[effectKey]?.stats || {},
      })))
    }
    setTodayKeys(prev => [...prev, selected.key])
    setSaving(false); setSaved(true)
    setTimeout(() => navigate('/'), 1200)
  }

  async function cancelExistingEvent(eventKey) {
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('events').select('id')
      .eq('user_id', session.user.id).eq('type', eventKey)
      .gte('logged_at', `${today}T00:00:00`).lte('logged_at', `${today}T23:59:59`)
    if (!existing?.length) return
    const ids = existing.map(e => e.id)
    await supabase.from('active_effects').delete().eq('user_id', session.user.id).in('source_event_id', ids)
    await supabase.from('events').delete().in('id', ids)
    setTodayKeys(prev => prev.filter(k => k !== eventKey))
  }

  async function handleLog() {
    if (!selected) return
    const rule = checkConflicts(selected.key, todayKeys)
    if (rule) { setConflict(rule); return }
    await commitLog()
  }

  async function handleConflictChoice(resolution, rule) {
    setConflict(null)
    const { proceed, cancelExistingKey } = resolveConflict(resolution, rule)
    if (cancelExistingKey) await cancelExistingEvent(cancelExistingKey)
    if (proceed) await commitLog()
  }

  const preview = previewEffects()

  return (
    <div style={S.page}>
      <h1 style={S.title}>Chronicle Event</h1>
      <p style={S.subtitle}>Record what has befallen you this day</p>

      {/* Grouped event grid */}
      {EVENT_GROUPS.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && (
            <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #2a1e08, transparent)', margin: '14px 0 12px' }} />
          )}
          <p style={S.groupLabel}>{group.label.toUpperCase()}</p>
          <div style={{ ...S.grid, gridTemplateColumns: `repeat(${Math.min(group.events.length, 3)}, 1fr)` }}>
            {group.events.map(evt => {
              const potentialRule = checkConflicts(evt.key, todayKeys)
              const willBlock     = potentialRule?.severity === 'block'
              const isLogged      = todayKeys.includes(evt.key)

              return (
                <button key={evt.key} onClick={() => selectEvent(evt)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                  background: selected?.key === evt.key ? 'rgba(61,46,16,0.6)' : 'rgba(26,21,16,0.8)',
                  border: `1px solid ${
                    selected?.key === evt.key ? '#8a6e30'
                    : willBlock              ? '#5a1a1a'
                    : isLogged               ? '#2d4a2a'
                    : '#3d2e10'
                  }`,
                  opacity: willBlock && selected?.key !== evt.key ? 0.45 : 1,
                  transition: 'all 0.15s', position: 'relative',
                }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{evt.icon}</span>
                  <span style={{
                    fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.04em',
                    color: selected?.key === evt.key ? '#c9a84c'
                      : willBlock            ? '#6a2a2a'
                      : isLogged             ? '#3d6e3a'
                      : '#4a3e28',
                    textAlign: 'center', lineHeight: 1.3,
                  }}>{evt.label}</span>

                  {isLogged && !willBlock && (
                    <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#3d9e5a' }}/>
                  )}
                  {willBlock && (
                    <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#8b1a1a' }}/>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Detail panel */}
      {selected && (
        <div style={{ background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: 16, marginBottom: 16, marginTop: 20 }}>

          {EVENT_DESCRIPTIONS[selected.key] && (
            <p style={{ fontSize: 13, color: '#5a4a2a', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 14 }}>
              {EVENT_DESCRIPTIONS[selected.key]}
            </p>
          )}

          {selected.unit && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>{selected.label}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600, color: '#c9a84c' }}>{value} {selected.unit}</span>
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

          {/* Conflict hint */}
          {(() => {
            const rule = checkConflicts(selected.key, todayKeys)
            if (!rule) return null
            return (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: rule.severity === 'block' ? 'rgba(80,16,16,0.2)' : 'rgba(61,46,16,0.15)',
                border: `1px solid ${rule.severity === 'block' ? 'rgba(139,26,26,0.4)' : 'rgba(90,69,32,0.4)'}`,
                borderRadius: 8, padding: '10px 12px', marginBottom: 14,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{rule.severity === 'block' ? '⚠️' : '🔍'}</span>
                <div>
                  <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: rule.severity === 'block' ? '#c05050' : '#8a6e30', letterSpacing: '0.08em', marginBottom: 3 }}>
                    {rule.severity === 'block' ? 'CONFLICT' : 'CAUTION'}
                  </p>
                  <p style={{ fontSize: 12, color: '#7a6a4a', fontStyle: 'italic', lineHeight: 1.4 }}>
                    {rule.title} — you will be asked to resolve this before logging.
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Effect preview */}
          {preview.length > 0 && (
            <div>
              <div style={S.divider}>
                <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#3d2e10', fontSize: 10, background: '#13100a', padding: '0 6px' }}>✦</span>
              </div>
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

      {conflict && <ConflictModal conflict={conflict} onChoose={handleConflictChoice} />}
    </div>
  )
}
