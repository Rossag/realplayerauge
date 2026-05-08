import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import { EFFECT_DEFS, computeStats, STAT_COLOURS, STAT_LABELS } from '../lib/engine.js'
import { format } from 'date-fns'

const S = {
  page:    { background: '#0d0a06', minHeight: '100%', fontFamily: 'Crimson Pro, Georgia, serif' },
  title:   { fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 4 },
  sub:     { fontSize: 14, color: '#7a6a4a', fontStyle: 'italic', marginBottom: 20 },
  panel:   { background: 'rgba(19,16,10,0.9)', border: '1px solid #3d2e10', borderRadius: 12, padding: 16, marginBottom: 14 },
  btn:     { fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', padding: '11px 0', borderRadius: 10, cursor: 'pointer', width: '100%', border: '1px solid #8a6e30', background: 'rgba(61,46,16,0.8)', color: '#c9a84c' },
  input:   { width: '100%', background: 'rgba(13,10,6,0.9)', border: '1px solid #3d2e10', borderRadius: 8, padding: '10px 14px', fontSize: 15, color: '#d4bc8a', outline: 'none', boxSizing: 'border-box', fontFamily: 'Crimson Pro, serif' },
  label:   { fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.1em', color: '#5a4520', marginBottom: 8, display: 'block' },
}

function MiniOrb({ value, colour }) {
  const r = 14, circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(100, Math.max(0, value)) / 100)
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="#2a1e08" strokeWidth="3" />
      <circle cx="16" cy="16" r={r} fill="none" stroke={colour} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  )
}

