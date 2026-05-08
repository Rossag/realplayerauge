import { supabase } from './supabase.js'

// ── Default preferences ──
export const DEFAULT_PREFS = {
  master: true,
  personal_debuff_alerts: true,
  personal_health_nudges: true,
  personal_streak_praise: true,
  personal_recovery_tips: true,
  guild_friend_checkins:  false,
  guild_party_events:     false,
  guild_chat_pings:       false,
  guild_daily_digest:     false,
  dnd_enabled:            true,
  dnd_weekday_start:      '22:00',
  dnd_weekday_end:        '07:00',
  dnd_weekend_start:      '23:00',
  dnd_weekend_end:        '09:00',
  silent_mode:            false,
}

export async function loadNotifPrefs(userId) {
  const { data } = await supabase
    .from('notification_prefs').select('prefs').eq('user_id', userId).single()
  return data?.prefs ? { ...DEFAULT_PREFS, ...data.prefs } : { ...DEFAULT_PREFS }
}

export async function saveNotifPrefs(userId, prefs) {
  await supabase.from('notification_prefs').upsert({
    user_id: userId, prefs, updated_at: new Date().toISOString(),
  })
}

export function isInDND(prefs) {
  if (!prefs.dnd_enabled) return false
  const now = new Date()
  const isWeekend = [0, 6].includes(now.getDay())
  const start = isWeekend ? prefs.dnd_weekend_start : prefs.dnd_weekday_start
  const end   = isWeekend ? prefs.dnd_weekend_end   : prefs.dnd_weekday_end
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const nowM   = now.getHours() * 60 + now.getMinutes()
  const startM = sh * 60 + sm
  const endM   = eh * 60 + em
  return startM > endM
    ? nowM >= startM || nowM < endM
    : nowM >= startM && nowM < endM
}

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}

function fireNotif(title, body, tag) {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag })
}

// ── Semi-fantasy copy ──
const C = {
  sleep_warning_mild:    { title: '🌙 Rest Eludes You',           body: 'Two restless nights, adventurer. Your Energy reserves grow thin — consider retiring early tonight.' },
  sleep_warning_severe:  { title: '😴 Critically Fatigued',       body: 'Three nights without proper rest. The Sleep Deprived debuff deepens. Your body demands recovery.' },
  sleep_streak_3:        { title: '🌙 Three Nights Well Rested',  body: 'Three nights of solid rest. Your Recovery stat strengthens. The chronicle notes your discipline.' },
  sleep_streak_7:        { title: '✦ Seven Nights Rested',        body: 'A full week of proper rest. Your focus and energy are at their peak. Well fought, adventurer.' },
  dehydration_warning:   { title: '💧 The Thirsty Debuff Lurks',  body: 'No water has been logged since morning. Drink now before the affliction takes hold.' },
  junk_followup:         { title: '🍖 Your Body Remembers',       body: "Yesterday's feast weighs on you still. A wholesome meal today would aid your recovery." },
  meal_skipped:          { title: '⚠️ The Hungry Debuff Stirs',   body: 'No meal has been recorded since dawn. Your Focus and Mood grow restless.' },
  caffeine_curfew:       { title: '☕ The Caffeine Curfew',       body: 'The hour grows late for stimulants. Logging caffeine now risks disrupting tonight\'s rest.' },
  caffeine_dependency:   { title: '☕ Dependency Detected',       body: 'Three days of heavy caffeine use. Your body now expects the ritual. Mind the withdrawal.' },
  hangover_active:       { title: '💀 Affliction: Hangover',      body: 'You bear the marks of last night\'s revelry. Water and food will hasten the affliction\'s end.' },
  hangover_severe:       { title: '💀 Suffering Continues',       body: 'The Full Hangover still holds sway. Rest, water, and a meal are your only remedies.' },
  doms_warning:          { title: '🦵 Your Muscles Cry Out',      body: 'Two days of hard training. A rest day today would clear DOMS and restore your Strength.' },
  rest_day_nudge:        { title: '🛌 Recovery Calls',            body: 'Your body has earned its respite. A rest day now will compound tomorrow\'s strength.' },
  stress_followup:       { title: '⚠️ Residual Stress Lingers',   body: "Yesterday's trials weigh on your spirit. Rest and fellowship are the remedy." },
  no_log_today:          { title: '📜 The Chronicle Grows Silent', body: 'You have not recorded today\'s deeds. Your buffs and debuffs remain unknown.' },
  log_streak_3:          { title: '📜 Three Days Chronicled',     body: 'Three days of faithful logging. The chronicle begins to reveal your patterns.' },
  log_streak_7:          { title: '📜 Seven Days Chronicled',     body: 'A full week recorded. Your self-knowledge deepens. The data does not lie.' },
  log_streak_14:         { title: '📜 A Fortnight of Records',    body: 'Fourteen days of dedication. Few adventurers persist this long. Well fought.' },
  log_streak_30:         { title: '✦ Thirty Days — Legendary',    body: 'A full month chronicled. You have mastered the art of self-awareness. The guild takes note.' },
}

