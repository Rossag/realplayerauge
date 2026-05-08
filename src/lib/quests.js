import { supabase } from './supabase.js'
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'

// ── Quest definitions ──
export const QUEST_DEFS = {

  // ── Daily ──
  early_night: {
    id: 'early_night', tier: 'daily',
    title: 'The Early Night',
    desc: 'Sleep 7 or more hours tonight. Log it in tomorrow\'s Dawn Briefing.',
    icon: '🌙',
    badge: { icon: '🌙', label: 'Early Night', colour: '#4a70c0' },
    reward_effect: 'well_rested',
    trigger: (data) => data.recentDebuffs.includes('sleep_deprived') || data.avgSleep < 6.5,
    check: async (userId) => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('checkins')
        .select('morning_done').eq('user_id', userId).eq('date', today).maybeSingle()
      const { data: sleepEvent } = await supabase.from('events')
        .select('value').eq('user_id', userId).eq('type', 'sleep')
        .gte('logged_at', startOfDay(new Date()).toISOString())
        .order('logged_at', { ascending: false }).limit(1).maybeSingle()
      return sleepEvent && parseFloat(sleepEvent.value) >= 7
    },
  },

  pilgrims_water: {
    id: 'pilgrims_water', tier: 'daily',
    title: "The Pilgrim's Water",
    desc: 'Log 6 or more glasses of water today.',
    icon: '💧',
    badge: { icon: '💧', label: 'Hydrated', colour: '#3a8fe0' },
    reward_effect: 'hydrated',
    trigger: (data) => data.recentDebuffs.includes('thirsty') || data.avgWater < 4,
    check: async (userId) => {
      const { data } = await supabase.from('events')
        .select('value').eq('user_id', userId).eq('type', 'water')
        .gte('logged_at', startOfDay(new Date()).toISOString())
      const total = (data || []).reduce((s, e) => s + parseFloat(e.value || 0), 0)
      return total >= 6
    },
  },

  clean_plate: {
    id: 'clean_plate', tier: 'daily',
    title: 'The Clean Plate',
    desc: 'Log a healthy meal today — no junk food.',
    icon: '🥗',
    badge: { icon: '🥗', label: 'Clean Plate', colour: '#3d9e5a' },
    reward_effect: 'well_fed',
    trigger: (data) => data.junkDaysRecent >= 2,
    check: async (userId) => {
      const start = startOfDay(new Date()).toISOString()
      const { data: meals } = await supabase.from('events')
        .select('type').eq('user_id', userId)
        .gte('logged_at', start).in('type', ['meal', 'junk'])
      const hasMeal = (meals || []).some(e => e.type === 'meal')
      const hasJunk = (meals || []).some(e => e.type === 'junk')
      return hasMeal && !hasJunk
    },
  },

  quiet_evening: {
    id: 'quiet_evening', tier: 'daily',
    title: 'The Quiet Evening',
    desc: 'No alcohol logged tonight. Let your body recover.',
    icon: '🍵',
    badge: { icon: '🍵', label: 'Temperate', colour: '#8a6e30' },
    reward_effect: null,
    trigger: (data) => data.recentDebuffs.includes('mild_hangover') || data.recentDebuffs.includes('full_hangover') || data.drinkDaysRecent >= 2,
    check: async (userId) => {
      const { data } = await supabase.from('events')
        .select('id').eq('user_id', userId).eq('type', 'alcohol')
        .gte('logged_at', startOfDay(new Date()).toISOString())
      return !data || data.length === 0
    },
  },

  first_light: {
    id: 'first_light', tier: 'daily',
    title: 'First Light',
    desc: 'Complete your Dawn Briefing before 9am.',
    icon: '🌅',
    badge: { icon: '🌅', label: 'First Light', colour: '#c9a84c' },
    reward_effect: null,
    trigger: () => true, // always available
    check: async (userId) => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('checkins')
        .select('morning_done, morning_at').eq('user_id', userId).eq('date', today).maybeSingle()
      if (!data?.morning_done || !data?.morning_at) return false
      return new Date(data.morning_at).getHours() < 9
    },
  },

  training_day: {
    id: 'training_day', tier: 'daily',
    title: 'The Training Ground',
    desc: 'Log a workout of any intensity today.',
    icon: '⚔️',
    badge: { icon: '⚔️', label: 'Trained', colour: '#c05030' },
    reward_effect: 'post_workout',
    trigger: (data) => data.exerciseDaysRecent === 0,
    check: async (userId) => {
      const { data } = await supabase.from('events')
        .select('id').eq('user_id', userId).eq('type', 'exercise')
        .gte('logged_at', startOfDay(new Date()).toISOString())
      return data && data.length > 0
    },
  },

  // ── Weekly ──
  well_rested_warrior: {
    id: 'well_rested_warrior', tier: 'weekly',
    title: 'The Well Rested Warrior',
    desc: 'Sleep 7+ hours on 5 nights this week.',
    icon: '🏆',
    badge: { icon: '🏆', label: 'Well Rested Warrior', colour: '#c9a84c' },
    reward_effect: 'well_rested',
    check: async (userId) => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const { data } = await supabase.from('events')
        .select('value, logged_at').eq('user_id', userId).eq('type', 'sleep')
        .gte('logged_at', weekStart)
      const goodNights = (data || []).filter(e => parseFloat(e.value) >= 7)
      return goodNights.length >= 5
    },
  },

  temperate_knight: {
    id: 'temperate_knight', tier: 'weekly',
    title: 'The Temperate Knight',
    desc: 'Keep total alcohol under 6 units across the whole week.',
    icon: '🛡️',
    badge: { icon: '🛡️', label: 'Temperate Knight', colour: '#8060c0' },
    reward_effect: null,
    check: async (userId) => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const { data } = await supabase.from('events')
        .select('value').eq('user_id', userId).eq('type', 'alcohol')
        .gte('logged_at', weekStart)
      const total = (data || []).reduce((s, e) => s + parseFloat(e.value || 0), 0)
      return total < 6
    },
  },

  disciplined_body: {
    id: 'disciplined_body', tier: 'weekly',
    title: 'The Disciplined Body',
    desc: 'Train at least 3 times this week.',
    icon: '💪',
    badge: { icon: '💪', label: 'Disciplined', colour: '#c05030' },
    reward_effect: 'post_workout',
    check: async (userId) => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const { data } = await supabase.from('events')
        .select('logged_at').eq('user_id', userId).eq('type', 'exercise')
        .gte('logged_at', weekStart)
      const days = new Set((data || []).map(e => new Date(e.logged_at).toDateString()))
      return days.size >= 3
    },
  },

  chronicle_keeper: {
    id: 'chronicle_keeper', tier: 'weekly',
    title: 'The Chronicle Keeper',
    desc: 'Complete both check-ins for 5 days this week.',
    icon: '📜',
    badge: { icon: '📜', label: 'Chronicle Keeper', colour: '#8a6e30' },
    reward_effect: null,
    check: async (userId) => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0]
      const { data } = await supabase.from('checkins')
        .select('morning_done, evening_done')
        .eq('user_id', userId).gte('date', weekStart)
      const fullDays = (data || []).filter(d => d.morning_done && d.evening_done)
      return fullDays.length >= 5
    },
  },

  // ── Challenge ──
  dry_fortnight: {
    id: 'dry_fortnight', tier: 'challenge',
    title: 'The Dry Fortnight',
    desc: 'No alcohol for 14 consecutive days. Your liver will thank you.',
    icon: '🏺',
    badge: { icon: '🏺', label: 'The Dry Fortnight', colour: '#4a70c0' },
    reward_effect: 'well_rested',
    check: async (userId) => {
      const since = subDays(new Date(), 14).toISOString()
      const { data } = await supabase.from('events')
        .select('id').eq('user_id', userId).eq('type', 'alcohol')
        .gte('logged_at', since)
      return !data || data.length === 0
    },
  },

  iron_discipline: {
    id: 'iron_discipline', tier: 'challenge',
    title: 'The Iron Discipline',
    desc: '7+ hours sleep for 14 consecutive nights.',
    icon: '⚙️',
    badge: { icon: '⚙️', label: 'Iron Discipline', colour: '#8a6e30' },
    reward_effect: 'deep_sleep',
    check: async (userId) => {
      const since = subDays(new Date(), 14).toISOString()
      const { data } = await supabase.from('events')
        .select('value, logged_at').eq('user_id', userId).eq('type', 'sleep')
        .gte('logged_at', since).order('logged_at', { ascending: false })
      if (!data || data.length < 14) return false
      const days = new Map()
      data.forEach(e => { days.set(new Date(e.logged_at).toDateString(), parseFloat(e.value)) })
      for (let i = 0; i < 14; i++) {
        const d = subDays(new Date(), i).toDateString()
        if (!days.has(d) || days.get(d) < 7) return false
      }
      return true
    },
  },

  faithful_scribe: {
    id: 'faithful_scribe', tier: 'challenge',
    title: 'The Faithful Scribe',
    desc: 'Complete every morning and evening check-in for 30 days straight.',
    icon: '✒️',
    badge: { icon: '✒️', label: 'Faithful Scribe', colour: '#c9a84c' },
    reward_effect: null,
    check: async (userId) => {
      const since = subDays(new Date(), 30).toISOString().split('T')[0]
      const { data } = await supabase.from('checkins')
        .select('morning_done, evening_done, date')
        .eq('user_id', userId).gte('date', since)
      if (!data || data.length < 30) return false
      return data.every(d => d.morning_done && d.evening_done)
    },
  },

  hydration_oath: {
    id: 'hydration_oath', tier: 'challenge',
    title: 'The Hydration Oath',
    desc: '6+ glasses of water every day for 14 days.',
    icon: '🌊',
    badge: { icon: '🌊', label: 'Hydration Oath', colour: '#3a8fe0' },
    reward_effect: 'hydrated',
    check: async (userId) => {
      const since = subDays(new Date(), 14).toISOString()
      const { data } = await supabase.from('events')
        .select('value, logged_at').eq('user_id', userId).eq('type', 'water')
        .gte('logged_at', since)
      const byDay = {}
      ;(data || []).forEach(e => {
        const day = new Date(e.logged_at).toDateString()
        byDay[day] = (byDay[day] || 0) + parseFloat(e.value || 0)
      })
      for (let i = 0; i < 14; i++) {
        const d = subDays(new Date(), i).toDateString()
        if (!byDay[d] || byDay[d] < 6) return false
      }
      return true
    },
  },
}

