import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { computeStats, EFFECT_DEFS, STAT_LABELS, STAT_COLOURS } from '../lib/engine.js'
import { format } from 'date-fns'
import { useShareCard, ShareCard } from '../lib/shareCard.jsx'
import { useNavigate } from 'react-router-dom'
import { EffectIcon, StatIcon } from '../lib/assetIcons.jsx'

// Daily rotating quotes
const QUOTES = [
  "The road is long, but every step forges the legend.",
  "A warrior's strength is measured not in victories, but in rising after defeat.",
  "Rest is not weakness. It is the forge that sharpens the blade.",
  "What you do in the shadows of habit determines who you become in the light.",
  "The body remembers every kindness and every neglect.",
  "Small disciplines, practised daily, become great powers.",
  "Even the mightiest oak began as a seed that refused to quit.",
]

const DAILY_QUOTE = QUOTES[new Date().getDay() % QUOTES.length]

function getMoodAmbience(activeEffects, stats) {
  const debuffKeys = activeEffects.filter(e => EFFECT_DEFS[e.effect_key]?.type === 'debuff').map(e => e.effect_key)
  const buffKeys   = activeEffects.filter(e => EFFECT_DEFS[e.effect_key]?.type === 'buff').map(e => e.effect_key)
  if (debuffKeys.includes('full_hangover'))    return 'hangover'
  if (debuffKeys.includes('sleep_deprived'))   return 'deprived'
  if (debuffKeys.includes('stressed'))         return 'stressed'
  if (stats.energy >= 75 && stats.mood >= 65)  return 'energised'
  if (buffKeys.includes('well_rested'))        return 'rested'
  if (buffKeys.includes('sun_kissed'))         return 'sunny'
  if (buffKeys.includes('post_workout'))       return 'pumped'
  if (buffKeys.includes('connected'))          return 'social'
  if (debuffKeys.length > buffKeys.length)     return 'low'
  return 'neutral'
}

const AMBIENCE = {
  neutral:   { bg: '#0d0a06', glow: null,                         label: null           },
  rested:    { bg: '#080d14', glow: 'rgba(40,80,180,0.15)',       label: 'Well Rested'  },
  energised: { bg: '#0f0b04', glow: 'rgba(200,150,20,0.18)',      label: 'Full Vigour'  },
  sunny:     { bg: '#100e05', glow: 'rgba(220,170,40,0.20)',      label: 'Blessed'      },
  pumped:    { bg: '#0f0604', glow: 'rgba(180,60,20,0.18)',       label: 'Battle Ready' },
  social:    { bg: '#090814', glow: 'rgba(100,70,200,0.15)',      label: 'Inspired'     },
  deprived:  { bg: '#050408', glow: 'rgba(0,0,0,0.5)',            label: 'Exhausted'    },
  hangover:  { bg: '#060809', glow: 'rgba(20,50,15,0.5)',         label: 'Afflicted'    },
  stressed:  { bg: '#090404', glow: 'rgba(80,10,10,0.4)',         label: 'Cursed'       },
  low:       { bg: '#080808', glow: null,                         label: 'Weakened'     },
}

// ── Compass rose — use asset if available, SVG fallback ──
function CompassRose({ size = 220 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="#5a4520" strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r - 8} fill="none" stroke="#3d2e10" strokeWidth="0.5" opacity="0.8" />
      {[0, 90, 180, 270].map(angle => {
        const rad = (angle - 90) * Math.PI / 180
        const x1 = cx + (r - 14) * Math.cos(rad), y1 = cy + (r - 14) * Math.sin(rad)
        const x2 = cx + (r - 4)  * Math.cos(rad), y2 = cy + (r - 4)  * Math.sin(rad)
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8a6e30" strokeWidth="1.5" />
      })}
      {[45, 135, 225, 315].map(angle => {
        const rad = (angle - 90) * Math.PI / 180
        const x1 = cx + (r - 10) * Math.cos(rad), y1 = cy + (r - 10) * Math.sin(rad)
        const x2 = cx + (r - 4)  * Math.cos(rad), y2 = cy + (r - 4)  * Math.sin(rad)
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a4520" strokeWidth="0.8" />
      })}
      <polygon points={`${cx},${cy-r+2} ${cx-5},${cy-r+12} ${cx},${cy-r+10} ${cx+5},${cy-r+12}`} fill="#c9a84c" opacity="0.9" />
      <line x1={cx} y1={cy-r+14} x2={cx} y2={cy+r-14} stroke="#3d2e10" strokeWidth="0.4" opacity="0.5" />
      <line x1={cx-r+14} y1={cy} x2={cx+r-14} y2={cy} stroke="#3d2e10" strokeWidth="0.4" opacity="0.5" />
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2 - Math.PI / 2
        const dx = cx + (r - 4) * Math.cos(angle), dy = cy + (r - 4) * Math.sin(angle)
        return <circle key={i} cx={dx} cy={dy} r={i % 6 === 0 ? 1.5 : 0.8} fill={i % 6 === 0 ? '#8a6e30' : '#3d2e10'} />
      })}
    </svg>
  )
}

