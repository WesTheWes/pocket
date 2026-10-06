import { doneFacts, ordinal } from '../../domain/celebrate'
import type { Attempt, Goal } from '../../domain/schemas'
import { formatTimeAgo } from '../../lib/formatDate'

const DAY = 24 * 60 * 60 * 1000

/** "Solid at 84 BPM, on your 9th attempt. Up from 60 three weeks ago." */
export function doneStory(goal: Goal, attempts: Attempt[], now: number): string {
  const facts = doneFacts(goal, attempts)
  const head = facts.fastest === null ? 'Solid' : `Solid at ${facts.fastest} BPM`
  const took =
    facts.attemptCount > 1 ? `, on your ${ordinal(facts.attemptCount)} attempt` : ', first time'
  const climbed =
    facts.firstBpm !== null &&
    facts.fastest !== null &&
    facts.fastest > facts.firstBpm &&
    facts.firstAt !== null
  const from = !climbed
    ? ''
    : now - facts.firstAt! < DAY
      ? ` Up from ${facts.firstBpm} today.`
      : ` Up from ${facts.firstBpm} ${formatTimeAgo(facts.firstAt!, now).toLowerCase()}.`
  return `${head}${took}.${from}`
}