const G = {
  friend_sleep: (name, days) => ({
    title: `🛡️ Your Ally ${name} Falters`,
    body: `${name} has suffered Sleep Deprivation for ${days} ${days === 1 ? 'day' : 'days'}. Perhaps send word through the guild.`,
  }),
  friend_hangover: (name) => ({
    title: `🍺 ${name} Bears the Hangover`,
    body: `Your ally ${name} is afflicted this morning. A word of solidarity may aid their recovery.`,
  }),
  party_hangover: (guild) => ({
    title: `💀 The ${guild} Rides Rough`,
    body: 'Your entire party bears the Hangover affliction this morning. A legendary night, apparently.',
  }),
  friend_struggling: (name) => ({
    title: `🛡️ ${name} May Need Aid`,
    body: `${name} carries multiple afflictions today. A message from an ally can lift the spirits.`,
  }),
  guild_silent: (guild) => ({
    title: `🛡️ ${guild} Grows Quiet`,
    body: 'None of your guild have logged today. The chronicle grows silent. Will you be first?',
  }),
  guild_message: (name, guild) => ({
    title: `💬 ${guild}`,
    body: `${name} has spoken in the guild hall.`,
  }),
}

// ── Main engine ──
export async function runNotificationEngine(userId, prefs) {
  if (!prefs.master || prefs.silent_mode || isInDND(prefs)) return
  if (Notification.permission !== 'granted') return

  const now  = new Date()
  const hour = now.getHours()

  // Per-day fire tracking — max 2 personal + 1 guild per day
  const dayKey    = `rpg_fired_${userId}_${now.toDateString()}`
  const firedToday = new Set(JSON.parse(localStorage.getItem(dayKey) || '[]'))

  function fire(key, title, body) {
    if (firedToday.has(key)) return
    firedToday.add(key)
    localStorage.setItem(dayKey, JSON.stringify([...firedToday]))
    fireNotif(title, body, key)
  }

  // Cap personal notifications at 2 per day
  const personalFired = [...firedToday].filter(k => !k.startsWith('guild_') && !k.startsWith('party_') && !k.startsWith('friend_')).length
  const canFirePersonal = () => personalFired < 2

  // Morning 07:00–10:00
  if (hour >= 7 && hour < 10 && prefs.personal_debuff_alerts && canFirePersonal()) {
    await runMorning(userId, fire)
  }

  // Midday 11:00–13:00
  if (hour >= 11 && hour < 13 && prefs.personal_health_nudges && canFirePersonal()) {
    await runMidday(userId, fire)
  }

  // Afternoon 14:00–16:00
  if (hour >= 14 && hour < 16 && prefs.personal_health_nudges && canFirePersonal()) {
    await runAfternoon(userId, fire)
  }

  // Evening 18:00–21:00
  if (hour >= 18 && hour < 21 && prefs.personal_health_nudges && canFirePersonal()) {
    await runEvening(userId, fire)
  }

  // Guild (once per day, waking hours)
  if (hour >= 8 && hour < 21) {
    await runGuild(userId, prefs, fire)
  }

  // Streaks — any time, once per day
  if (prefs.personal_streak_praise && canFirePersonal()) {
    await runStreaks(userId, fire)
  }
}

