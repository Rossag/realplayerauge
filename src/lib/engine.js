import { addHours, addDays, startOfDay, endOfDay } from 'date-fns'

// Stat keys used across the app
export const STATS = ['energy', 'focus', 'mood', 'charisma', 'strength', 'recovery']

export const STAT_LABELS = {
  energy:   'Energy',
  focus:    'Focus',
  mood:     'Mood',
  charisma: 'Charisma',
  strength: 'Strength',
  recovery: 'Recovery',
}

export const STAT_COLOURS = {
  energy:   '#c9a84c',  // gold
  focus:    '#4a70c0',  // sapphire
  mood:     '#3d9e5a',  // forest green
  charisma: '#c06080',  // rose
  strength: '#c05030',  // crimson bronze
  recovery: '#8060c0',  // amethyst
}

// Base stats — 50 is neutral, 0-100 range
export const BASE_STATS = {
  energy: 50, focus: 50, mood: 50, charisma: 50, strength: 50, recovery: 50
}

// ─────────────────────────────────────────────────────────────
//  EFFECT DEFINITIONS
//  type: 'buff' | 'debuff'
//  stats: stat deltas applied while active
//  durationHours: how long it lasts
//  nextDay: true = effect starts at midnight tonight
// ─────────────────────────────────────────────────────────────
export const EFFECT_DEFS = {

  // ── Sleep ─────────────────────────────────────────────────
  well_rested: {
    name: 'Well Rested',
    type: 'buff',
    stats: { energy: 20, focus: 15, mood: 10, recovery: 10 },
    durationHours: 18,
    icon: '🌙',
  },
  deep_sleep: {
    name: 'Dream Phase',
    type: 'buff',
    stats: { focus: 10, mood: 8 },
    durationHours: 12,
    icon: '✨',
  },
  sleep_deprived: {
    name: 'Sleep Deprived',
    type: 'debuff',
    stats: { energy: -20, focus: -18, mood: -12, charisma: -8 },
    durationHours: 20,
    icon: '😴',
  },
  partial_rest: {
    name: 'Partially Rested',
    type: 'debuff',
    stats: { energy: -8, focus: -10 },
    durationHours: 6,
    icon: '😑',
  },
  sleep_inertia: {
    name: 'Sleep Inertia',
    type: 'debuff',
    stats: { focus: -12, energy: -8 },
    durationHours: 2,
    icon: '🥱',
  },

  // ── Alcohol ───────────────────────────────────────────────
  social_ease: {
    name: 'Social Ease',
    type: 'buff',
    stats: { charisma: 10, mood: 8 },
    durationHours: 2,
    icon: '🍻',
  },
  charisma_surge: {
    name: 'Charisma Surge',
    type: 'buff',
    stats: { charisma: 20, mood: 12 },
    durationHours: 3,
    icon: '⚡',
  },
  mild_hangover: {
    name: 'Mild Hangover',
    type: 'debuff',
    stats: { focus: -12, energy: -10, mood: -8 },
    durationHours: 10,
    nextDay: true,
    icon: '🤕',
  },
  full_hangover: {
    name: 'Full Hangover',
    type: 'debuff',
    stats: { energy: -25, focus: -20, mood: -18, charisma: -15, recovery: -10 },
    durationHours: 16,
    nextDay: true,
    icon: '💀',
  },
  sleep_disrupted: {
    name: 'Sleep Disrupted',
    type: 'debuff',
    stats: { recovery: -12 },
    durationHours: 8,
    nextDay: true,
    icon: '😵',
  },

  // ── Exercise ──────────────────────────────────────────────
  post_workout: {
    name: 'Post-Workout High',
    type: 'buff',
    stats: { strength: 18, mood: 14, energy: 10 },
    durationHours: 5,
    icon: '💪',
  },
  active: {
    name: 'Active',
    type: 'buff',
    stats: { mood: 10, energy: 8 },
    durationHours: 6,
    icon: '🚶',
  },
  mild_doms: {
    name: 'Mild DOMS',
    type: 'debuff',
    stats: { strength: -10 },
    durationHours: 24,
    nextDay: true,
    icon: '🦵',
  },
  doms: {
    name: 'DOMS',
    type: 'debuff',
    stats: { strength: -20, energy: -8 },
    durationHours: 36,
    nextDay: true,
    icon: '🦵',
  },

  // ── Rest day ──────────────────────────────────────────────
  recovery_mode: {
    name: 'Recovery Mode',
    type: 'buff',
    stats: { recovery: 15, strength: 8 },
    durationHours: 20,
    icon: '🛌',
  },

  // ── Food ──────────────────────────────────────────────────
  well_fed: {
    name: 'Well Fed',
    type: 'buff',
    stats: { energy: 12, recovery: 8 },
    durationHours: 4,
    icon: '🥗',
  },
  hungry: {
    name: 'Hungry',
    type: 'debuff',
    stats: { focus: -12, mood: -10, energy: -8 },
    durationHours: 3,
    icon: '😤',
  },
  comfort_boost: {
    name: 'Comfort Boost',
    type: 'buff',
    stats: { mood: 8 },
    durationHours: 1,
    icon: '🍔',
  },
  food_coma: {
    name: 'Food Coma',
    type: 'debuff',
    stats: { focus: -12, energy: -10 },
    durationHours: 2,
    icon: '😪',
  },

  // ── Water ─────────────────────────────────────────────────
  hydrated: {
    name: 'Hydrated',
    type: 'buff',
    stats: { focus: 10, recovery: 8, energy: 6 },
    durationHours: 6,
    icon: '💧',
  },
  thirsty: {
    name: 'Thirsty',
    type: 'debuff',
    stats: { focus: -8, energy: -6 },
    durationHours: 4,
    icon: '🏜️',
  },

  // ── Caffeine ──────────────────────────────────────────────
  caffeine_boost: {
    name: 'Caffeine Boost',
    type: 'buff',
    stats: { focus: 14, energy: 10 },
    durationHours: 3,
    icon: '☕',
  },
  jittery: {
    name: 'Jittery',
    type: 'debuff',
    stats: { mood: -8 },
    durationHours: 2,
    icon: '😬',
  },
  late_caffeine: {
    name: 'Wired at Night',
    type: 'debuff',
    stats: { recovery: -14 },
    durationHours: 8,
    nextDay: true,
    icon: '🌙',
  },

  // ── Energy drink ──────────────────────────────────────────
  energy_surge: {
    name: 'Energy Surge',
    type: 'buff',
    stats: { energy: 20, focus: 15 },
    durationHours: 3,
    icon: '⚡',
  },
  energy_crash: {
    name: 'Energy Crash',
    type: 'debuff',
    stats: { energy: -20, focus: -15, mood: -10 },
    durationHours: 4,
    icon: '🪫',
  },

  // ── Social ────────────────────────────────────────────────
  connected: {
    name: 'Connected',
    type: 'buff',
    stats: { mood: 16, charisma: 12 },
    durationHours: 8,
    icon: '🤝',
  },
  social_afterglow: {
    name: 'Social Afterglow',
    type: 'buff',
    stats: { mood: 8 },
    durationHours: 12,
    nextDay: true,
    icon: '😊',
  },

  // ── Recharge / Solitude ───────────────────────────────────
  recharged: {
    name: 'Recharged',
    type: 'buff',
    stats: { focus: 14, mood: 12 },
    durationHours: 12,
    icon: '🔋',
  },

  // ── Stress ────────────────────────────────────────────────
  stressed: {
    name: 'Stressed',
    type: 'debuff',
    stats: { focus: -14, mood: -16, recovery: -10 },
    durationHours: 8,
    icon: '😰',
  },

  // ── Sunlight ──────────────────────────────────────────────
  sun_kissed: {
    name: 'Sun-Kissed',
    type: 'buff',
    stats: { mood: 14, energy: 10 },
    durationHours: 8,
    icon: '☀️',
  },
  circadian_sync: {
    name: 'Circadian Sync',
    type: 'buff',
    stats: { recovery: 12 },
    durationHours: 10,
    icon: '🌅',
  },

  // ── Work (long hours) ─────────────────────────────────────
  grinding: {
    name: 'Grinding',
    type: 'buff',
    stats: { focus: 10 },
    durationHours: 6,
    icon: '🕯️',
  },
  overworked: {
    name: 'Overworked',
    type: 'debuff',
    stats: { energy: -20, focus: -10, mood: -10 },
    durationHours: 18,
    nextDay: true,
    icon: '🧱',
  },

  // ── Travel ────────────────────────────────────────────────
  wanderer_spirit: {
    name: "Wanderer's Spirit",
    type: 'buff',
    stats: { mood: 15 },
    durationHours: 12,
    icon: '🧭',
  },
  road_weary: {
    name: 'Road Weary',
    type: 'debuff',
    stats: { energy: -15, recovery: -10 },
    durationHours: 20,
    nextDay: true,
    icon: '🗺️',
  },

  // ── Big event ─────────────────────────────────────────────
  elated: {
    name: 'Elated',
    type: 'buff',
    stats: { mood: 20, charisma: 15 },
    durationHours: 12,
    icon: '🎉',
  },
  social_drained: {
    name: 'Social Drained',
    type: 'debuff',
    stats: { charisma: -15, energy: -10 },
    durationHours: 16,
    nextDay: true,
    icon: '😶',
  },
}

