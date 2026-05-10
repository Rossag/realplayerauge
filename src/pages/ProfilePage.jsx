import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import NotificationSettingsPage from './NotificationSettingsPage.jsx'
import { useNavigate } from 'react-router-dom'

const S = {
  page:  { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 24px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title: { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:   { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 24 },
  panel: { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.1em', color: '#5a4520', marginBottom: 8, display: 'block' },
  input: { width: '100%', background: 'rgba(13,10,6,0.9)', border: '1px solid #3d2e10', borderRadius: 8, padding: '10px 14px', fontSize: 15, color: '#d4bc8a', outline: 'none', boxSizing: 'border-box', fontFamily: 'Crimson Pro, serif' },
}

export default function ProfilePage() {
  const { session, profile, signOut, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername]   = useState(profile?.username || '')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [stats, setStats]         = useState({ totalEvents: 0, totalDays: 0, logStreak: 0, guildName: null })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (session) loadStats()
  }, [session])

  async function loadStats() {
    setLoadingStats(true)
    try {
      // All events
      const { data: events } = await supabase
        .from('events').select('logged_at')
        .eq('user_id', session.user.id)
        .order('logged_at', { ascending: false })

      const totalEvents = events?.length || 0
      const days = new Set((events || []).map(e => new Date(e.logged_at).toDateString()))
      const totalDays = days.size

      // Log streak
      let logStreak = 0
      const today = new Date()
      for (let i = 0; i < 60; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        if (days.has(d.toDateString())) logStreak++
        else break
      }

      // Guild name
      const { data: mem } = await supabase
        .from('guild_members').select('guild_id').eq('user_id', session.user.id).maybeSingle()
      let guildName = null
      if (mem) {
        const { data: guild } = await supabase
          .from('guilds').select('name').eq('id', mem.guild_id).single()
        guildName = guild?.name || null
      }

      setStats({ totalEvents, totalDays, logStreak, guildName })
    } catch (e) {
      console.error('Profile stats error:', e)
    }
    setLoadingStats(false)
  }

  if (showNotifs) return <NotificationSettingsPage onBack={() => setShowNotifs(false)} />

  async function saveUsername() {
    if (!username.trim()) return
    setSaving(true)
    await supabase.from('users').upsert({ id: session.user.id, username: username.trim() })
    await fetchProfile(session.user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const statCards = [
    { label: 'Log streak',    value: stats.logStreak > 0 ? `${stats.logStreak}d` : '—',    gold: stats.logStreak >= 7 },
    { label: 'Days tracked',  value: stats.totalDays > 0 ? stats.totalDays : '—',           gold: stats.totalDays >= 30 },
    { label: 'Events logged', value: stats.totalEvents > 0 ? stats.totalEvents : '—',       gold: stats.totalEvents >= 100 },
    { label: 'Guild',         value: stats.guildName || '—',                                 gold: !!stats.guildName, small: true },
  ]

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={S.title}>Adventurer Profile</h1>
          <p style={{ fontSize: 14, color: '#7a6a4a', fontStyle: 'italic' }}>{session?.user?.email}</p>
        </div>
        <button onClick={() => setShowNotifs(true)} style={{ width: 40, height: 40, borderRadius: 10, cursor: 'pointer', background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          🔔
        </button>
      </div>

      {/* Identity */}
      <div style={S.panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, fontSize: 28, background: 'rgba(61,46,16,0.4)', border: '1px solid #5a4520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚔️</div>
          <div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c9a84c', fontWeight: 600 }}>
              {profile?.username || 'Unnamed Adventurer'}
            </p>
            <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginTop: 3 }}>
              {stats.guildName ? `Guild: ${stats.guildName}` : 'No guild'}
            </p>
          </div>
        </div>
        <label style={S.label}>ADVENTURER NAME</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Choose your name…" style={{ ...S.input, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && saveUsername()} />
          <button onClick={saveUsername} disabled={saving} style={{ padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30', color: saved ? '#3d9e5a' : '#c9a84c', opacity: saving ? 0.6 : 1 }}>
            {saved ? '✓' : saving ? '…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.panel}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.12em', color: '#5a4520', marginBottom: 14 }}>HALL OF RECORDS</p>
        {loadingStats ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: 18, height: 18, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {statCards.map(stat => (
              <div key={stat.label} style={{ background: 'rgba(13,10,6,0.7)', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a1e08' }}>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: stat.small ? 13 : 20, fontWeight: 700, color: stat.gold ? '#c9a84c' : '#d4bc8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 3 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={S.panel}>
        <button onClick={() => navigate('/insights')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid rgba(61,46,16,0.3)', marginBottom: 10, paddingBottom: 10 }}>
          <span style={{ fontSize: 20 }}>🔮</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#c9a84c' }}>Insights</p>
            <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>Seven-day trends and pattern analysis</p>
          </div>
          <span style={{ color: '#3d2e10', fontSize: 16 }}>›</span>
        </button>
        <button onClick={() => setShowNotifs(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#c9a84c' }}>Dispatch Preferences</p>
            <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>Configure notifications and quiet hours</p>
          </div>
          <span style={{ color: '#3d2e10', fontSize: 16 }}>›</span>
        </button>
      </div>

      {/* Sign out */}
      <button onClick={signOut} style={{ width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: '0.08em', background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28' }}>
        Leave the Realm
      </button>
    </div>
  )
}
