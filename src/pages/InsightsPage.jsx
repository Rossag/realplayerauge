import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { EFFECT_DEFS, STAT_COLOURS, STAT_LABELS, BASE_STATS } from '../lib/engine.js'
import { format, subDays, startOfDay, endOfDay, addDays } from 'date-fns'

const S = {
  page:  { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 32px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title: { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:   { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 },
  panel: { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: '14px 16px', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.14em', color: '#5a4520', marginBottom: 12 },
  divider: { height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', margin: '12px 0' },
}

// ── 7-day sparkline bar chart ──
function StatSparkline({ days, stat }) {
  const colour = STAT_COLOURS[stat]
  const values = days.map(d => d.stats[stat] ?? 50)
  const max = 100

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%', borderRadius: 2,
            height: `${Math.max(4, (v / max) * 36)}px`,
            background: v >= 60 ? colour : v >= 40 ? `${colour}99` : `${colour}44`,
            transition: 'height 0.4s ease',
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Stat trend row ──
function StatTrendRow({ stat, days }) {
  const colour = STAT_COLOURS[stat]
  const values = days.map(d => d.stats[stat] ?? 50)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  const trend = values[values.length - 1] - values[0]

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: colour, letterSpacing: '0.06em' }}>
          {STAT_LABELS[stat]}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#7a6a4a', fontStyle: 'italic' }}>avg {avg}</span>
          <span style={{
            fontSize: 11, fontFamily: 'Cinzel, serif', padding: '1px 7px', borderRadius: 20,
            background: trend > 3 ? 'rgba(26,74,42,0.3)' : trend < -3 ? 'rgba(80,16,16,0.3)' : 'rgba(61,46,16,0.2)',
            color: trend > 3 ? '#3d9e5a' : trend < -3 ? '#c05050' : '#8a6e30',
          }}>
            {trend > 0 ? `↑ +${trend}` : trend < 0 ? `↓ ${trend}` : '→ stable'}
          </span>
        </div>
      </div>
      <StatSparkline days={days} stat={stat} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        {days.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: '#3d2e10', fontFamily: 'Cinzel, serif' }}>
            {format(d.date, 'EEE')}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Effect frequency pill ──
function EffectPill({ effectKey, count, type }) {
  const def = EFFECT_DEFS[effectKey]
  if (!def) return null
  const isBuff = type === 'buff'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 8, marginBottom: 6,
      background: isBuff ? 'rgba(26,74,42,0.2)' : 'rgba(80,16,16,0.2)',
      border: `1px solid ${isBuff ? 'rgba(45,110,66,0.3)' : 'rgba(120,30,30,0.3)'}`,
    }}>
      <span style={{ fontSize: 16 }}>{def.icon}</span>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: isBuff ? '#3d9e5a' : '#c05050', flex: 1 }}>
        {def.name}
      </span>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#8a6e30' }}>{count}×</span>
    </div>
  )
}