// ── Generate today's daily quests (max 2, based on user data) ──
export async function generateDailyQuests(userId) {
  const since7 = subDays(new Date(), 7).toISOString()
  const since3 = subDays(new Date(), 3).toISOString()

  // Gather user data for trigger evaluation
  const [effectsRes, eventsRes, drinkRes, junkRes, exerciseRes] = await Promise.all([
    supabase.from('active_effects').select('effect_key').eq('user_id', userId).gt('expires_at', new Date().toISOString()),
    supabase.from('events').select('type, value, logged_at').eq('user_id', userId).gte('logged_at', since7),
    supabase.from('events').select('logged_at').eq('user_id', userId).eq('type', 'alcohol').gte('logged_at', since3),
    supabase.from('events').select('logged_at').eq('user_id', userId).eq('type', 'junk').gte('logged_at', since3),
    supabase.from('events').select('logged_at').eq('user_id', userId).eq('type', 'exercise').gte('logged_at', since7),
  ])

  const recentDebuffs = (effectsRes.data || []).map(e => e.effect_key)
  const events = eventsRes.data || []

  const sleepEvents = events.filter(e => e.type === 'sleep')
  const waterEvents = events.filter(e => e.type === 'water')
  const avgSleep = sleepEvents.length
    ? sleepEvents.reduce((s, e) => s + parseFloat(e.value), 0) / sleepEvents.length
    : 7
  const avgWater = waterEvents.length
    ? waterEvents.reduce((s, e) => s + parseFloat(e.value), 0) / waterEvents.length
    : 4

  const drinkDays = new Set((drinkRes.data || []).map(e => new Date(e.logged_at).toDateString()))
  const junkDays  = new Set((junkRes.data || []).map(e => new Date(e.logged_at).toDateString()))
  const exDays    = new Set((exerciseRes.data || []).map(e => new Date(e.logged_at).toDateString()))

  const triggerData = {
    recentDebuffs,
    avgSleep,
    avgWater,
    drinkDaysRecent: drinkDays.size,
    junkDaysRecent: junkDays.size,
    exerciseDaysRecent: exDays.size,
  }

  // Filter daily quests that trigger
  const dailyDefs = Object.values(QUEST_DEFS).filter(q => q.tier === 'daily')
  const triggered = dailyDefs.filter(q => q.trigger(triggerData))

  // Always include first_light, then fill up to 2 from triggered
  const selected = []
  const firstLight = QUEST_DEFS['first_light']
  if (firstLight.trigger(triggerData)) selected.push(firstLight)

  for (const q of triggered) {
    if (selected.length >= 2) break
    if (!selected.find(s => s.id === q.id)) selected.push(q)
  }

  // If still less than 2, pad with training_day
  if (selected.length < 2 && !selected.find(s => s.id === 'training_day')) {
    selected.push(QUEST_DEFS['training_day'])
  }

  return selected.slice(0, 2)
}