function MemberCard({ member, isMe }) {
  const buffs   = (member.effects || []).filter(e => EFFECT_DEFS[e.effect_key]?.type === 'buff')
  const debuffs = (member.effects || []).filter(e => EFFECT_DEFS[e.effect_key]?.type === 'debuff')
  const stats   = computeStats(member.effects || [])
  const topEffect = [...debuffs, ...buffs][0]
  const topDef    = topEffect ? EFFECT_DEFS[topEffect.effect_key] : null

  return (
    <div style={{
      background: 'rgba(19,16,10,0.85)', border: `1px solid ${isMe ? '#5a4520' : '#3d2e10'}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 10,
      borderLeft: isMe ? '2px solid #8a6e30' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '1px solid #5a4520', background: '#13100a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {member.avatar_url
            ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 18 }}>⚔️</span>}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c', fontWeight: 600 }}>
            {member.username || 'Unnamed'}{isMe ? ' (you)' : ''}
          </p>
          <p style={{ fontSize: 12, color: '#4a3e28', fontStyle: 'italic', marginTop: 1 }}>
            {topDef ? `${topDef.icon} ${topDef.name}` : 'No active effects'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {buffs.length > 0 && (
            <span style={{ fontSize: 10, fontFamily: 'Cinzel, serif', padding: '2px 7px', borderRadius: 20, background: 'rgba(26,74,42,0.3)', border: '0.5px solid rgba(45,110,66,0.4)', color: '#3d9e5a' }}>+{buffs.length}</span>
          )}
          {debuffs.length > 0 && (
            <span style={{ fontSize: 10, fontFamily: 'Cinzel, serif', padding: '2px 7px', borderRadius: 20, background: 'rgba(80,16,16,0.3)', border: '0.5px solid rgba(120,30,30,0.4)', color: '#c05050' }}>-{debuffs.length}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {Object.entries(STAT_COLOURS).map(([key, colour]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <MiniOrb value={stats[key]} colour={colour} />
            <span style={{ fontSize: 7, fontFamily: 'Cinzel, serif', color: '#4a3e28', letterSpacing: '0.04em' }}>{key.slice(0,3).toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatMessage({ msg, isMe }) {
  const avatar = msg.users?.avatar_url
  const name   = msg.users?.username || 'Adventurer'

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>

      {/* Portrait */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        border: `1px solid ${isMe ? '#5a4520' : '#3d2e10'}`,
        background: '#13100a', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '⚔️'
        }
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '72%' }}>
        {/* Name above bubble — only for others */}
        {!isMe && (
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#8a6e30', letterSpacing: '0.06em', marginBottom: 3, paddingLeft: 2 }}>
            {name}
          </p>
        )}
        <div style={{
          padding: '8px 12px',
          borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          background: isMe ? 'rgba(61,46,16,0.6)' : 'rgba(26,21,16,0.9)',
          border: `1px solid ${isMe ? '#5a4520' : '#3d2e10'}`,
        }}>
          <p style={{
            fontSize: msg.type === 'status_update' ? 13 : 14,
            color: msg.type === 'status_update' ? '#7a6a4a' : '#d4bc8a',
            fontStyle: msg.type === 'status_update' ? 'italic' : 'normal',
            lineHeight: 1.4,
          }}>{msg.content}</p>
          <p style={{ fontSize: 9, color: '#4a3e28', marginTop: 4, fontFamily: 'Cinzel, serif', textAlign: isMe ? 'left' : 'right' }}>
            {format(new Date(msg.created_at), 'HH:mm')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function GuildPage() {
  const { session, profile } = useAuth()
  const [view, setView]           = useState('loading')
  const [guild, setGuild]         = useState(null)
  const [members, setMembers]     = useState([])
  const [messages, setMessages]   = useState([])
  const [chatInput, setChatInput] = useState('')
  const [tab, setTab]             = useState('feed')
  const [guildName, setGuildName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError]         = useState('')
  const [copying, setCopying]     = useState(false)
  const chatRef   = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (session) loadGuild()
    return () => {
      // Clean up realtime subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [session])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  async function loadGuild() {
    setView('loading')
    try {
      // Find membership
      const { data: membership, error: memErr } = await supabase
        .from('guild_members')
        .select('guild_id, role')
        .eq('user_id', session.user.id)
        .maybeSingle() // use maybeSingle — returns null instead of error if no row

      if (memErr) { console.error('Membership error:', memErr); setView('none'); return }
      if (!membership) { setView('none'); return }

      // Load guild
      const { data: guildData, error: guildErr } = await supabase
        .from('guilds').select('*').eq('id', membership.guild_id).single()
      if (guildErr || !guildData) { setView('none'); return }

      setGuild(guildData)
      await loadMembers(membership.guild_id)
      await loadMessages(membership.guild_id)
      subscribeToChat(membership.guild_id)
      setView('guild')
    } catch (e) {
      console.error('Guild load error:', e)
      setView('none')
    }
  }

  async function loadMembers(guildId) {
    const { data: memberRows } = await supabase
      .from('guild_members').select('user_id').eq('guild_id', guildId)
    if (!memberRows?.length) return

    const userIds = memberRows.map(m => m.user_id)
    const { data: users } = await supabase
      .from('users').select('id, username, avatar_url').in('id', userIds)

    const now = new Date().toISOString()
    const { data: effects } = await supabase
      .from('active_effects').select('*')
      .in('user_id', userIds)
      .lte('starts_at', now)
      .gt('expires_at', now)

    setMembers((users || []).map(u => ({
      ...u,
      effects: (effects || []).filter(e => e.user_id === u.id),
    })))
  }

  async function loadMessages(guildId) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, content, type, created_at, user_id, users(username, avatar_url)')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: true })
      .limit(80)
    if (error) console.error('Messages error:', error)
    setMessages(data || [])
  }

  function subscribeToChat(guildId) {
    // Remove any existing subscription first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`guild-chat-${guildId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `guild_id=eq.${guildId}`,
      }, async (payload) => {
        // Fetch the full message with user info
        const { data } = await supabase
          .from('messages')
          .select('id, content, type, created_at, user_id, users(username, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages(prev => [...prev, data])
      })
      .subscribe((status) => {
        console.log('Guild chat subscription:', status)
      })

    channelRef.current = channel
  }

  async function createGuild() {
    setError('')
    if (!guildName.trim()) { setError('Enter a guild name'); return }

    const { data, error: err } = await supabase
      .from('guilds')
      .insert({ name: guildName.trim(), created_by: session.user.id })
      .select().single()
    if (err) { setError(err.message); return }

    const { error: joinErr } = await supabase
      .from('guild_members')
      .insert({ guild_id: data.id, user_id: session.user.id, role: 'owner' })
    if (joinErr) { setError(joinErr.message); return }

    setGuild(data)
    await loadMembers(data.id)
    await loadMessages(data.id)
    subscribeToChat(data.id)
    setView('guild')
  }

  async function joinGuild() {
    setError('')
    if (!inviteCode.trim()) { setError('Enter an invite code'); return }

    const { data, error: err } = await supabase
      .from('guilds').select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()
    if (err || !data) { setError('Guild not found — check the code'); return }

    // Check not already a member
    const { data: existing } = await supabase
      .from('guild_members')
      .select('user_id')
      .eq('guild_id', data.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (existing) { setError('You are already a member of this guild'); return }

    const { error: joinErr } = await supabase
      .from('guild_members')
      .insert({ guild_id: data.id, user_id: session.user.id, role: 'member' })
    if (joinErr) { setError('Could not join — ' + joinErr.message); return }

    await supabase.from('messages').insert({
      guild_id: data.id, user_id: session.user.id,
      content: `${profile?.username || 'A new adventurer'} has joined the guild!`,
      type: 'status_update',
    })

    setGuild(data)
    await loadMembers(data.id)
    await loadMessages(data.id)
    subscribeToChat(data.id)
    setView('guild')
  }

  async function sendMessage() {
    if (!chatInput.trim() || !guild) return
    const content = chatInput.trim()
    setChatInput('')
    const { error } = await supabase.from('messages').insert({
      guild_id: guild.id,
      user_id: session.user.id,
      content,
      type: 'chat',
    })
    if (error) console.error('Send message error:', error)
  }

  async function copyInviteCode() {
    if (!guild?.invite_code) return
    await navigator.clipboard.writeText(guild.invite_code)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  // ── Loading ──
  if (view === 'loading') return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
      <div style={{ width: 22, height: 22, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  // ── No guild ──
  if (view === 'none') return (
    <div style={{ ...S.page, padding: '20px 16px 24px' }}>
      <h1 style={S.title}>Guild Hall</h1>
      <p style={S.sub}>Form or join a fellowship of adventurers</p>

      <div style={S.panel}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c', marginBottom: 4 }}>Found a Guild</p>
        <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 14 }}>Create your own guild and invite your companions</p>
        <label style={S.label}>GUILD NAME</label>
        <input value={guildName} onChange={e => setGuildName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createGuild()}
          placeholder="The Reckless Few…" style={{ ...S.input, marginBottom: 12 }} />
        <button onClick={createGuild} style={S.btn}>Found This Guild</button>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #3d2e10, transparent)', margin: '6px 0 20px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#3d2e10', fontSize: 11, background: '#0d0a06', padding: '0 8px', fontFamily: 'Cinzel, serif' }}>or</span>
      </div>

      <div style={S.panel}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c9a84c', marginBottom: 4 }}>Join a Guild</p>
        <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 14 }}>Enter an invite code from a friend</p>
        <label style={S.label}>INVITE CODE</label>
        <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && joinGuild()}
          placeholder="e.g. a3f9bc12" style={{ ...S.input, marginBottom: 12 }} />
        <button onClick={joinGuild} style={S.btn}>Join the Guild</button>
      </div>

      {error && <p style={{ fontSize: 13, color: '#c05050', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>{error}</p>}
    </div>
  )

  // ── Guild view ──
  return (
    <div style={{ ...S.page, display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h1 style={S.title}>{guild?.name}</h1>
          <button onClick={copyInviteCode} style={{
            fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.06em',
            padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(61,46,16,0.4)', border: '1px solid #3d2e10',
            color: copying ? '#3d9e5a' : '#8a6e30',
          }}>
            {copying ? '✓ Copied' : `${guild?.invite_code} · Copy`}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#4a3e28', fontStyle: 'italic', marginBottom: 12 }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #3d2e10' }}>
          {['feed', 'chat'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', cursor: 'pointer', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === t ? '#8a6e30' : 'transparent'}`,
              fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.08em',
              color: tab === t ? '#c9a84c' : '#4a3e28', marginBottom: -1,
            }}>
              {t === 'feed' ? '⚔️ Party Status' : '💬 Guild Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {tab === 'feed' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
          {members.length === 0
            ? <p style={{ fontSize: 14, color: '#4a3e28', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>No members yet — share your invite code</p>
            : members.map(m => <MemberCard key={m.id} member={m} isMe={m.id === session.user.id} />)
          }
        </div>
      )}

      {/* Chat */}
      {tab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 8px' }}>
            {messages.length === 0
              ? <p style={{ fontSize: 14, color: '#4a3e28', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>No messages yet — start the conversation</p>
              : messages.map(msg => <ChatMessage key={msg.id} msg={msg} isMe={msg.user_id === session.user.id} />)
            }
          </div>
          <div style={{ padding: '10px 16px 16px', borderTop: '1px solid #3d2e10', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Speak to your guild…"
              style={{ ...S.input, flex: 1, padding: '10px 14px' }}
            />
            <button onClick={sendMessage} style={{
              padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(61,46,16,0.8)', border: '1px solid #8a6e30',
              color: '#c9a84c', fontSize: 18, lineHeight: 1,
            }}>↗</button>
          </div>
        </div>
      )}
    </div>
  )
}