// ── Stat orb — with asset icon ──
function StatOrb({ stat, value, style, onHover, onLeave, isHovered }) {
  const colour = STAT_COLOURS[stat]
  const r = 26, circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(100, Math.max(0, value)) / 100)

  return (
    <div
      style={{ position: 'absolute', width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...style }}
      onMouseEnter={() => onHover(stat)} onMouseLeave={onLeave}
      onTouchStart={e => { e.preventDefault(); onHover(stat) }} onTouchEnd={onLeave}
    >
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(30,22,10,0.95) 60%, rgba(61,46,16,0.4) 100%)',
        border: `1px solid ${isHovered ? colour : '#3d2e10'}`,
        boxShadow: isHovered ? `0 0 12px ${colour}66, inset 0 0 8px rgba(0,0,0,0.5)` : 'inset 0 0 8px rgba(0,0,0,0.5)',
        transition: 'all 0.2s',
      }} />
      <svg width="70" height="70" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#2a1e08" strokeWidth="3.5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={colour} strokeWidth="3.5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 4px ${colour}88)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <StatIcon stat={stat} size={18} />
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: colour, lineHeight: 1 }}>{Math.round(value)}</span>
      </div>
    </div>
  )
}

// ── Hourglass timer icon ──
function Hourglass({ hoursLeft }) {
  const pct = Math.min(1, hoursLeft / 24)
  return (
    <svg width="20" height="28" viewBox="0 0 20 28" style={{ flexShrink: 0, opacity: 0.6 }}>
      <path d="M3,2 L17,2 L17,4 L12,10 L12,18 L17,24 L17,26 L3,26 L3,24 L8,18 L8,10 L3,4 Z"
        fill="none" stroke="#5a4520" strokeWidth="1" strokeLinejoin="round" />
      {/* Sand top */}
      <polygon points={`4,4 16,4 ${8 + (1-pct)*4},${4 + pct*6} ${12 - (1-pct)*4},${4 + pct*6}`}
        fill="#5a4520" opacity="0.5" />
      {/* Sand bottom */}
      <polygon points={`8,18 12,18 15,24 5,24`} fill="#8a6e30" opacity="0.7" />
    </svg>
  )
}

