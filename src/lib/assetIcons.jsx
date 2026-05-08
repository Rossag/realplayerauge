// Maps effect_key and stat keys to real asset PNG paths
// Falls back to emoji if no asset exists

export const EFFECT_ICON_MAP = {
  // Sleep
  well_rested:      '/assets/effect_well_rested.png',
  deep_sleep:       '/assets/effect_deep_sleep.png',
  sleep_deprived:   '/assets/effect_sleep_deprived.png',
  partial_rest:     '/assets/effect_partial_rest.png',
  sleep_inertia:    '/assets/effect_sleep_inertia.png',
  sleep_disrupted:  '/assets/effect_sleep_disrupted.png',

  // Alcohol
  social_ease:      '/assets/effect_social_ease.png',
  charisma_surge:   '/assets/effect_charisma_surge.png',
  mild_hangover:    '/assets/effect_mild_hangover.png',
  full_hangover:    '/assets/effect_full_hangover.png',

  // Exercise
  post_workout:     '/assets/effect_post_workout.png',
  active:           '/assets/effect_active.png',
  mild_doms:        '/assets/effect_mild_doms.png',
  doms:             '/assets/effect_doms.png',
  recovery_mode:    '/assets/effect_recovery_mode.png',

  // Nutrition
  well_fed:         '/assets/effect_well_fed.png',
  hungry:           '/assets/effect_hungry.png',
  comfort_boost:    '/assets/effect_comfort_boost.png',
  food_coma:        '/assets/effect_food_coma.png',

  // Hydration
  hydrated:         '/assets/effect_hydrated.png',
  thirsty:          '/assets/effect_thirsty.png',

  // Caffeine
  caffeine_boost:   '/assets/effect_caffeine_boost.png',
  jittery:          '/assets/effect_jittery.png',
  late_caffeine:    '/assets/effect_late_caffeine.png',

  // Social / mood
  connected:        '/assets/effect_connected.png',
  social_afterglow: '/assets/effect_social_afterglow.png',
  recharged:        '/assets/effect_recharged.png',
  stressed:         '/assets/effect_stressed.png',

  // Sun
  sun_kissed:       '/assets/effect_sun_kissed.png',
  circadian_sync:   '/assets/effect_circadian_sync.png',
}

export const STAT_ICON_MAP = {
  energy:   '/assets/icon_energy.png',
  focus:    '/assets/icon_focus.png',
  mood:     '/assets/icon_mood.png',
  charisma: '/assets/icon_charisma.png',
  strength: '/assets/icon_power.png',
  recovery: '/assets/icon_recovery.png',
}

// Returns an <img> element or falls back to emoji span
export function EffectIcon({ effectKey, emoji, size = 28, style = {} }) {
  const src = EFFECT_ICON_MAP[effectKey]
  if (src) {
    return (
      <img
        src={src}
        alt={effectKey}
        style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated', ...style }}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'inline') }}
      />
    )
  }
  return <span style={{ fontSize: size * 0.8, lineHeight: 1, ...style }}>{emoji}</span>
}

export function StatIcon({ stat, size = 20, style = {} }) {
  const src = STAT_ICON_MAP[stat]
  if (src) {
    return (
      <img
        src={src}
        alt={stat}
        style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated', ...style }}
      />
    )
  }
  return null
}