// ─────────────────────────────────────────────────────────────
//  RESOLVE EFFECTS
//  Maps an event log to a list of effects to apply.
//  Returns: Array of { effectKey }
// ─────────────────────────────────────────────────────────────
export function resolveEffects(eventType, value, metadata = {}) {
  const effects = []
  const now  = new Date()
  const hour = now.getHours()

  switch (eventType) {

    case 'sleep': {
      const hrs = parseFloat(value)
      if (hrs >= 8) {
        effects.push({ effectKey: 'well_rested' })
        effects.push({ effectKey: 'deep_sleep' })
      } else if (hrs >= 7) {
        effects.push({ effectKey: 'well_rested' })
      } else if (hrs >= 5) {
        effects.push({ effectKey: 'partial_rest' })
      } else {
        effects.push({ effectKey: 'sleep_deprived' })
      }
      if (hrs > 10) effects.push({ effectKey: 'sleep_inertia' })
      break
    }

    case 'alcohol': {
      const units = parseFloat(value)
      if (units <= 2) {
        effects.push({ effectKey: 'social_ease' })
      } else if (units <= 5) {
        effects.push({ effectKey: 'charisma_surge' })
        effects.push({ effectKey: 'sleep_disrupted' })
        effects.push({ effectKey: 'mild_hangover' })
      } else {
        effects.push({ effectKey: 'charisma_surge' })
        effects.push({ effectKey: 'sleep_disrupted' })
        effects.push({ effectKey: 'full_hangover' })
      }
      break
    }

    case 'exercise': {
      const mins      = parseFloat(value)
      const intensity = metadata.intensity || 'moderate'
      if (mins < 40) {
        effects.push({ effectKey: 'active' })
      } else if (intensity === 'light') {
        effects.push({ effectKey: 'active' })
      } else if (intensity === 'hard') {
        effects.push({ effectKey: 'post_workout' })
        effects.push({ effectKey: 'doms' })
      } else {
        effects.push({ effectKey: 'post_workout' })
        effects.push({ effectKey: 'mild_doms' })
      }
      break
    }

    case 'rest_day':
      effects.push({ effectKey: 'recovery_mode' })
      break

    case 'meal':
      effects.push({ effectKey: 'well_fed' })
      break

    case 'junk':
      effects.push({ effectKey: 'comfort_boost' })
      effects.push({ effectKey: 'food_coma' })
      break

    case 'water': {
      const glasses = parseFloat(value)
      if (glasses >= 6) effects.push({ effectKey: 'hydrated' })
      else              effects.push({ effectKey: 'thirsty' })
      break
    }

    case 'caffeine': {
      const cups = parseFloat(value)
      if (cups >= 1) effects.push({ effectKey: 'caffeine_boost' })
      if (cups >= 3) effects.push({ effectKey: 'jittery' })
      if (hour >= 15) effects.push({ effectKey: 'late_caffeine' })
      break
    }

    case 'energy_drink': {
      const cans = parseFloat(value)
      // Immediate surge — crash follows as fatigue sets in
      effects.push({ effectKey: 'energy_surge' })
      effects.push({ effectKey: 'energy_crash' })
      // Stacks with caffeine side effects
      if (cans >= 2) effects.push({ effectKey: 'jittery' })
      if (cans >= 3) effects.push({ effectKey: 'sleep_disrupted' })
      break
    }

    case 'social':
      effects.push({ effectKey: 'connected' })
      effects.push({ effectKey: 'social_afterglow' })
      break

    case 'recharge':
      effects.push({ effectKey: 'recharged' })
      break

    case 'stress':
      effects.push({ effectKey: 'stressed' })
      break

    case 'sunlight': {
      const mins = parseFloat(value)
      if (mins >= 20) {
        effects.push({ effectKey: 'sun_kissed' })
        if (hour < 18) effects.push({ effectKey: 'circadian_sync' })
      }
      break
    }

    case 'work_long': {
      const hrs = parseFloat(value)
      // Focus buff while in the grind
      effects.push({ effectKey: 'grinding' })
      // Fatigue compounds — carries to next day at 10h+
      if (hrs >= 10) effects.push({ effectKey: 'overworked' })
      // Extreme hours also wreck sleep
      if (hrs >= 13) effects.push({ effectKey: 'sleep_disrupted' })
      break
    }

    case 'travel':
      // Adventure mood lift + routine disruption next day
      effects.push({ effectKey: 'wanderer_spirit' })
      effects.push({ effectKey: 'road_weary' })
      break

    case 'big_event':
      // Mood + charisma spike now, social drain tomorrow
      effects.push({ effectKey: 'elated' })
      effects.push({ effectKey: 'social_drained' })
      break
  }

  return effects
}