// ── Effect card — parchment style ──
function EffectCard({ effect }) {
  const def = EFFECT_DEFS[effect.effect_key]
  if (!def) return null
  const isBuff = def.type === 'buff'
  const hoursLeft = Math.max(0, (new Date(effect.expires_at) - new Date()) / 3600000)
  const timeLabel = hoursLeft < 1 ? `${Math.round(hoursLeft * 60)}m remaining` : `${Math.round(hoursLeft)}h remaining`
  const deltaStr = Object.entries(effect.stat_deltas || {})
    .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_LABELS[k] || k}`)
    .join('  ·  ')

  // RPG flavour text
  const FLAVOUR = {
    well_rested: 'Your mind is sharp and your body restored.',
    hydrated: 'Your body is replenished and your mind is clear.',
    post_workout: 'The forge of effort has strengthened your frame.',
    connected: 'Strong bonds empower you.',
    sun_kissed: 'The warmth of light fills your spirit.',
    sleep_deprived: 'Shadows cloud your thoughts and slow your step.',
    full_hangover: "The night's revelry exacts its toll.",
    mild_hangover: 'Your head protests the previous evening.',
    stressed: 'Dark thoughts weigh upon your resolve.',
    food_coma: 'A heavy feast demands its tribute.',
    caffeine_boost: 'The elixir sharpens your senses.',
    doms: "Your muscles remember yesterday's battle.",
  }
  const flavour = FLAVOUR[effect.effect_key] || (isBuff ? 'A blessing rests upon you.' : 'An affliction tests your mettle.')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', marginBottom: 8, borderRadius: 8,
      backgroundImage: isBuff
        ? `url(/assets/texture_aged_paper.png)`
        : `url(/assets/texture_velvet.png)`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      border: `1px solid ${isBuff ? 'rgba(45,110,66,0.5)' : 'rgba(139,26,26,0.5)'}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isBuff ? 'rgba(13,37,21,0.72)' : 'rgba(40,8,8,0.78)',
        borderRadius: 8,
      }} />
      {/* Corner ornament */}
      <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, zIndex: 1, borderTop: `1px solid ${isBuff ? 'rgba(61,158,90,0.5)' : 'rgba(160,40,40,0.5)'}`, borderRight: `1px solid ${isBuff ? 'rgba(61,158,90,0.5)' : 'rgba(160,40,40,0.5)'}` }} />

      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 8, flexShrink: 0, position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isBuff ? 'rgba(26,74,42,0.6)' : 'rgba(80,16,16,0.6)',
        border: `1px solid ${isBuff ? 'rgba(45,110,66,0.4)' : 'rgba(120,30,30,0.4)'}`,
      }}>
        <EffectIcon effectKey={effect.effect_key} emoji={def.icon} size={32} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600, color: isBuff ? '#3d9e5a' : '#c05050' }}>
            {def.name}
          </span>
          <span style={{
            fontFamily: 'Cinzel, serif', fontSize: 8, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.06em',
            background: isBuff ? 'rgba(45,110,66,0.25)' : 'rgba(120,30,30,0.25)',
            color: isBuff ? '#3d9e5a' : '#c05050',
            border: `0.5px solid ${isBuff ? 'rgba(45,110,66,0.4)' : 'rgba(120,30,30,0.4)'}`,
          }}>BOON</span>
        </div>
        <p style={{ fontSize: 12, color: '#7a6a4a', marginBottom: 3 }}>{deltaStr}</p>
        <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic' }}>{flavour}</p>
        <p style={{ fontSize: 10, color: '#3d2e10', marginTop: 2, fontFamily: 'Cinzel, serif' }}>{timeLabel}</p>
      </div>

      {/* Hourglass */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Hourglass hoursLeft={hoursLeft} />
      </div>
    </div>
  )
}

