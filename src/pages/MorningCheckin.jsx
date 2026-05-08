import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { resolveEffects, EFFECT_DEFS, buildExpiresAt, buildStartsAt } from '../lib/engine.js'
import { useNavigate } from 'react-router-dom'

const S = {
  page:    { background: '#0d0a06', minHeight: '100%', padding: '24px 16px 32px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title:   { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:     { fontSize: 15, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 28 },
  panel:   { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: '16px', marginBottom: 14 },
  q:       { fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 12 },
  desc:    { fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 },
  divider: { height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', margin: '14px 0' },
  btn:     { width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30', color: '#c9a84c' },
}

// ── Option button row ──
function OptionRow({ options, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onSelect(opt.value)} style={{
          flex: 1, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.04em',
          textAlign: 'center', lineHeight: 1.4,
          background: selected === opt.value ? 'rgba(61,46,16,0.7)' : 'rgba(19,16,10,0.6)',
          border: `1px solid ${selected === opt.value ? '#8a6e30' : '#3d2e10'}`,
          color: selected === opt.value ? '#c9a84c' : '#4a3e28',
          transition: 'all 0.15s',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Toggle chip ──
function ToggleChip({ label, icon, on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      padding: '8px 12px', borderRadius: 20, cursor: 'pointer',
      fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.04em',
      display: 'flex', alignItems: 'center', gap: 6,
      background: on ? 'rgba(61,46,16,0.7)' : 'rgba(19,16,10,0.6)',
      border: `1px solid ${on ? '#8a6e30' : '#3d2e10'}`,
      color: on ? '#c9a84c' : '#4a3e28',
      transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  )
}

const FEELING_OPTIONS = [
  { value: 'rough',   icon: '😣', label: 'Rough'   },
  { value: 'tired',   icon: '😴', label: 'Tired'   },
  { value: 'okay',    icon: '😐', label: 'Okay'    },
  { value: 'decent',  icon: '🙂', label: 'Decent'  },
  { value: 'great',   icon: '😄', label: 'Great'   },
]

const QUALITY_OPTIONS = [
  { value: 'poor',    icon: '💔', label: 'Poor'    },
  { value: 'fair',    icon: '😑', label: 'Fair'    },
  { value: 'good',    icon: '😊', label: 'Good'    },
  { value: 'deep',    icon: '🌙', label: 'Deep'    },
]

export default function MorningCheckin({ onComplete }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [step, setStep]         = useState(0)
  const [sleepHours, setSleepHours] = useState(7)
  const [sleepQuality, setSleepQuality] = useState('good')
  const [feeling, setFeeling]   = useState('okay')
  const [lastNight, setLastNight] = useState({
    alcohol: false, lateNight: false, stressed: false, junkFood: false,
  })
  const [saving, setSaving]     = useState(false)
  const [preview, setPreview]   = useState([])

  function toggleLastNight(key) {
    setLastNight(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Build preview effects when moving to confirm step
  function buildPreview() {
    const effects = []

    // Sleep effects — quality modifier
    const qualityMultiplier = { poor: 0.6, fair: 0.8, good: 1.0, deep: 1.2 }[sleepQuality]
    const effectiveSleep = sleepHours * qualityMultiplier

    if (effectiveSleep >= 8)      effects.push('well_rested', 'deep_sleep')
    else if (effectiveSleep >= 6) effects.push('well_rested')
    else if (effectiveSleep >= 5) effects.push('partial_rest')
    else                          effects.push('sleep_deprived')

    if (sleepHours > 10)          effects.push('sleep_inertia')

    // Last night carry-overs
    if (lastNight.alcohol)   effects.push('mild_hangover')
    if (lastNight.lateNight) effects.push('sleep_disrupted')
    if (lastNight.stressed)  effects.push('stressed')
    if (lastNight.junkFood)  effects.push('food_coma')

    // Feeling override — if feeling rough despite good sleep, note it
    if (feeling === 'rough' && effectiveSleep >= 6) effects.push('partial_rest')

    setPreview([...new Set(effects)]) // dedupe
  }

  async function handleSubmit() {
    setSaving(true)

    const qualityMultiplier = { poor: 0.6, fair: 0.8, good: 1.0, deep: 1.2 }[sleepQuality]
    const effectiveSleep = sleepHours * qualityMultiplier

    // Log the sleep event
    const { data: sleepEvent } = await supabase.from('events').insert({
      user_id: session.user.id,
      type: 'sleep',
      value: sleepHours,
      metadata: { quality: sleepQuality, feeling, effective_hours: effectiveSleep, checkin: 'morning' },
    }).select().single()

    // Log last night events
    if (lastNight.alcohol) {
      await supabase.from('events').insert({
        user_id: session.user.id, type: 'alcohol',
        value: 3, // assumed moderate if not specified
        metadata: { checkin: 'morning_recall' },
      })
    }
    if (lastNight.stressed) {
      await supabase.from('events').insert({
        user_id: session.user.id, type: 'stress', value: 1,
        metadata: { checkin: 'morning_recall' },
      })
    }

    // Insert all effects
    const effectRows = preview.map(effectKey => ({
      user_id: session.user.id,
      effect_key: effectKey,
      starts_at: buildStartsAt(effectKey),
      expires_at: buildExpiresAt(effectKey),
      source_event_id: sleepEvent?.id || null,
      stat_deltas: EFFECT_DEFS[effectKey]?.stats || {},
    }))

    if (effectRows.length > 0) {
      await supabase.from('active_effects').insert(effectRows)
    }

    // Mark morning check-in done for today
    await supabase.from('checkins').upsert({
      user_id: session.user.id,
      date: new Date().toISOString().split('T')[0],
      morning_done: true,
      morning_at: new Date().toISOString(),
    })

    setSaving(false)
    if (onComplete) onComplete()
    else navigate('/')
  }

  // ── Step 0: Sleep ──
  if (step === 0) return (
    <div style={S.page}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.12em', marginBottom: 8 }}>DAWN BRIEFING · 1 OF 3</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= 0 ? '#8a6e30' : '#2a1e08' }} />)}
        </div>
      </div>
      <h1 style={S.title}>Dawn Briefing</h1>
      <p style={S.sub}>The new day begins. How did you rest, adventurer?</p>

      <div style={S.panel}>
        <p style={S.q}>How long did you sleep?</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>Duration</span>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: '#c9a84c' }}>{sleepHours}h</span>
        </div>
        <input type="range" min="0" max="14" step="0.5" value={sleepHours}
          onChange={e => setSleepHours(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#c9a84c', marginBottom: 4 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#3d2e10', fontFamily: 'Cinzel, serif' }}>0h</span>
          <span style={{ fontSize: 11, color: '#3d2e10', fontFamily: 'Cinzel, serif' }}>14h</span>
        </div>
      </div>

      <div style={S.panel}>
        <p style={S.q}>How was the quality?</p>
        <p style={S.desc}>Poor sleep at 8 hours is worth less than good sleep at 6.</p>
        <OptionRow options={QUALITY_OPTIONS} selected={sleepQuality} onSelect={setSleepQuality} />
      </div>

      <button onClick={() => setStep(1)} style={S.btn}>Continue →</button>
    </div>
  )

  // ── Step 1: Feeling + last night ──
  if (step === 1) return (
    <div style={S.page}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.12em', marginBottom: 8 }}>DAWN BRIEFING · 2 OF 3</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= 1 ? '#8a6e30' : '#2a1e08' }} />)}
        </div>
      </div>
      <h1 style={S.title}>How Do You Feel?</h1>
      <p style={S.sub}>Your body speaks even when the numbers don't.</p>

      <div style={S.panel}>
        <p style={S.q}>How are you feeling right now?</p>
        <OptionRow options={FEELING_OPTIONS} selected={feeling} onSelect={setFeeling} />
      </div>

      <div style={S.panel}>
        <p style={S.q}>Anything from last night?</p>
        <p style={S.desc}>Tap anything that applies — these will generate carry-over effects.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ToggleChip label="Drank alcohol" icon="🍺" on={lastNight.alcohol}   onToggle={() => toggleLastNight('alcohol')} />
          <ToggleChip label="Late night"    icon="🌙" on={lastNight.lateNight} onToggle={() => toggleLastNight('lateNight')} />
          <ToggleChip label="Stressful"     icon="😰" on={lastNight.stressed}  onToggle={() => toggleLastNight('stressed')} />
          <ToggleChip label="Junk food"     icon="🍔" on={lastNight.junkFood}  onToggle={() => toggleLastNight('junkFood')} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setStep(0)} style={{ ...S.btn, background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28', flex: '0 0 80px' }}>← Back</button>
        <button onClick={() => { buildPreview(); setStep(2) }} style={{ ...S.btn, flex: 1 }}>Continue →</button>
      </div>
    </div>
  )

  // ── Step 2: Confirm ──
  return (
    <div style={S.page}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.12em', marginBottom: 8 }}>DAWN BRIEFING · 3 OF 3</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: '#8a6e30' }} />)}
        </div>
      </div>
      <h1 style={S.title}>Today's Forecast</h1>
      <p style={S.sub}>These effects will shape your day, adventurer.</p>

      <div style={S.panel}>
        <div style={{ display: 'flex', gap: 12, marginBottom: preview.length ? 14 : 0 }}>
          <div style={{ flex: 1, background: 'rgba(13,10,6,0.7)', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a1e08', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#c9a84c' }}>{sleepHours}h</p>
            <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 3 }}>Sleep logged</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(13,10,6,0.7)', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a1e08', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#c9a84c' }}>
              {QUALITY_OPTIONS.find(q => q.value === sleepQuality)?.icon}
            </p>
            <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 3 }}>{sleepQuality} quality</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(13,10,6,0.7)', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a1e08', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#c9a84c' }}>
              {FEELING_OPTIONS.find(f => f.value === feeling)?.icon}
            </p>
            <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 3 }}>Feeling {feeling}</p>
          </div>
        </div>

        {preview.length > 0 && (
          <>
            <div style={S.divider} />
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.1em', marginBottom: 10 }}>EFFECTS APPLIED</p>
            {preview.map(effectKey => {
              const def = EFFECT_DEFS[effectKey]
              if (!def) return null
              const isBuff = def.type === 'buff'
              return (
                <div key={effectKey} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{def.icon}</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: isBuff ? '#3d9e5a' : '#c05050', flex: 1 }}>{def.name}</span>
                  <span style={{
                    fontSize: 9, fontFamily: 'Cinzel, serif', padding: '2px 8px', borderRadius: 20,
                    background: isBuff ? 'rgba(26,74,42,0.3)' : 'rgba(80,16,16,0.3)',
                    color: isBuff ? '#3d9e5a' : '#c05050',
                  }}>{isBuff ? 'Boon' : 'Affliction'}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setStep(1)} style={{ ...S.btn, background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28', flex: '0 0 80px' }}>← Back</button>
        <button onClick={handleSubmit} disabled={saving} style={{ ...S.btn, flex: 1, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Recording…' : 'Begin the Day ✦'}
        </button>
      </div>
    </div>
  )
}
