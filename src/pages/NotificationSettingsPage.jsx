import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { loadNotifPrefs, saveNotifPrefs, DEFAULT_PREFS, requestPermission, isInDND } from '../lib/notifications.js'

const S = {
  page:    { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 32px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title:   { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:     { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 24 },
  panel:   { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: '14px 16px', marginBottom: 14 },
  panelTitle: { fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5a4520', marginBottom: 12 },
  row:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid rgba(61,46,16,0.4)' },
  rowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  rowLabel:{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#c9a84c', flex: 1 },
  rowDesc: { fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 },
  timeRow: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid rgba(61,46,16,0.4)' },
  timeLabel: { fontFamily: 'Cinzel, serif', fontSize: 11, color: '#8a6e30', minWidth: 90 },
  timeInput: { background: 'rgba(13,10,6,0.9)', border: '1px solid #3d2e10', borderRadius: 8, padding: '6px 10px', fontSize: 14, color: '#d4bc8a', outline: 'none', fontFamily: 'Crimson Pro, serif', colorScheme: 'dark' },
  savedMsg: { fontFamily: 'Cinzel, serif', fontSize: 11, color: '#3d9e5a', textAlign: 'center', marginTop: 12, letterSpacing: '0.08em' },
  permBtn: { width: '100%', padding: '12px 0', borderRadius: 10, fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30', color: '#c9a84c', cursor: 'pointer', marginBottom: 14 },
  inDNDBox:{ background: 'rgba(61,46,16,0.2)', border: '1px solid #5a4520', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 },
}

// ── Fantasy toggle switch ──
function Toggle({ on, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, padding: 2, cursor: disabled ? 'default' : 'pointer',
        background: on ? 'rgba(45,110,66,0.6)' : 'rgba(61,46,16,0.4)',
        border: `1px solid ${on ? 'rgba(61,158,90,0.5)' : '#3d2e10'}`,
        display: 'flex', alignItems: 'center', transition: 'all 0.2s',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', transition: 'all 0.2s',
        background: on ? '#3d9e5a' : '#3d2e10',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        boxShadow: on ? '0 0 6px rgba(61,158,90,0.4)' : 'none',
      }} />
    </div>
  )
}

// ── Section with rows ──
function SettingsSection({ title, children }) {
  return (
    <div style={S.panel}>
      {title && <p style={S.panelTitle}>{title}</p>}
      {children}
    </div>
  )
}

function SettingsRow({ label, desc, on, onChange, disabled, last }) {
  return (
    <div style={last ? S.rowLast : S.row}>
      <div style={{ flex: 1, paddingRight: 12 }}>
        <p style={S.rowLabel}>{label}</p>
        {desc && <p style={S.rowDesc}>{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  )
}

export default function NotificationSettingsPage({ onBack }) {
  const { session } = useAuth()
  const [prefs, setPrefs]       = useState(null)
  const [saved, setSaved]       = useState(false)
  const [permission, setPermission] = useState(Notification?.permission || 'default')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!session) return
    loadNotifPrefs(session.user.id).then(p => { setPrefs(p); setLoading(false) })
  }, [session])

  async function handlePermission() {
    const granted = await requestPermission()
    setPermission(granted ? 'granted' : 'denied')
  }

  function update(key, val) {
    setPrefs(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    if (!session || !prefs) return
    await saveNotifPrefs(session.user.id, prefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading || !prefs) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const inDND = isInDND(prefs)

  return (
    <div style={S.page}>

      {/* Back button */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a4520', letterSpacing: '0.08em', marginBottom: 12, padding: 0 }}>
        ← Back to Profile
      </button>

      <h1 style={S.title}>Dispatches</h1>
      <p style={S.sub}>Configure your notification vigil</p>

      {/* Permission banner */}
      {permission !== 'granted' && (
        <button onClick={handlePermission} style={S.permBtn}>
          {permission === 'denied'
            ? '⚠️ Notifications Blocked — Enable in Browser Settings'
            : '🔔 Grant Notification Permission'}
        </button>
      )}

      {/* DND active banner */}
      {inDND && (
        <div style={S.inDNDBox}>
          <span style={{ fontSize: 20 }}>🌙</span>
          <div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#8a6e30' }}>Quiet Vigil Active</p>
            <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>
              Dispatches are held until your watch ends.
            </p>
          </div>
        </div>
      )}

      {/* Master toggle */}
      <SettingsSection>
        <SettingsRow
          label="Enable Dispatches"
          desc="Master switch for all notifications"
          on={prefs.master}
          onChange={v => update('master', v)}
          last
        />
      </SettingsSection>

      {/* Silent mode quick toggle */}
      <SettingsSection>
        <SettingsRow
          label="Silent Vigil"
          desc="Notifications queue but do not sound — visible in app only"
          on={prefs.silent_mode}
          onChange={v => update('silent_mode', v)}
          disabled={!prefs.master}
          last
        />
      </SettingsSection>

      {/* Personal notifications */}
      <SettingsSection title="PERSONAL DISPATCHES">
        <SettingsRow
          label="Debuff Alerts"
          desc="Morning warnings for carry-over afflictions"
          on={prefs.personal_debuff_alerts}
          onChange={v => update('personal_debuff_alerts', v)}
          disabled={!prefs.master}
        />
        <SettingsRow
          label="Health Nudges"
          desc="Hydration, nutrition, caffeine curfew reminders"
          on={prefs.personal_health_nudges}
          onChange={v => update('personal_health_nudges', v)}
          disabled={!prefs.master}
        />
        <SettingsRow
          label="Streak Praise"
          desc="Milestone messages when your streaks reach 3, 7, 14, 30 days"
          on={prefs.personal_streak_praise}
          onChange={v => update('personal_streak_praise', v)}
          disabled={!prefs.master}
        />
        <SettingsRow
          label="Recovery Tips"
          desc="Contextual advice when debuffs are active"
          on={prefs.personal_recovery_tips}
          onChange={v => update('personal_recovery_tips', v)}
          disabled={!prefs.master}
          last
        />
      </SettingsSection>

      {/* Guild notifications */}
      <SettingsSection title="GUILD DISPATCHES — OPT IN">
        <div style={{ background: 'rgba(61,46,16,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', lineHeight: 1.5 }}>
            These are off by default. Your allies' data is handled with discretion — guild notifications require their opt-in too.
          </p>
        </div>
        <SettingsRow
          label="Friend Check-ins"
          desc="Nudge when an ally has been afflicted for 2+ days"
          on={prefs.guild_friend_checkins}
          onChange={v => update('guild_friend_checkins', v)}
          disabled={!prefs.master}
        />
        <SettingsRow
          label="Party Events"
          desc="Whole-guild hangovers, silent chronicles, streak leaders"
          on={prefs.guild_party_events}
          onChange={v => update('guild_party_events', v)}
          disabled={!prefs.master}
        />
        <SettingsRow
          label="Guild Chat Pings"
          desc="Alert when someone speaks in the guild hall"
          on={prefs.guild_chat_pings}
          onChange={v => update('guild_chat_pings', v)}
          disabled={!prefs.master}
        />
        <SettingsRow
          label="Daily Digest"
          desc="One summary of guild activity each morning instead of individual pings"
          on={prefs.guild_daily_digest}
          onChange={v => update('guild_daily_digest', v)}
          disabled={!prefs.master}
          last
        />
      </SettingsSection>

      {/* Quiet hours */}
      <SettingsSection title="QUIET HOURS">
        <SettingsRow
          label="Enable Quiet Hours"
          desc="Silence dispatches during your rest window"
          on={prefs.dnd_enabled}
          onChange={v => update('dnd_enabled', v)}
          disabled={!prefs.master}
        />

        {prefs.dnd_enabled && (
          <>
            <div style={{ marginTop: 12, marginBottom: 4 }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#3d2e10', letterSpacing: '0.1em', marginBottom: 8 }}>WEEKDAYS</p>
              <div style={S.timeRow}>
                <span style={S.timeLabel}>Silence from</span>
                <input type="time" value={prefs.dnd_weekday_start} onChange={e => update('dnd_weekday_start', e.target.value)} style={S.timeInput} />
                <span style={{ fontSize: 13, color: '#4a3e28' }}>until</span>
                <input type="time" value={prefs.dnd_weekday_end} onChange={e => update('dnd_weekday_end', e.target.value)} style={S.timeInput} />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#3d2e10', letterSpacing: '0.1em', marginBottom: 8 }}>WEEKENDS</p>
              <div style={{ ...S.timeRow, borderBottom: 'none' }}>
                <span style={S.timeLabel}>Silence from</span>
                <input type="time" value={prefs.dnd_weekend_start} onChange={e => update('dnd_weekend_start', e.target.value)} style={S.timeInput} />
                <span style={{ fontSize: 13, color: '#4a3e28' }}>until</span>
                <input type="time" value={prefs.dnd_weekend_end} onChange={e => update('dnd_weekend_end', e.target.value)} style={S.timeInput} />
              </div>
            </div>
          </>
        )}
      </SettingsSection>

      {/* Save button */}
      <button onClick={handleSave} style={{
        width: '100%', padding: '13px 0', borderRadius: 10, cursor: 'pointer',
        fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
        background: saved ? 'rgba(26,74,42,0.3)' : 'rgba(61,46,16,0.8)',
        border: `1px solid ${saved ? 'rgba(45,110,66,0.6)' : '#8a6e30'}`,
        color: saved ? '#3d9e5a' : '#c9a84c',
        transition: 'all 0.2s',
      }}>
        {saved ? '✦ Preferences Saved' : 'Save Preferences'}
      </button>

      {saved && (
        <p style={S.savedMsg}>Your vigil preferences have been recorded.</p>
      )}

    </div>
  )
}
