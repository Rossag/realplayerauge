import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { loadQuestStatus, checkAndAwardQuest, setActiveChallenge, QUEST_DEFS } from '../lib/quests.js'

const S = {
  page:  { background: '#0d0a06', minHeight: '100%', padding: '20px 16px 32px', fontFamily: 'Crimson Pro, Georgia, serif' },
  title: { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:   { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 },
  sectionTitle: { fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.14em', color: '#5a4520', marginBottom: 10 },
  panel: { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: '14px 16px', marginBottom: 14 },
}

// ── Badge component ──
function Badge({ badge, expiresAt }) {
  const hoursLeft = Math.max(0, (new Date(expiresAt) - new Date()) / 3600000)
  const timeLabel = hoursLeft < 1
    ? `${Math.round(hoursLeft * 60)}m`
    : `${Math.round(hoursLeft)}h`

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '10px 8px', borderRadius: 10, minWidth: 70,
      background: `${badge.colour}18`,
      border: `1px solid ${badge.colour}44`,
    }}>
      <span style={{ fontSize: 26 }}>{badge.icon}</span>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: badge.colour, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.3 }}>
        {badge.label}
      </span>
      <span style={{ fontSize: 9, color: '#4a3e28', fontStyle: 'italic' }}>
        {timeLabel} left
      </span>
    </div>
  )
}

