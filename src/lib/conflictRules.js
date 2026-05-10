// ─────────────────────────────────────────────────────────────
//  conflictRules.js
//  Drop into: src/lib/conflictRules.js
//
//  Detects contradictions and mutual exclusions between events
//  logged on the same calendar day.
//
//  Usage:
//    import { checkConflicts } from '../lib/conflictRules'
//    const conflict = checkConflicts('rest_day', todayEventTypes)
//    if (conflict) { /* show warning modal */ }
// ─────────────────────────────────────────────────────────────

/**
 * CONFLICT_RULES
 * Each rule fires when the *incoming* event key matches `incoming`
 * and any of the `existingKeys` have already been logged today.
 *
 *   severity: 'block'  — logically impossible, requires resolution
 *             'warn'   — suspicious / contradictory, player chooses
 *
 *   resolution (optional):
 *     'cancel_new'    — discard the new event, keep existing
 *     'cancel_old'    — remove the existing effect, keep new
 *     'allow_both'    — let both stand (warn only)
 *     null            — ask the player what to do
 */
export const CONFLICT_RULES = [

  // ── Absolute mutual exclusions ─────────────────────────────

  {
    id: 'rest_vs_exercise',
    incoming: 'exercise',
    existingKeys: ['rest_day'],
    severity: 'block',
    title: 'Rest Day Contradiction',
    message:
      'You marked today as a Rest Day, yet you also trained. ' +
      'A true rest day means no training — which is it, adventurer?',
    options: [
      { label: 'I rested (remove Training)', resolution: 'cancel_new' },
      { label: 'I trained (remove Rest Day)', resolution: 'cancel_old' },
    ],
  },

  {
    id: 'exercise_vs_rest',
    incoming: 'rest_day',
    existingKeys: ['exercise'],
    severity: 'block',
    title: 'Rest Day Contradiction',
    message:
      'You already logged a Training session today. ' +
      'You cannot also declare a Rest Day — which stands?',
    options: [
      { label: 'I rested (remove Training)', resolution: 'cancel_old' },
      { label: 'I trained (remove Rest Day)', resolution: 'cancel_new' },
    ],
  },

  {
    id: 'social_vs_solitude',
    incoming: 'social',
    existingKeys: ['recharge'],
    severity: 'block',
    title: 'Social vs Solitude',
    message:
      'You logged a Solitude day, but now you\'re logging Fellowship. ' +
      'These cannot coexist — a day cannot be both.',
    options: [
      { label: 'I was social (remove Solitude)', resolution: 'cancel_old' },
      { label: 'I was alone (remove Fellowship)', resolution: 'cancel_new' },
    ],
  },

  {
    id: 'solitude_vs_social',
    incoming: 'recharge',
    existingKeys: ['social'],
    severity: 'block',
    title: 'Solitude vs Social',
    message:
      'You already logged Fellowship today. ' +
      'A Solitude day and a social day cannot both be true.',
    options: [
      { label: 'I was alone (remove Fellowship)', resolution: 'cancel_old' },
      { label: 'I was social (remove Solitude)', resolution: 'cancel_new' },
    ],
  },

  // ── Suspicious / warn-level conflicts ─────────────────────

  {
    id: 'rest_vs_stress',
    incoming: 'rest_day',
    existingKeys: ['stress'],
    severity: 'warn',
    title: 'Restful Yet Stressed?',
    message:
      'You logged Dark Times but are also claiming a Rest Day. ' +
      'A rest day while under heavy stress is questionable — are you sure?',
    options: [
      { label: 'Yes, I rested despite the stress', resolution: 'allow_both' },
      { label: 'Remove Rest Day — it wasn\'t really rest', resolution: 'cancel_new' },
    ],
  },

  {
    id: 'alcohol_vs_training',
    incoming: 'exercise',
    existingKeys: ['alcohol'],
    severity: 'warn',
    title: 'Training After Drinking?',
    message:
      'You logged alcohol today and are now logging Training. ' +
      'Training under the influence reduces real gains. Continue?',
    options: [
      { label: 'Yes, I trained regardless', resolution: 'allow_both' },
      { label: 'Scratch the training', resolution: 'cancel_new' },
    ],
  },

  {
    id: 'good_meal_vs_junk',
    incoming: 'junk',
    existingKeys: ['meal'],
    severity: 'warn',
    title: 'Mixed Provisions',
    message:
      'You logged a Good Meal and Junk Food today. ' +
      'Both can stand, but the junk will diminish the meal\'s benefits.',
    options: [
      { label: 'Both happened — log both', resolution: 'allow_both' },
      { label: 'Just the junk (remove Good Meal)', resolution: 'cancel_old' },
    ],
  },

  {
    id: 'meal_vs_junk',
    incoming: 'meal',
    existingKeys: ['junk'],
    severity: 'warn',
    title: 'Mixed Provisions',
    message:
      'You already logged Junk Food today. ' +
      'A Good Meal can still be added, though junk food buffs may be diminished.',
    options: [
      { label: 'Both happened — log both', resolution: 'allow_both' },
      { label: 'Cancel the Good Meal', resolution: 'cancel_new' },
    ],
  },

  // ── Diminishing returns / stacking suspicion ───────────────

  {
    id: 'double_rest',
    incoming: 'rest_day',
    existingKeys: ['rest_day'],
    severity: 'block',
    title: 'Already Resting',
    message:
      'You have already declared a Rest Day today. ' +
      'A day can only be a rest day once.',
    options: [
      { label: 'Understood — cancel this', resolution: 'cancel_new' },
    ],
  },

  {
    id: 'double_social',
    incoming: 'social',
    existingKeys: ['social'],
    severity: 'warn',
    title: 'Multiple Fellowship Events',
    message:
      'You\'ve already logged Fellowship today. ' +
      'Multiple social events in one day — are you sure you want to log again?',
    options: [
      { label: 'Yes, second social event', resolution: 'allow_both' },
      { label: 'No, cancel this', resolution: 'cancel_new' },
    ],
  },

  {
    id: 'double_stress',
    incoming: 'stress',
    existingKeys: ['stress'],
    severity: 'warn',
    title: 'Already Afflicted',
    message:
      'Dark Times already weighs on you today. ' +
      'Logging it again will stack the debuff further.',
    options: [
      { label: 'Yes — it got worse', resolution: 'allow_both' },
      { label: 'No — cancel this', resolution: 'cancel_new' },
    ],
  },

]