// ── Debuff card — right panel style ──
function DebuffCard({ effect }) {
  const def = EFFECT_DEFS[effect.effect_key]
  if (!def) return null
  const hoursLeft = Math.max(0, (new Date(effect.expires_at) - new Date()) / 3600000)
  const timeLabel = hoursLeft < 1 ? `${Math.round(hoursLeft * 60)}m remaining` : `${Math.round(hoursLeft)}h remaining`
  const deltaStr = Object.entries(effect.stat_deltas || {})
    .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_LABELS[k] || k}`)
    .join('  ·  ')

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6, marginBottom: 10,
      background: 'linear-gradient(135deg, rgba(90,18,18,0.7) 0%, rgba(50,10,10,0.85) 100%)',
      border: '1px solid rgba(160,40,40,0.4)',
      borderLeft: '3px solid rgba(180,50,50,0.6)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderTop: '1px solid rgba(180,40,40,0.4)', borderRight: '1px solid rgba(180,40,40,0.4)' }} />
      <div style={{ position: 'absolute', bottom: 3, left: 3, width: 6, height: 6, borderBottom: '1px solid rgba(180,40,40,0.4)', borderLeft: '1px solid rgba(180,40,40,0.4)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, position: 'relative', zIndex: 1 }}>
        <EffectIcon effectKey={effect.effect_key} emoji={def.icon} size={28} />
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600, color: '#e8c0c0', letterSpacing: '0.04em' }}>{def.name}</span>
      </div>
      <p style={{ fontSize: 12, color: '#c09090', marginBottom: 4, position: 'relative', zIndex: 1 }}>{deltaStr}</p>
      <p style={{ fontSize: 11, color: '#8a5050', fontFamily: 'Cinzel, serif', position: 'relative', zIndex: 1 }}>{timeLabel}</p>
    </div>
  )
}

export default function StatusPage() {
  const { session, profile } = useAuth()
  const [activeEffects, setActiveEffects] = useState([])
  const [loading, setLoading]             = useState(true)
  const [hoveredStat, setHoveredStat]     = useState(null)
  const [avatarUrl, setAvatarUrl]         = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [sharing, setSharing]             = useState(false)
  const [checkinStatus, setCheckinStatus] = useState({})
  const fileInputRef = useRef(null)
  const { cardRef, generateAndShare } = useShareCard()
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) return
    fetchEffects()
    fetchAvatar()
    fetchCheckinStatus()
    const interval = setInterval(fetchEffects, 60_000)
    return () => clearInterval(interval)
  }, [session])

  async function fetchEffects() {
    const { data } = await supabase.from('active_effects').select('*')
      .eq('user_id', session.user.id)
      .lte('starts_at', new Date().toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setActiveEffects(data || [])
    setLoading(false)
  }

  async function fetchAvatar() {
    const { data } = await supabase.from('users').select('avatar_url').eq('id', session.user.id).single()
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
  }

  async function fetchCheckinStatus() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('checkins').select('morning_done, evening_done')
      .eq('user_id', session.user.id).eq('date', today).maybeSingle()
    const hour = new Date().getHours()
    setCheckinStatus({
      showMorning: !data?.morning_done,
      showEvening: !data?.evening_done && (data?.morning_done || false) && hour >= 12,
    })
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${session.user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('users').update({ avatar_url: url }).eq('id', session.user.id)
      setAvatarUrl(url)
    }
    setUploadingAvatar(false)
  }

  const stats   = computeStats(activeEffects)
  const ambience = AMBIENCE[getMoodAmbience(activeEffects, stats)]
  const buffs   = activeEffects.filter(e => EFFECT_DEFS[e.effect_key]?.type === 'buff')
  const debuffs = activeEffects.filter(e => EFFECT_DEFS[e.effect_key]?.type === 'debuff')
  const username = profile?.username || session?.user?.email?.split('@')[0] || 'Adventurer'

  const allDeltas = {}
  activeEffects.forEach(e => Object.entries(e.stat_deltas || {}).forEach(([k, v]) => { allDeltas[k] = (allDeltas[k] || 0) + v }))

  const orbPositions = [
    { stat: 'energy',   style: { top: 0,     left: '50%', transform: 'translateX(-50%)' } },
    { stat: 'focus',    style: { top: '18%',  right: -10 } },
    { stat: 'mood',     style: { bottom: '10%', right: 0  } },
    { stat: 'recovery', style: { bottom: -8,  left: '50%', transform: 'translateX(-50%)' } },
    { stat: 'charisma', style: { bottom: '10%', left: 0   } },
    { stat: 'strength', style: { top: '18%',  left: -10  } },
  ]

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      background: ambience.bg,
      transition: 'background 1.2s ease',
      fontFamily: 'Crimson Pro, Georgia, serif',
      position: 'relative',
    }}>

      {/* Warm candlelight glow — bottom corners */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 300, height: 300, background: 'radial-gradient(ellipse at bottom left, rgba(180,100,20,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 300, height: 300, background: 'radial-gradient(ellipse at bottom right, rgba(180,100,20,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      {ambience.glow && (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${ambience.glow} 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
      )}

      {/* ══ LEFT PANEL — portrait + checkin ══ */}
      <div style={{
        width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column',
        padding: '20px 16px', position: 'relative', zIndex: 1, overflowY: 'auto',
        background: 'linear-gradient(180deg, #1a1410 0%, #120e0a 50%, #1a1410 100%)',
        borderRight: '2px solid #2a1e0e',
        boxShadow: 'inset -4px 0 12px rgba(0,0,0,0.5), inset 4px 0 8px rgba(0,0,0,0.3)',
      }}>
        {/* Corner bracket ornaments */}
        <img src="/assets/bracket_tl.png" alt="" style={{ position: 'absolute', top: 0, left: 0, width: 36, height: 36, objectFit: 'contain', opacity: 0.7, pointerEvents: 'none' }} />
        <img src="/assets/bracket_bl.png" alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: 36, height: 36, objectFit: 'contain', opacity: 0.7, pointerEvents: 'none' }} />
        {/* Name */}
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 2, lineHeight: 1.1 }}>{username}</h1>
        <p style={{ fontSize: 12, color: '#5a4520', fontStyle: 'italic', marginBottom: 16 }}>{format(new Date(), 'EEEE, d MMM')}</p>

        {/* Gold divider */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #5a4520, transparent)', marginBottom: 16 }} />

        {/* Portrait */}
        <div style={{ position: 'relative', marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{
            width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid #5a4520', cursor: 'pointer', flexShrink: 0,
            background: '#13100a', position: 'relative',
            boxShadow: '0 0 20px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.4)',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 28 }}>⚔️</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: 8, color: '#4a3e28' }}>SET PORTRAIT</span>
                </div>
            }
            {uploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 16, height: 16, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>

        {/* Ambience label */}
        {ambience.label && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 20, background: 'rgba(61,46,16,0.4)', border: '1px solid #3d2e10', color: '#8a6e30' }}>
              {ambience.label}
            </span>
          </div>
        )}

        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', marginBottom: 14 }} />

        {/* Check-in banner */}
        {(checkinStatus.showMorning || checkinStatus.showEvening) && (
          <button onClick={() => navigate(checkinStatus.showMorning ? '/morning-checkin' : '/evening-checkin')}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 12,
              background: 'rgba(61,46,16,0.3)', border: '1px solid #5a4520',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
            <span style={{ fontSize: 14 }}>{checkinStatus.showMorning ? '🌅' : '🌙'}</span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#c9a84c', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              {checkinStatus.showMorning ? 'Dawn Briefing awaits' : 'Dusk Reckoning awaits'}
            </span>
          </button>
        )}

        {/* Daily quote */}
        <div style={{ marginTop: 'auto', padding: '10px 8px', borderRadius: 8, background: 'rgba(13,10,6,0.6)', border: '1px solid #2a1e08' }}>
          <p style={{ fontSize: 11, color: '#5a4520', fontStyle: 'italic', lineHeight: 1.5, textAlign: 'center' }}>
            "{DAILY_QUOTE}"
          </p>
        </div>
      </div>

      {/* ══ CENTRE — stat orbs ══ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-start', padding: '20px 8px 8px', position: 'relative', zIndex: 1, overflowY: 'auto',
      }}>

        {/* Portrait zone with compass + orbs */}
        <div style={{ position: 'relative', width: 260, height: 280, flexShrink: 0, marginBottom: 8 }}>
          {/* Compass rose */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 220, height: 220 }}>
            <CompassRose size={220} />
          </div>

          {/* Stat orbs */}
          {orbPositions.map(({ stat, style }) => (
            <StatOrb key={stat} stat={stat} value={stats[stat]} style={style}
              onHover={setHoveredStat} onLeave={() => setHoveredStat(null)}
              isHovered={hoveredStat === stat}
            />
          ))}

          {/* Centre portrait with gold frame overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: 128, height: 128 }}>
              {/* Portrait image */}
              <div style={{
                width: 128, height: 128, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid #5a4520',
                boxShadow: '0 0 0 4px rgba(61,46,16,0.3), 0 0 24px rgba(0,0,0,0.7)',
                background: '#13100a',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>⚔️</div>
                }
              </div>
              {/* Gold frame asset overlaid on top */}
              <img
                src="/assets/frame_circle_gold.png"
                alt=""
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 158, height: 158,
                  objectFit: 'contain', pointerEvents: 'none',
                  mixBlendMode: 'lighten', opacity: 0.85,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stat tooltip */}
        <div style={{ minHeight: 40, marginBottom: 8, width: '100%', maxWidth: 260 }}>
          {hoveredStat && (
            <div style={{ background: 'rgba(19,14,8,0.95)', border: '1px solid #3d2e10', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c' }}>
                {STAT_LABELS[hoveredStat]}: {Math.round(stats[hoveredStat])}
              </p>
              <p style={{ fontSize: 12, color: '#5a4520', fontStyle: 'italic', marginTop: 2 }}>
                {allDeltas[hoveredStat]
                  ? `Base 50 · ${allDeltas[hoveredStat] > 0 ? '+' : ''}${allDeltas[hoveredStat]} from effects`
                  : 'Base 50 · no modifiers active'}
              </p>
            </div>
          )}
        </div>

        {/* Active boons */}
        {!loading && buffs.length > 0 && (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ marginBottom: 10, position: 'relative', textAlign: 'center' }}>
              <img src="/assets/divider_ornate.png" alt="" style={{ width: '100%', maxWidth: 380, height: 20, objectFit: 'fill', opacity: 0.7 }} />
              <span style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                fontFamily: 'Cinzel, serif', fontSize: 9, color: '#8a6e30', letterSpacing: '0.14em',
                background: ambience.bg, padding: '0 10px',
              }}>ACTIVE BOONS</span>
            </div>
            {buffs.map(e => <EffectCard key={e.id} effect={e} />)}
          </div>
        )}

        {!loading && activeEffects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', border: '1px solid #2a1e08', borderRadius: 10, width: '100%', maxWidth: 320 }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>🧘</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#5a4520' }}>No active effects</p>
            <p style={{ fontSize: 13, color: '#3d2e10', fontStyle: 'italic', marginTop: 4 }}>Complete a check-in to begin</p>
          </div>
        )}
      </div>

      {/* ══ RIGHT PANEL — debuffs + share ══ */}
      <div style={{
        width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column',
        padding: '20px 14px', position: 'relative', zIndex: 1, overflowY: 'auto',
        background: 'linear-gradient(180deg, #1a1410 0%, #120e0a 50%, #1a1410 100%)',
        borderLeft: '2px solid #2a1e0e',
        boxShadow: 'inset 4px 0 12px rgba(0,0,0,0.5), inset -4px 0 8px rgba(0,0,0,0.3)',
      }}>
        {/* Corner bracket ornaments */}
        <img src="/assets/bracket_tr.png" alt="" style={{ position: 'absolute', top: 0, right: 0, width: 36, height: 36, objectFit: 'contain', opacity: 0.7, pointerEvents: 'none' }} />
        <img src="/assets/bracket_br.png" alt="" style={{ position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, objectFit: 'contain', opacity: 0.7, pointerEvents: 'none' }} />

        {/* Top buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {/* Ambience pill top right */}
          {ambience.label && (
            <div style={{
              padding: '5px 10px', borderRadius: 6, textAlign: 'center',
              background: 'rgba(80,16,16,0.4)', border: '1px solid rgba(139,26,26,0.5)',
              fontFamily: 'Cinzel, serif', fontSize: 10, color: '#c05050', letterSpacing: '0.06em',
            }}>
              {ambience.label.toUpperCase()}
            </div>
          )}
          <button
            onClick={async () => { setSharing(true); await generateAndShare({ username, stats, activeEffects, avatarUrl }); setSharing(false) }}
            style={{
              padding: '7px 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
              background: 'rgba(61,46,16,0.4)', border: '1px solid #5a4520',
              fontFamily: 'Cinzel, serif', fontSize: 10, color: sharing ? '#3d9e5a' : '#c9a84c',
              letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            ✦ {sharing ? 'Shared' : 'Share'}
          </button>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', marginBottom: 14 }} />

        {/* Active afflictions */}
        {debuffs.length > 0 && (
          <div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <img src="/assets/texture_crimson.png" alt="" style={{ width: '100%', height: 22, objectFit: 'cover', borderRadius: 4, opacity: 0.85 }} />
              <span style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cinzel, serif', fontSize: 9, color: '#e8c0a0', letterSpacing: '0.14em',
              }}>AFFLICTIONS</span>
            </div>
            {debuffs.map(e => <DebuffCard key={e.id} effect={e} />)}
          </div>
        )}

        {debuffs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <p style={{ fontSize: 20, marginBottom: 6 }}>🛡️</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#3d2e10', letterSpacing: '0.06em' }}>No afflictions</p>
          </div>
        )}

        {/* Candle + crystal decoration */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: 12, paddingTop: 16, opacity: 0.7 }}>
          <img src="/assets/misc_crystal.png" alt="" style={{ height: 60, objectFit: 'contain' }} />
          <img src="/assets/misc_candle.png"  alt="" style={{ height: 60, objectFit: 'contain' }} />
        </div>
      </div>

      {/* Hidden share card */}
      <ShareCard cardRef={cardRef} username={username} stats={stats} activeEffects={activeEffects} avatarUrl={avatarUrl} />
    </div>
  )
}