async function runMorning(userId, fire) {
  const now = new Date().toISOString()
  const { data: effects } = await supabase
    .from('active_effects').select('effect_key')
    .eq('user_id', userId).gt('expires_at', now)
  const keys = (effects || []).map(e => e.effect_key)

  if (keys.includes('full_hangover')) {
    const c = C.hangover_severe; fire('hangover_severe', c.title, c.body)
  } else if (keys.includes('mild_hangover')) {
    const c = C.hangover_active; fire('hangover_active', c.title, c.body)
  }
  if (keys.includes('sleep_deprived')) {
    const days = await streakSleepBad(userId)
    const c = days >= 3 ? C.sleep_warning_severe : C.sleep_warning_mild
    fire(`sleep_warning_${days >= 3 ? 'severe' : 'mild'}`, c.title, c.body)
  }
  if (keys.includes('stressed')) {
    const c = C.stress_followup; fire('stress_followup', c.title, c.body)
  }
  if (keys.includes('doms') || keys.includes('mild_doms')) {
    const recent = await recentCount(userId, 'exercise', 2)
    if (recent >= 2) { const c = C.doms_warning; fire('doms_warning', c.title, c.body) }
  }
}

async function runMidday(userId, fire) {
  const start = startOfToday()
  const { data } = await supabase
    .from('events').select('type')
    .eq('user_id', userId).gte('logged_at', start)
  const types = (data || []).map(e => e.type)

  if (!types.includes('water')) {
    const c = C.dehydration_warning; fire('dehydration', c.title, c.body)
  }
  if (!types.includes('meal') && !types.includes('junk')) {
    const c = C.meal_skipped; fire('meal_skipped', c.title, c.body)
  }

  const yStart = startOfYesterday()
  const { data: yData } = await supabase
    .from('events').select('type')
    .eq('user_id', userId)
    .gte('logged_at', yStart).lt('logged_at', start)
  const yTypes = (yData || []).map(e => e.type)
  if (yTypes.includes('junk') && !types.includes('meal')) {
    const c = C.junk_followup; fire('junk_followup', c.title, c.body)
  }
}

async function runAfternoon(userId, fire) {
  const start = startOfToday()
  const { data } = await supabase
    .from('events').select('type, value')
    .eq('user_id', userId).gte('logged_at', start)
  const caffeine = (data || []).filter(e => e.type === 'caffeine').reduce((s, e) => s + (e.value || 1), 0)
  if (caffeine >= 3) {
    const c = C.caffeine_dependency; fire('caffeine_dep', c.title, c.body)
  } else {
    const c = C.caffeine_curfew; fire('caffeine_curfew', c.title, c.body)
  }
}

async function runEvening(userId, fire) {
  const start = startOfToday()
  const { data } = await supabase
    .from('events').select('type')
    .eq('user_id', userId).gte('logged_at', start)
  const types = (data || []).map(e => e.type)
  if (types.length === 0) {
    const c = C.no_log_today; fire('no_log', c.title, c.body)
  }
  const recent = await recentCount(userId, 'exercise', 2)
  if (recent >= 2 && !types.includes('rest_day')) {
    const c = C.rest_day_nudge; fire('rest_day_nudge', c.title, c.body)
  }
}