export default function InsightsPage() {
  const { session } = useAuth()
  const [loading, setLoading]       = useState(true)
  const [days, setDays]             = useState([])        // 7 days of computed stats
  const [topBuffs, setTopBuffs]     = useState([])
  const [topDebuffs, setTopDebuffs] = useState([])
  const [streaks, setStreaks]        = useState({ log: 0, sleep: 0, totalEvents: 0, totalDays: 0 })
  const [bestDay, setBestDay]        = useState(null)
  const [worstDay, setWorstDay]      = useState(null)
  const [forecast, setForecast]      = useState([])
  const [activeNow, setActiveNow]    = useState([])
  const [patterns, setPatterns]      = useState([])

  useEffect(() => {
    if (session) loadInsights()
  }, [session])

  async function loadInsights() {
    setLoading(true)
    const now = new Date()

    // ── Today's active effects (started, not yet expired) ──
    const { data: currentEffects } = await supabase
      .from('active_effects').select('*')
      .eq('user_id', session.user.id)
      .lte('starts_at', now.toISOString())
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: true })
    setActiveNow(currentEffects || [])

    // ── Forecast — effects scheduled to start tonight or tomorrow ──
    const tomorrowEnd = endOfDay(addDays(now, 1)).toISOString()
    const { data: pendingEffects } = await supabase
      .from('active_effects').select('*')
      .eq('user_id', session.user.id)
      .gt('starts_at', now.toISOString())
      .lte('starts_at', tomorrowEnd)
      .order('starts_at', { ascending: true })
    setForecast(pendingEffects || [])

    // ── Build 7-day stat history ──
    const dayData = []
    for (let i = 6; i >= 0; i--) {
      const date    = subDays(now, i)
      const dayEnd  = endOfDay(date).toISOString()
      const dayStart = startOfDay(date).toISOString()

      // Effects that were active during this day
      const { data: effects } = await supabase
        .from('active_effects').select('stat_deltas, effect_key')
        .eq('user_id', session.user.id)
        .lte('starts_at', dayEnd)
        .gt('expires_at', dayStart)

      // Compute stats for that day
      const stats = { ...BASE_STATS }
      ;(effects || []).forEach(e => {
        Object.entries(e.stat_deltas || {}).forEach(([k, v]) => {
          if (stats[k] !== undefined) stats[k] = Math.min(100, Math.max(0, stats[k] + v))
        })
      })

      dayData.push({ date, stats, effects: effects || [] })
    }
    setDays(dayData)

    // ── Best and worst days ──
    const scored = dayData.map(d => ({
      date: d.date,
      score: Object.values(d.stats).reduce((a, b) => a + b, 0),
    }))
    const best  = scored.reduce((a, b) => a.score > b.score ? a : b)
    const worst = scored.reduce((a, b) => a.score < b.score ? a : b)
    setBestDay(best)
    setWorstDay(worst)

    // ── Effect frequency over last 30 days ──
    const since30 = subDays(now, 30).toISOString()
    const { data: allEffects } = await supabase
      .from('active_effects').select('effect_key')
      .eq('user_id', session.user.id)
      .gte('created_at', since30)

    const freq = {}
    ;(allEffects || []).forEach(e => { freq[e.effect_key] = (freq[e.effect_key] || 0) + 1 })

    const buffFreq   = Object.entries(freq).filter(([k]) => EFFECT_DEFS[k]?.type === 'buff').sort((a,b) => b[1]-a[1]).slice(0, 4)
    const debuffFreq = Object.entries(freq).filter(([k]) => EFFECT_DEFS[k]?.type === 'debuff').sort((a,b) => b[1]-a[1]).slice(0, 4)
    setTopBuffs(buffFreq)
    setTopDebuffs(debuffFreq)

    // ── Streaks ──
    const { data: allEvents } = await supabase
      .from('events').select('logged_at')
      .eq('user_id', session.user.id)
      .order('logged_at', { ascending: false })
      .limit(100)

    const logDays = new Set((allEvents || []).map(e => new Date(e.logged_at).toDateString()))
    let logStreak = 0
    for (let i = 0; i < 60; i++) {
      const d = subDays(now, i)
      if (logDays.has(d.toDateString())) logStreak++
      else break
    }

    // Sleep streak
    const { data: sleepEffects } = await supabase
      .from('active_effects').select('created_at')
      .eq('user_id', session.user.id)
      .eq('effect_key', 'well_rested')
      .order('created_at', { ascending: false })
      .limit(20)

    const sleepDays = new Set((sleepEffects || []).map(e => new Date(e.created_at).toDateString()))
    let sleepStreak = 0
    for (let i = 0; i < 14; i++) {
      const d = subDays(now, i)
      if (sleepDays.has(d.toDateString())) sleepStreak++
      else break
    }

    setStreaks({
      log: logStreak,
      sleep: sleepStreak,
      totalEvents: allEvents?.length || 0,
      totalDays: logDays.size,
    })

    // ── Pattern analysis — look for recurring habits ──
    const since30days = subDays(now, 30).toISOString()
    const { data: recentEvents } = await supabase
      .from('events').select('type, value, logged_at')
      .eq('user_id', session.user.id)
      .gte('logged_at', since30days)

    const foundPatterns = []

    if (recentEvents?.length) {
      // Weekend drinking pattern
      const weekendDrinks = recentEvents.filter(e => {
        const day = new Date(e.logged_at).getDay()
        return e.type === 'alcohol' && (day === 5 || day === 6)
      })
      if (weekendDrinks.length >= 3) {
        foundPatterns.push({
          icon: '🍺',
          type: 'warning',
          title: 'Weekend Revelry Pattern',
          desc: `You've logged alcohol on ${weekendDrinks.length} weekend nights this month. Expect Sunday and Monday debuffs.`,
        })
      }

      // Late caffeine pattern
      const lateCaffeine = recentEvents.filter(e => {
        const hour = new Date(e.logged_at).getHours()
        return e.type === 'caffeine' && hour >= 15
      })
      if (lateCaffeine.length >= 4) {
        foundPatterns.push({
          icon: '☕',
          type: 'warning',
          title: 'Late Stimulant Habit',
          desc: `Caffeine logged after 3pm on ${lateCaffeine.length} occasions this month. This is disrupting your sleep quality.`,
        })
      }

      // Low water intake pattern
      const waterDays = new Set(recentEvents.filter(e => e.type === 'water').map(e => new Date(e.logged_at).toDateString()))
      const loggedDaysCount = new Set(recentEvents.map(e => new Date(e.logged_at).toDateString())).size
      if (loggedDaysCount >= 7 && waterDays.size < loggedDaysCount * 0.4) {
        foundPatterns.push({
          icon: '💧',
          type: 'warning',
          title: 'Persistent Dehydration',
          desc: `Water only logged on ${waterDays.size} of your ${loggedDaysCount} tracked days. The Thirsty debuff is a regular companion.`,
        })
      }

      // Junk food pattern
      const junkDays = recentEvents.filter(e => e.type === 'junk')
      if (junkDays.length >= 6) {
        foundPatterns.push({
          icon: '🍔',
          type: 'warning',
          title: 'Poor Nutrition Streak',
          desc: `Junk food logged ${junkDays.length} times this month. Food Coma is a regular affliction — consider more balanced meals.`,
        })
      }

      // Good sleep pattern — positive
      const goodSleepCount = recentEvents.filter(e => e.type === 'sleep' && parseFloat(e.value) >= 7).length
      if (goodSleepCount >= 12) {
        foundPatterns.push({
          icon: '🌙',
          type: 'positive',
          title: 'Disciplined Rest',
          desc: `Good sleep logged ${goodSleepCount} times this month. Your Recovery and Focus stats benefit greatly from this habit.`,
        })
      }

      // Regular exercise pattern — positive
      const exerciseDays = new Set(recentEvents.filter(e => e.type === 'exercise').map(e => new Date(e.logged_at).toDateString()))
      if (exerciseDays.size >= 8) {
        foundPatterns.push({
          icon: '⚔️',
          type: 'positive',
          title: 'Consistent Training',
          desc: `Training logged on ${exerciseDays.size} days this month. Your Strength and Mood stats are building steadily.`,
        })
      }
    }

    setPatterns(foundPatterns)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 22, height: 22, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a4520', letterSpacing: '0.1em' }}>READING THE CHRONICLE…</p>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <h1 style={S.title}>Insights</h1>
      <p style={S.sub}>Seven days of your chronicle, revealed</p>

      {/* ── Records ── */}
      <div style={S.panel}>
        <p style={S.sectionTitle}>✦ HALL OF RECORDS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Log streak',     value: streaks.log > 0 ? `${streaks.log}d` : '—',          colour: streaks.log >= 7 ? '#c9a84c' : '#d4bc8a' },
            { label: 'Sleep streak',   value: streaks.sleep > 0 ? `${streaks.sleep}d` : '—',       colour: streaks.sleep >= 3 ? '#4a70c0' : '#d4bc8a' },
            { label: 'Days tracked',   value: streaks.totalDays > 0 ? streaks.totalDays : '—',     colour: '#d4bc8a' },
            { label: 'Events logged',  value: streaks.totalEvents > 0 ? streaks.totalEvents : '—', colour: '#d4bc8a' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(13,10,6,0.7)', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a1e08' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: stat.colour }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 3 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Best / worst days ── */}
      {bestDay && worstDay && bestDay.score !== worstDay.score && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ PEAK AND NADIR</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(26,74,42,0.2)', border: '1px solid rgba(45,110,66,0.3)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#3d9e5a', letterSpacing: '0.08em', marginBottom: 4 }}>FINEST DAY</p>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#c9a84c' }}>{format(bestDay.date, 'EEE d MMM')}</p>
              <p style={{ fontSize: 12, color: '#3d9e5a', fontStyle: 'italic', marginTop: 3 }}>Score {bestDay.score}</p>
            </div>
            <div style={{ background: 'rgba(80,16,16,0.2)', border: '1px solid rgba(120,30,30,0.3)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#c05050', letterSpacing: '0.08em', marginBottom: 4 }}>DARKEST DAY</p>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#c9a84c' }}>{format(worstDay.date, 'EEE d MMM')}</p>
              <p style={{ fontSize: 12, color: '#c05050', fontStyle: 'italic', marginTop: 3 }}>Score {worstDay.score}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Today's effect timeline ── */}
      {activeNow.length > 0 && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ ACTIVE TODAY</p>
          {activeNow.map(e => {
            const def = EFFECT_DEFS[e.effect_key]
            if (!def) return null
            const isBuff = def.type === 'buff'
            const hoursLeft = Math.max(0, (new Date(e.expires_at) - new Date()) / 3600000)
            const timeLabel = hoursLeft < 1
              ? `Clears in ${Math.round(hoursLeft * 60)}m`
              : `Clears in ${Math.round(hoursLeft)}h`
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(61,46,16,0.3)',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{def.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: isBuff ? '#3d9e5a' : '#c05050' }}>{def.name}</p>
                  <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 1 }}>
                    {Object.entries(e.stat_deltas || {}).map(([k,v]) => `${v>0?'+':''}${v} ${STAT_LABELS[k]}`).join(' · ')}
                  </p>
                </div>
                <p style={{ fontSize: 11, color: '#5a4520', fontFamily: 'Cinzel, serif', flexShrink: 0 }}>{timeLabel}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Forecast ── */}
      {forecast.length > 0 && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ INCOMING EFFECTS</p>
          <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 10 }}>
            These afflictions are already scheduled based on what you logged today.
          </p>
          {forecast.map(e => {
            const def = EFFECT_DEFS[e.effect_key]
            if (!def) return null
            const isBuff = def.type === 'buff'
            const startsAt = new Date(e.starts_at)
            const hoursUntil = Math.max(0, (startsAt - new Date()) / 3600000)
            const whenLabel = hoursUntil < 1
              ? 'Starts very soon'
              : hoursUntil < 6
              ? `Starts in ${Math.round(hoursUntil)}h`
              : `Starts ${format(startsAt, 'EEE HH:mm')}`
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 8,
                background: isBuff ? 'rgba(26,74,42,0.15)' : 'rgba(80,16,16,0.15)',
                border: `1px solid ${isBuff ? 'rgba(45,110,66,0.25)' : 'rgba(120,30,30,0.25)'}`,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{def.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: isBuff ? '#3d9e5a' : '#c05050' }}>{def.name}</p>
                  <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 1 }}>
                    {Object.entries(e.stat_deltas || {}).map(([k,v]) => `${v>0?'+':''}${v} ${STAT_LABELS[k]}`).join(' · ')}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    fontFamily: 'Cinzel, serif', fontSize: 9, padding: '2px 8px', borderRadius: 20,
                    background: isBuff ? 'rgba(26,74,42,0.3)' : 'rgba(80,16,16,0.3)',
                    color: isBuff ? '#3d9e5a' : '#c05050',
                    display: 'block', marginBottom: 3,
                  }}>{isBuff ? 'Boon' : 'Affliction'}</span>
                  <p style={{ fontSize: 10, color: '#5a4520' }}>{whenLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pattern warnings ── */}
      {patterns.length > 0 && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ PATTERNS DETECTED</p>
          {patterns.map((p, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '10px 0',
              borderBottom: i < patterns.length - 1 ? '1px solid rgba(61,46,16,0.3)' : 'none',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
              <div>
                <p style={{
                  fontFamily: 'Cinzel, serif', fontSize: 12,
                  color: p.type === 'positive' ? '#3d9e5a' : '#c9a84c',
                  marginBottom: 3,
                }}>{p.title}</p>
                <p style={{ fontSize: 13, color: '#7a6a4a', fontStyle: 'italic', lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 7-day stat trends ── */}
      {days.length > 0 && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ SEVEN-DAY STAT TRENDS</p>
          {Object.keys(STAT_COLOURS).map(stat => (
            <StatTrendRow key={stat} stat={stat} days={days} />
          ))}
        </div>
      )}

      {/* ── Most common effects ── */}
      {(topBuffs.length > 0 || topDebuffs.length > 0) && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ MOST COMMON EFFECTS (30 DAYS)</p>
          {topBuffs.length > 0 && (
            <>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#3d9e5a', letterSpacing: '0.08em', marginBottom: 8 }}>FREQUENT BOONS</p>
              {topBuffs.map(([key, count]) => <EffectPill key={key} effectKey={key} count={count} type="buff" />)}
            </>
          )}
          {topBuffs.length > 0 && topDebuffs.length > 0 && <div style={S.divider} />}
          {topDebuffs.length > 0 && (
            <>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#c05050', letterSpacing: '0.08em', marginBottom: 8, marginTop: topBuffs.length > 0 ? 0 : 0 }}>FREQUENT AFFLICTIONS</p>
              {topDebuffs.map(([key, count]) => <EffectPill key={key} effectKey={key} count={count} type="debuff" />)}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {days.every(d => d.effects.length === 0) && (
        <div style={{ textAlign: 'center', padding: '32px 24px', border: '1px solid #3d2e10', borderRadius: 12 }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>📜</p>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#8a6e30' }}>The chronicle is sparse</p>
          <p style={{ fontSize: 14, color: '#4a3e28', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
            Log events for a few days and your insights will begin to emerge.
          </p>
        </div>
      )}
    </div>
  )
}