// ─────────────────────────────────────────────────────────────
//  checkConflicts
//
//  @param {string}   incomingKey   — the event type being logged
//  @param {string[]} todayKeys     — event type keys logged today so far
//  @returns {object|null}          — the first matching rule, or null
// ─────────────────────────────────────────────────────────────
export function checkConflicts(incomingKey, todayKeys) {
  for (const rule of CONFLICT_RULES) {
    if (rule.incoming !== incomingKey) continue
    if (rule.existingKeys.some(k => todayKeys.includes(k))) {
      return rule
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
//  resolveConflict
//
//  Returns what should happen after the player picks an option.
//
//  @param {string} resolution  — from the chosen option
//  @param {string} oldKey      — the existing event key to cancel (if needed)
//  @returns {{ proceed: bool, cancelExistingKey: string|null }}
// ─────────────────────────────────────────────────────────────
export function resolveConflict(resolution, conflictRule) {
  switch (resolution) {
    case 'cancel_new':
      return { proceed: false, cancelExistingKey: null }

    case 'cancel_old':
      // Caller must delete today's events matching conflictRule.existingKeys
      return { proceed: true, cancelExistingKey: conflictRule.existingKeys[0] }

    case 'allow_both':
    default:
      return { proceed: true, cancelExistingKey: null }
  }
}