async function runGuild(userId, prefs, fire) {
  if (!prefs.guild_friend_checkins && !prefs.guild_party_events) return

  const { data: mem } = await supabase
    .from('guild_members').select('guild_id').eq('user_id', userId).single()
  if (!mem) return

  const { data: guild } = await supabase
    .from('guilds').select('name').eq('id', mem.guild_id).single()
  if (!guild) return

  const { data: members } = await supabase
    .from('guild_members').select('user_id').eq('guild_id', mem.guild_id)
  if (!members?.length) return

  const allIds   = members.map(m => m.user_id)
  const otherIds = allIds.filter(id => id !== userId)
  if (!otherIds.length) return

  const { data: users } = await supabase
    .from('users').select('id, username').in('id', otherIds)

  const now = new Date().toISOString()
  const { data: effects } = await supabase
    .from('active_effects').select('user_id, effect_key')
    .in('user_id', allIds).gt('expires_at', now)

  if (prefs.guild_friend_checkins) {
    for (const u of (users || [])) {
      const uEffects = (effects || []).filter(e => e.user_id === u.id).map(e => e.effect_key)
      if (uEffects.includes('sleep_deprived')) {
        const days = await streakSleepBad(u.id)
        if (days >= 2) {
          const c = G.friend_sleep(u.username || 'Your ally', days)
          fire(`friend_sleep_${u.id}`, c.title, c.body)
        }
      }
      const debuffs = (effects || []).filter(e => e.user_id === u.id)
      if (debuffs.length >= 4) {
        const c = G.friend_struggling(u.username || 'Your ally')
        fire(`friend_struggling_${u.id}`, c.title, c.body)
      }
    }
  }

  if (prefs.guild_party_events) {
    const hangoverUsers = new Set(
      (effects || []).filter(e => ['full_hangover','mild_hangover'].includes(e.effect_key)).map(e => e.user_id)
    )
    if (hangoverUsers.size === allIds.length && allIds.length >= 2) {
      const c = G.party_hangover(guild.name)
      fire('party_hangover', c.title, c.body)
    }

    const { data: todayLogs } = await supabase
      .from('events').select('user_id')
      .in('user_id', allIds).gte('logged_at', startOfToday())
    if (!todayLogs?.length) {
      const c = G.guild_silent(guild.name)
      fire('guild_silent', c.title, c.body)
    }
  }
}

async function runStreaks(userId, fire) {
  const logs = await streakLogDays(userId)
  if      (logs === 30) { const c = C.log_streak_30; fire('log_30', c.title, c.body) }
  else if (logs === 14) { const c = C.log_streak_14; fire('log_14', c.title, c.body) }
  else if (logs === 7)  { const c = C.log_streak_7;  fire('log_7',  c.title, c.body) }
  else if (logs === 3)  { const c = C.log_streak_3;  fire('log_3',  c.title, c.body) }

  const sleep = await streakGoodSleep(userId)
  if      (sleep === 7) { const c = C.sleep_streak_7; fire('sleep_7', c.title, c.body) }
  else if (sleep === 3) { const c = C.sleep_streak_3; fire('sleep_3', c.title, c.body) }
}

// ── Helpers ──
function startOfToday() {
  const d = new Date(); d.setHours(0,0,0,0); return d.toISOString()
}
function startOfYesterday() {
  const d = new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); return d.toISOString()
}
async function recentCount(userId, type, days) {
  const since = new Date(); since.setDate(since.getDate()-days)
  const { data } = await supabase.from('events').select('id')
    .eq('user_id', userId).eq('type', type).gte('logged_at', since.toISOString())
  return data?.length || 0
}
async function streakSleepBad(userId) {
  const { data } = await supabase.from('active_effects').select('created_at')
    .eq('user_id', userId).in('effect_key', ['sleep_deprived','partial_rest'])
    .order('created_at', { ascending: false }).limit(10)
  if (!data?.length) return 0
  let n = 0; const today = new Date()
  for (let i = 0; i < 5; i++) {
    const d = new Date(today); d.setDate(d.getDate()-i)
    if (data.some(e => new Date(e.created_at).toDateString() === d.toDateString())) n++
    else break
  }
  return n
}
async function streakGoodSleep(userId) {
  const { data } = await supabase.from('active_effects').select('created_at')
    .eq('user_id', userId).eq('effect_key', 'well_rested')
    .order('created_at', { ascending: false }).limit(14)
  if (!data?.length) return 0
  let n = 0; const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(d.getDate()-i)
    if (data.some(e => new Date(e.created_at).toDateString() === d.toDateString())) n++
    else break
  }
  return n
}
async function streakLogDays(userId) {
  const { data } = await supabase.from('events').select('logged_at')
    .eq('user_id', userId).order('logged_at', { ascending: false }).limit(60)
  if (!data?.length) return 0
  const days = new Set(data.map(e => new Date(e.logged_at).toDateString()))
  let n = 0; const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(d.getDate()-i)
    if (days.has(d.toDateString())) n++
    else break
  }
  return n
}

// ── Hook ──
export function useNotifications(session) {
  if (!session) return
  const run = async () => {
    const granted = await requestPermission()
    if (!granted) return
    const prefs = await loadNotifPrefs(session.user.id)
    await runNotificationEngine(session.user.id, prefs)
  }
  run()
}
