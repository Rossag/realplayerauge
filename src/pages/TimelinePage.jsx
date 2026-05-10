import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { format, isToday, isYesterday } from 'date-fns'

const EVENT_META = {
  sleep:    { icon: '🌙', label: 'Sleep',       unit: 'hrs',     colour: '#4a70c0' },
  alcohol:  { icon: '🍺', label: 'Alcohol',      unit: 'drinks',  colour: '#c05030' },
  exercise: { icon: '⚔️', label: 'Training',     unit: 'mins',    colour: '#c05030' },
  rest_day: { icon: '🛌', label: 'Rest day',     unit: null,      colour: '#8060c0' },
  meal:     { icon: '🍖', label: 'Good meal',    unit: 'meals',   colour: '#3d9e5a' },
  junk:     { icon: '🍔', label: 'Junk food',    unit: 'meals',   colour: '#8a6e30' },
  water:    { icon: '💧', label: 'Water',        unit: 'glasses', colour: '#4a70c0' },
  caffeine: { icon: '☕', label: 'Caffeine',     unit: 'cups',    colour: '#c9a84c' },
  social:   { icon: '🤝', label: 'Fellowship',   unit: null,      colour: '#c06080' },
  recharge: { icon: '🔋', label: 'Solitude',     unit: null,      colour: '#8060c0' },
  sunlight: { icon: '☀️', label: 'Sunlight',     unit: 'mins',    colour: '#c9a84c' },
  stress:   { icon: '💀', label: 'Dark times',   unit: null,      colour: '#8b1a1a' },
}

function dayLabel(date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, d MMMM')
}

export default function TimelinePage() {
  const { session } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    supabase.from('events').select('*')
      .eq('user_id', session.user.id)
      .order('logged_at', { ascending: false })
      .limit(80)
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
  }, [session])

  // Group events by day
  const grouped = {}
  events.forEach(e => {
    const d = new Date(e.logged_at || e.created_at)
    const key = d.toDateString()
    if (!grouped[key]) grouped[key] = { date: d, events: [] }
    grouped[key].events.push(e)
  })

  return (
    <div style={{ background: '#0d0a06', minHeight: '100%', padding: '20px 16px 24px', fontFamily: 'Crimson Pro, Georgia, serif' }}>
      <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 }}>Chronicle</h1>
      <p style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 }}>Your recent deeds and misfortunes</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 20, height: 20, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px solid #3d2e10', borderRadius: 12 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📜</p>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#8a6e30' }}>The chronicle is empty</p>
          <p style={{ fontSize: 14, color: '#4a3e28', fontStyle: 'italic', marginTop: 6 }}>Log an event to begin your tale</p>
        </div>
      ) : (
        Object.values(grouped).map(({ date, events: dayEvents }) => (
          <div key={date.toDateString()} style={{ marginBottom: 20 }}>
            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(to right, transparent, #3d2e10)' }} />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a4520', letterSpacing: '0.1em' }}>
                {dayLabel(date).toUpperCase()}
              </span>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(to left, transparent, #3d2e10)' }} />
            </div>

            {/* Day events */}
            {dayEvents.map(event => {
              const meta = EVENT_META[event.type] || { icon: '📋', label: event.type, unit: null, colour: '#8a6e30' }
              return (
                <div key={event.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(19,16,10,0.8)', border: '1px solid #3d2e10',
                  borderLeft: `3px solid ${meta.colour}44`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                }}>
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#d4bc8a' }}>
                      {meta.label}
                      {meta.unit && event.value && (
                        <span style={{ color: meta.colour, marginLeft: 8, fontWeight: 600 }}>
                          {event.value} {meta.unit}
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>
                      {format(new Date(event.logged_at || event.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