// ── Check completion and award badge ──
export async function checkAndAwardQuest(userId, questId) {
  const def = QUEST_DEFS[questId]
  if (!def) return false

  const completed = await def.check(userId)
  if (!completed) return false

  const today = new Date().toISOString().split('T')[0]
  const midnight = new Date()
  midnight.setHours(23, 59, 59, 999)

  // Upsert the quest completion
  await supabase.from('quest_completions').upsert({
    user_id: userId,
    quest_id: questId,
    completed_at: new Date().toISOString(),
    badge_expires_at: midnight.toISOString(),
    tier: def.tier,
  }, { onConflict: 'user_id,quest_id,date' })

  // Award reward effect if defined
  if (def.reward_effect) {
    const { EFFECT_DEFS, buildExpiresAt, buildStartsAt } = await import('./engine.js')
    const effectDef = EFFECT_DEFS[def.reward_effect]
    if (effectDef) {
      await supabase.from('active_effects').insert({
        user_id: userId,
        effect_key: def.reward_effect,
        starts_at: new Date().toISOString(),
        expires_at: buildExpiresAt(def.reward_effect),
        stat_deltas: effectDef.stats || {},
      })
    }
  }

  return true
}

// ── Load active quests + completion status for today ──
export async function loadQuestStatus(userId) {
  const today = new Date().toISOString().split('T')[0]
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0]

  // Today's completions
  const { data: completions } = await supabase
    .from('quest_completions').select('quest_id, badge_expires_at, completed_at')
    .eq('user_id', userId).gte('completed_at', `${today}T00:00:00`)

  const completedIds = new Set((completions || []).map(c => c.quest_id))
  const completionMap = {}
  ;(completions || []).forEach(c => { completionMap[c.quest_id] = c })

  // Active badges — only those not yet expired
  const now = new Date().toISOString()
  const activeBadges = (completions || []).filter(c => c.badge_expires_at > now)

  // Generate daily quests
  const daily = await generateDailyQuests(userId)

  // Weekly quests — fixed set
  const weekly = Object.values(QUEST_DEFS).filter(q => q.tier === 'weekly')

  // Challenge quest — load user's active challenge from DB
  const { data: activeChallenge } = await supabase
    .from('active_challenges').select('quest_id')
    .eq('user_id', userId).maybeSingle()

  const challenge = activeChallenge
    ? [QUEST_DEFS[activeChallenge.quest_id]].filter(Boolean)
    : []

  const challengeOptions = Object.values(QUEST_DEFS).filter(q => q.tier === 'challenge')

  return {
    daily,
    weekly,
    challenge,
    challengeOptions,
    completedIds,
    completionMap,
    activeBadges,
  }
}

// ── Set active challenge ──
export async function setActiveChallenge(userId, questId) {
  await supabase.from('active_challenges').upsert({
    user_id: userId,
    quest_id: questId,
    started_at: new Date().toISOString(),
  })
}
