import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { EFFECT_DEFS, buildExpiresAt, buildStartsAt } from '../lib/engine.js'
import { useNavigate } from 'react-router-dom'

const S = {
  page:  { background: '#0d0a06', minHeight: '100%', padding: '24px 16px 32px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title: { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:   { fontSize: 15, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 28 },
  panel: { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: '16px', marginBottom: 14 },
  q:     { fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 12 },
  desc:  { fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 },
  divider: { height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', margin: '14px 0' },
  btn:   { width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30', color: '#c9a84c' },
}

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

const NUTRITION_OPTIONS = [
  { value: 'poor',    icon: '🍔', label: 'Poor'    },
  { value: 'mixed',   icon: '🥙', label: 'Mixed'   },
  { value: 'good',    icon: '🥗', label: 'Good'    },
  { value: 'great',   icon: '🌿', label: 'Great'   },
]

const MOOD_OPTIONS = [
  { value: 'terrible', icon: '😞', label: 'Terrible' },
  { value: 'low',      icon: '😔', label: 'Low'      },
  { value: 'neutral',  icon: '😐', label: 'Neutral'  },
  { value: 'good',     icon: '🙂', label: 'Good'     },
  { value: 'great',    icon: '😄', label: 'Great'    },
]

export default function EveningCheckin({ onComplete }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [step, setStep]           = useState(0)
  const [nutrition, setNutrition] = useState('mixed')
  const [water, setWater]         = useState(4)
  const [drank, setDrank]         = useState(false)
  const [drinkUnits, setDrinkUnits] = useState(2)
  const [exercised, setExercised] = useState(false)
  const [exerciseMins, setExerciseMins] = useState(30)
  const [exerciseIntensity, setExerciseIntensity] = useState('moderate')
  const [mood, setMood]           = useState('neutral')
  const [extras, setExtras]       = useState({
    social: false, sunlight: false, stressed: false, lateNight: false,
  })
  const [preview, setPreview]     = useState([])
  const [saving, setSaving]       = useState(false)

  function toggleExtra(key) {
    setExtras(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function buildPreview() {
    const effects = []

    // Water
    if (water >= 6)      effects.push('hydrated')
    else if (water <= 2) effects.push('thirsty')

    // Nutrition
    if (nutrition === 'great' || nutrition === 'good') effects.push('well_fed')
    if (nutrition === 'poor')  { effects.push('comfort_boost'); effects.push('food_coma') }

    // Alcohol
    if (drank) {
      if (drinkUnits <= 2)      effects.push('social_ease')
      else if (drinkUnits <= 5) { effects.push('charisma_surge'); effects.push('sleep_disrupted'); effects.push('mild_hangover') }
      else                      { effects.push('charisma_surge'); effects.push('sleep_disrupted'); effects.push('full_hangover') }
    }

    // Exercise
    if (exercised) {
      if (exerciseMins < 30)            effects.push('active')
      else if (exerciseIntensity === 'hard') { effects.push('post_workout'); effects.push('doms') }
      else                              { effects.push('post_workout'); effects.push('mild_doms') }
    }

    // Extras
    if (extras.social)   effects.push('connected')
    if (extras.sunlight) effects.push('sun_kissed')
    if (extras.stressed) effects.push('stressed')

    // Mood modifier — if great day, add mood boost
    if (mood === 'great') effects.push('connected')

    setPreview([...new Set(effects)])
  }

  async function handleSubmit() {
    setSaving(true)

    // Log water
    await supabase.from('events').insert({
      user_id: session.user.id, type: 'water', value: water,
      metadata: { checkin: 'evening' },
    })

    // Log nutrition
    await supabase.from('events').insert({
      user_id: session.user.id,
      type: nutrition === 'poor' ? 'junk' : 'meal',
      value: 1,
      metadata: { quality: nutrition, checkin: 'evening' },
    })

    // Log alcohol
    if (drank) {
      await supabase.from('events').insert({
        user_id: session.user.id, type: 'alcohol', value: drinkUnits,
        metadata: { checkin: 'evening' },
      })
    }

    // Log exercise
    if (exercised) {
      await supabase.from('events').insert({
        user_id: session.user.id, type: 'exercise', value: exerciseMins,
        metadata: { intensity: exerciseIntensity, checkin: 'evening' },
      })
    }

    // Log extras
    if (extras.social)   await supabase.from('events').insert({ user_id: session.user.id, type: 'social',   value: 1, metadata: { checkin: 'evening' } })
    if (extras.sunlight) await supabase.from('events').insert({ user_id: session.user.id, type: 'sunlight', value: 30, metadata: { checkin: 'evening' } })
    if (extras.stressed) await supabase.from('events').insert({ user_id: session.user.id, type: 'stress',   value: 1, metadata: { checkin: 'evening' } })

    // Insert all effects
    const now = new Date().toISOString()
    const effectRows = preview.map(effectKey => ({
      user_id: session.user.id,
      effect_key: effectKey,
      starts_at: buildStartsAt(effectKey),
      expires_at: buildExpiresAt(effectKey),
      stat_deltas: EFFECT_DEFS[effectKey]?.stats || {},
    }))

    if (effectRows.length > 0) {
      await supabase.from('active_effects').insert(effectRows)
    }

    // Mark evening check-in done
    await supabase.from('checkins').upsert({
      user_id: session.user.id,
      date: new Date().toISOString().split('T')[0],
      evening_done: true,
      evening_at: new Date().toISOString(),
      mood_score: ['terrible','low','neutral','good','great'].indexOf(mood),
    }, { onConflict: 'user_id,date' })

    setSaving(false)
    if (onComplete) onComplete()
    else navigate('/')
  }

  // ── Step 0: Food & Water ──
  if (step === 0) return (
    <div style={S.page}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.12em', marginBottom: 8 }}>DUSK RECKONING · 1 OF 3</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= 0 ? '#8a6e30' : '#2a1e08' }} />)}
        </div>
      </div>
      <h1 style={S.title}>Dusk Reckoning</h1>
      <p style={S.sub}>The day draws to a close. How did you fare?</p>

      <div style={S.panel}>
        <p style={S.q}>How was your nutrition today?</p>
        <OptionRow options={NUTRITION_OPTIONS} selected={nutrition} onSelect={setNutrition} />
      </div>

      <div style={S.panel}>
        <p style={S.q}>How much water did you drink?</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>Glasses</span>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: water >= 6 ? '#4a70c0' : water <= 2 ? '#c05050' : '#c9a84c' }}>
            {water} {water >= 6 ? '💧' : water <= 2 ? '🏜️' : ''}
          </span>
        </div>
        <input type="range" min="0" max="15" step="1" value={water}
          onChange={e => setWater(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#c9a84c' }} />
      </div>

      <button onClick={() => setStep(1)} style={S.btn}>Continue →</button>
    </div>
  )

  // ── Step 1: Activity & Alcohol ──
  if (step === 1) return (
    <div style={S.page}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.12em', marginBottom: 8 }}>DUSK RECKONING · 2 OF 3</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= 1 ? '#8a6e30' : '#2a1e08' }} />)}
        </div>
      </div>
      <h1 style={S.title}>Activity & Vices</h1>
      <p style={S.sub}>Training and revelry both leave their mark.</p>

      {/* Exercise */}
      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: exercised ? 14 : 0 }}>
          <p style={{ ...S.q, marginBottom: 0 }}>Did you train today?</p>
          <button onClick={() => setExercised(!exercised)} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.06em',
            background: exercised ? 'rgba(61,46,16,0.7)' : 'rgba(19,16,10,0.6)',
            border: `1px solid ${exercised ? '#8a6e30' : '#3d2e10'}`,
            color: exercised ? '#c9a84c' : '#4a3e28',
          }}>{exercised ? '⚔️ Yes' : 'No'}</button>
        </div>
        {exercised && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>Duration</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c9a84c' }}>{exerciseMins} mins</span>
            </div>
            <input type="range" min="10" max="180" step="5" value={exerciseMins}
              onChange={e => setExerciseMins(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#c9a84c', marginBottom: 12 }} />
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.08em', marginBottom: 8 }}>INTENSITY</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['light','moderate','hard'].map(opt => (
                <button key={opt} onClick={() => setExerciseIntensity(opt)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.04em',
                  background: exerciseIntensity === opt ? 'rgba(61,46,16,0.7)' : 'transparent',
                  border: `1px solid ${exerciseIntensity === opt ? '#8a6e30' : '#3d2e10'}`,
                  color: exerciseIntensity === opt ? '#c9a84c' : '#4a3e28',
                }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Alcohol */}
      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: drank ? 14 : 0 }}>
          <p style={{ ...S.q, marginBottom: 0 }}>Did you drink tonight?</p>
          <button onClick={() => setDrank(!drank)} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.06em',
            background: drank ? 'rgba(61,46,16,0.7)' : 'rgba(19,16,10,0.6)',
            border: `1px solid ${drank ? '#8a6e30' : '#3d2e10'}`,
            color: drank ? '#c9a84c' : '#4a3e28',
          }}>{drank ? '🍺 Yes' : 'No'}</button>
        </div>
        {drank && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>Units</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: drinkUnits >= 6 ? '#c05050' : '#c9a84c' }}>
                {drinkUnits} {drinkUnits >= 6 ? '⚠️' : ''}
              </span>
            </div>
            <input type="range" min="1" max="15" step="1" value={drinkUnits}
              onChange={e => setDrinkUnits(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#c9a84c' }} />
            {drinkUnits >= 6 && (
              <p style={{ fontSize: 13, color: '#c05050', fontStyle: 'italic', marginTop: 8 }}>
                The Full Hangover awaits tomorrow, adventurer.
              </p>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setStep(0)} style={{ ...S.btn, background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28', flex: '0 0 80px' }}>← Back</button>
        <button onClick={() => { buildPreview(); setStep(2) }} style={{ ...S.btn, flex: 1 }}>Continue →</button>
      </div>
    </div>
  )

  // ── Step 2: Mood, extras, confirm ──
  return (
    <div style={S.page}>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.12em', marginBottom: 8 }}>DUSK RECKONING · 3 OF 3</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: '#8a6e30' }} />)}
        </div>
      </div>
      <h1 style={S.title}>Final Account</h1>
      <p style={S.sub}>Last details before the day is sealed.</p>

      <div style={S.panel}>
        <p style={S.q}>Overall mood today?</p>
        <OptionRow options={MOOD_OPTIONS} selected={mood} onSelect={setMood} />
      </div>

      <div style={S.panel}>
        <p style={S.q}>Anything else today?</p>
        <p style={S.desc}>Tap anything that applies.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ToggleChip label="Social time"   icon="🤝" on={extras.social}    onToggle={() => toggleExtra('social')} />
          <ToggleChip label="Sunlight"      icon="☀️" on={extras.sunlight}  onToggle={() => toggleExtra('sunlight')} />
          <ToggleChip label="Stressful day" icon="😰" on={extras.stressed}  onToggle={() => toggleExtra('stressed')} />
          <ToggleChip label="Staying up late" icon="🌙" on={extras.lateNight} onToggle={() => toggleExtra('lateNight')} />
        </div>
      </div>

      {/* Preview */}
      <div style={S.panel}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.1em', marginBottom: preview.length ? 10 : 0 }}>
          TONIGHT'S EFFECTS
        </p>
        {preview.length === 0 && (
          <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic' }}>
            Tap "Preview" to see what tonight generates.
          </p>
        )}
        {preview.map(effectKey => {
          const def = EFFECT_DEFS[effectKey]
          if (!def) return null
          const isBuff = def.type === 'buff'
          return (
            <div key={effectKey} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{def.icon}</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: isBuff ? '#3d9e5a' : '#c05050', flex: 1 }}>{def.name}</span>
              <span style={{
                fontSize: 9, fontFamily: 'Cinzel, serif', padding: '2px 8px', borderRadius: 20,
                background: def.nextDay ? 'rgba(61,46,16,0.4)' : isBuff ? 'rgba(26,74,42,0.3)' : 'rgba(80,16,16,0.3)',
                color: def.nextDay ? '#8a6e30' : isBuff ? '#3d9e5a' : '#c05050',
              }}>{def.nextDay ? 'On morrow' : isBuff ? 'Boon' : 'Affliction'}</span>
            </div>
          )
        })}
        <button onClick={buildPreview} style={{
          marginTop: preview.length ? 8 : 0, padding: '7px 0', width: '100%', borderRadius: 8,
          fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer',
          background: 'transparent', border: '1px solid #3d2e10', color: '#5a4520',
        }}>↺ Refresh Preview</button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setStep(1)} style={{ ...S.btn, background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28', flex: '0 0 80px' }}>← Back</button>
        <button onClick={handleSubmit} disabled={saving} style={{ ...S.btn, flex: 1, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Sealing the day…' : 'Seal the Day ✦'}
        </button>
      </div>
    </div>
  )
}