// ─────────────────────────────────────────────────────────────
//  COMPUTE STATS
//  Given a list of active_effects rows, compute current totals
// ─────────────────────────────────────────────────────────────
export function computeStats(activeEffects) {
  const stats = { ...BASE_STATS }
  for (const effect of activeEffects) {
    const deltas = effect.stat_deltas || {}
    for (const [stat, delta] of Object.entries(deltas)) {
      if (stats[stat] !== undefined) {
        stats[stat] = Math.min(100, Math.max(0, stats[stat] + delta))
      }
    }
  }
  return stats
}

// ─────────────────────────────────────────────────────────────
//  TIMESTAMP HELPERS
// ─────────────────────────────────────────────────────────────

// Build the expires_at timestamp for a new effect
export function buildExpiresAt(effectKey) {
  const def = EFFECT_DEFS[effectKey]
  if (!def) return null
  const base = def.nextDay ? startOfDay(addDays(new Date(), 1)) : new Date()
  return addHours(base, def.durationHours).toISOString()
}

// Build the starts_at timestamp — nextDay effects start at midnight tonight
export function buildStartsAt(effectKey) {
  const def = EFFECT_DEFS[effectKey]
  if (!def) return new Date().toISOString()
  if (def.nextDay) return startOfDay(addDays(new Date(), 1)).toISOString()
  return new Date().toISOString()
}
