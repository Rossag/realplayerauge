import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { format } from 'date-fns'

const EVENT_META = {
  sleep:    { icon: '🌙', label: 'Sleep',        unit: 'hrs' },
  alcohol:  { icon: '🍺', label: 'Alcohol',       unit: 'drinks' },
  exercise: { icon: '⚔️', label: 'Training',      unit: 'mins' },
  rest_day: { icon: '🛌', label: 'Rest day',      unit: null },
  meal:     { icon: '🍖', label: 'Good meal',     unit: 'meals' },
  junk:     { icon: '🍔', label: 'Junk food',     unit: 'meals' },
  water:    { icon: '💧', label: 'Water',         unit: 'glasses' },
  caffeine: { icon: '☕', label: 'Caffeine',      unit: 'cups' },
  social:   { icon: '🤝', label: 'Fellowship',    unit: null },
  recharge: { icon: '🔋', label: 'Solitude',      unit: null },
  sunlight: { icon: '☀️', label: 'Sunlight',      unit: 'mins' },
  stress:   { icon: '💀', label: 'Dark times',    unit: null },
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
      .limit(60)
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
  }, [session])

  const S = {
    page:  { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 24px', fontFamily: 'Crimson Pro, Georgia, serif' },
    title: { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
    sub:   { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 },
  }

  return (
    <div style={S.page}>
      <h1 style={S.title}>Chronicle</h1>
      <p style={S.sub}>Your recent deeds and misfortunes</p>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(event => {
            const meta = EVENT_META[event.type] || { icon: '📋', label: event.type, unit: null }
            return (
              <div key={event.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(19,16,10,0.8)', border: '1px solid #3d2e10',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#d4bc8a' }}>
                    {meta.label}
                    {meta.unit && (
                      <span style={{ color: '#c9a84c', marginLeft: 8, fontWeight: 600 }}>
                        {event.value} {meta.unit}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>
                    {format(new Date(event.logged_at || event.created_at), 'EEE d MMM · HH:mm')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