// ── Quest card ──
function QuestCard({ quest, completed, onClaim, checking }) {
  const isCompleted = completed

  return (
    <div style={{
      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      background: isCompleted ? 'rgba(26,74,42,0.2)' : 'rgba(19,16,10,0.8)',
      border: `1px solid ${isCompleted ? 'rgba(45,110,66,0.5)' : '#3d2e10'}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          background: isCompleted ? 'rgba(45,110,66,0.2)' : 'rgba(61,46,16,0.3)',
          border: `1px solid ${isCompleted ? 'rgba(45,110,66,0.3)' : '#3d2e10'}`,
        }}>
          {isCompleted ? '✦' : quest.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <p style={{
              fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 600,
              color: isCompleted ? '#3d9e5a' : '#c9a84c',
            }}>{quest.title}</p>
            <span style={{
              fontFamily: 'Cinzel, serif', fontSize: 9, padding: '2px 8px', borderRadius: 20,
              background: quest.tier === 'daily' ? 'rgba(201,168,76,0.15)'
                : quest.tier === 'weekly' ? 'rgba(74,112,192,0.15)'
                : 'rgba(128,96,192,0.15)',
              color: quest.tier === 'daily' ? '#c9a84c'
                : quest.tier === 'weekly' ? '#4a70c0'
                : '#8060c0',
              border: `0.5px solid ${quest.tier === 'daily' ? 'rgba(201,168,76,0.3)'
                : quest.tier === 'weekly' ? 'rgba(74,112,192,0.3)'
                : 'rgba(128,96,192,0.3)'}`,
            }}>
              {quest.tier}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#7a6a4a', fontStyle: 'italic', lineHeight: 1.4 }}>{quest.desc}</p>
          {quest.badge && !isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 12 }}>{quest.badge.icon}</span>
              <span style={{ fontSize: 11, color: '#5a4520', fontStyle: 'italic' }}>
                Earns the {quest.badge.label} badge today
              </span>
            </div>
          )}
        </div>

        {/* Claim button or done mark */}
        {isCompleted ? (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
            <span style={{ fontSize: 20 }}>✓</span>
          </div>
        ) : (
          <button
            onClick={() => onClaim(quest.id)}
            disabled={checking === quest.id}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.06em',
              background: 'rgba(61,46,16,0.6)', border: '1px solid #8a6e30',
              color: '#c9a84c', opacity: checking === quest.id ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {checking === quest.id ? '…' : 'Claim'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Challenge picker modal ──
function ChallengePicker({ options, onPick, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#13100a', border: '1px solid #3d2e10',
        borderRadius: '16px 16px 0 0', padding: '20px 16px 32px',
      }} onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c9a84c', marginBottom: 4 }}>Choose Your Challenge</p>
        <p style={{ fontSize: 13, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 16 }}>One long-form quest at a time. Choose wisely.</p>
        {options.map(q => (
          <button key={q.id} onClick={() => { onPick(q.id); onClose() }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
            background: 'rgba(19,16,10,0.8)', border: '1px solid #3d2e10', textAlign: 'left',
          }}>
            <span style={{ fontSize: 24 }}>{q.icon}</span>
            <div>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c' }}>{q.title}</p>
              <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 2 }}>{q.desc}</p>
            </div>
          </button>
        ))}
        <button onClick={onClose} style={{
          width: '100%', padding: '11px 0', borderRadius: 10, cursor: 'pointer', marginTop: 4,
          fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.08em',
          background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28',
        }}>Cancel</button>
      </div>
    </div>
  )
}

export default function QuestsPage() {
  const { session } = useAuth()
  const [status, setStatus]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [checking, setChecking]   = useState(null)
  const [claimed, setClaimed]     = useState(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (session) loadStatus()
  }, [session])

  async function loadStatus() {
    setLoading(true)
    const s = await loadQuestStatus(session.user.id)
    setStatus(s)
    setLoading(false)
  }

  async function handleClaim(questId) {
    setChecking(questId)
    const awarded = await checkAndAwardQuest(session.user.id, questId)
    setChecking(null)
    if (awarded) {
      setClaimed(questId)
      await loadStatus() // refresh
      setTimeout(() => setClaimed(null), 3000)
    } else {
      // Not yet complete — show gentle message
      setClaimed(`fail_${questId}`)
      setTimeout(() => setClaimed(null), 2500)
    }
  }

  async function handlePickChallenge(questId) {
    await setActiveChallenge(session.user.id, questId)
    await loadStatus()
  }

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 22, height: 22, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a4520', letterSpacing: '0.1em' }}>CONSULTING THE ORACLE…</p>
      </div>
    </div>
  )

  const { daily, weekly, challenge, challengeOptions, completedIds, completionMap, activeBadges } = status

  return (
    <div style={S.page}>
      <h1 style={S.title}>Quests</h1>
      <p style={S.sub}>Deeds that forge a stronger adventurer</p>

      {/* Claim feedback */}
      {claimed && !claimed.startsWith('fail_') && (
        <div style={{
          background: 'rgba(26,74,42,0.3)', border: '1px solid rgba(45,110,66,0.5)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          fontFamily: 'Cinzel, serif', fontSize: 12, color: '#3d9e5a', textAlign: 'center',
        }}>
          ✦ Quest complete — badge awarded until midnight
        </div>
      )}
      {claimed?.startsWith('fail_') && (
        <div style={{
          background: 'rgba(61,46,16,0.25)', border: '1px solid #5a4520',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          fontFamily: 'Cinzel, serif', fontSize: 12, color: '#8a6e30', textAlign: 'center',
        }}>
          Not yet complete — keep going, adventurer
        </div>
      )}

      {/* Active badges */}
      {activeBadges.length > 0 && (
        <div style={S.panel}>
          <p style={S.sectionTitle}>✦ TODAY'S BADGES</p>
          <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 12 }}>
            These vanish at midnight. Earn them again tomorrow.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {activeBadges.map(b => {
              const def = QUEST_DEFS[b.quest_id]
              if (!def?.badge) return null
              return <Badge key={b.quest_id} badge={def.badge} expiresAt={b.badge_expires_at} />
            })}
          </div>
        </div>
      )}

      {/* Daily quests */}
      <div style={{ marginBottom: 14 }}>
        <p style={S.sectionTitle}>✦ DAILY QUESTS</p>
        <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 10 }}>
          Chosen for you based on your recent chronicle. Resets at dawn.
        </p>
        {daily.map(q => (
          <QuestCard
            key={q.id} quest={q}
            completed={completedIds.has(q.id)}
            onClaim={handleClaim}
            checking={checking}
          />
        ))}
      </div>

      {/* Weekly quests */}
      <div style={{ marginBottom: 14 }}>
        <p style={S.sectionTitle}>✦ WEEKLY QUESTS</p>
        <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 10 }}>
          Sustained effort across the week. Resets each Monday.
        </p>
        {weekly.map(q => (
          <QuestCard
            key={q.id} quest={q}
            completed={completedIds.has(q.id)}
            onClaim={handleClaim}
            checking={checking}
          />
        ))}
      </div>

      {/* Challenge quest */}
      <div style={{ marginBottom: 14 }}>
        <p style={S.sectionTitle}>✦ CHALLENGE QUEST</p>
        <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 10 }}>
          One long-form quest at a time. Choose your trial wisely.
        </p>
        {challenge.length > 0 ? (
          <>
            {challenge.map(q => (
              <QuestCard
                key={q.id} quest={q}
                completed={completedIds.has(q.id)}
                onClaim={handleClaim}
                checking={checking}
              />
            ))}
            <button onClick={() => setShowPicker(true)} style={{
              width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer', marginTop: 4,
              fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.08em',
              background: 'transparent', border: '1px solid #3d2e10', color: '#4a3e28',
            }}>Change challenge →</button>
          </>
        ) : (
          <div style={{ ...S.panel, textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>⚙️</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#8a6e30', marginBottom: 6 }}>No challenge selected</p>
            <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 14 }}>
              Choose a long-form trial to pursue
            </p>
            <button onClick={() => setShowPicker(true)} style={{
              padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.08em',
              background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30', color: '#c9a84c',
            }}>Choose a Challenge</button>
          </div>
        )}
      </div>

      {/* Challenge picker */}
      {showPicker && (
        <ChallengePicker
          options={challengeOptions}
          onPick={handlePickChallenge}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
