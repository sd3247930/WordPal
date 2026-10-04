import { createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs'
import type { MemoryCard, ReviewRating, ReviewResult, ReviewScheduler } from '../core_learning'
const engine = fsrs({ request_retention: .9, maximum_interval: 365, enable_fuzz: false })
const DAY = 86400000
function serialize(card: Card, wordId: string): MemoryCard {
  return { ...card, wordId, strategy: 'fsrs', due: card.due.toISOString(), last_review: card.last_review?.toISOString() }
}
export function newCard(wordId: string, now = new Date()): MemoryCard { return serialize(createEmptyCard(now), wordId) }
export class FSRSScheduler implements ReviewScheduler {
  constructor(private cards: MemoryCard[] = []) {}
  schedule(card: MemoryCard, rating: ReviewRating, now: Date): ReviewResult {
    const restored: Card = { ...card, due: new Date(card.due), last_review: card.last_review ? new Date(card.last_review) : undefined }
    const next = serialize(engine.next(restored, now, rating as Grade).card, card.wordId)
    return { card: next, rating, reviewedAt: now.toISOString(), nextDue: next.due }
  }
  getDueCards(now: Date) { return this.cards.filter(c => new Date(c.due).getTime() <= now.getTime()).sort((a,b) => Date.parse(a.due) - Date.parse(b.due)) }
}
// Explicit compatibility only. The application always constructs FSRSScheduler.
export class LegacyScheduleStrategy implements ReviewScheduler {
  constructor(private cards: MemoryCard[] = []) {}
  schedule(card: MemoryCard, rating: ReviewRating, now: Date): ReviewResult {
    const step = rating === 1 ? 0 : Math.min((card.legacyStep ?? -1) + 1, 4)
    const days = [2,4,7,15,30][step]
    const next = { ...card, strategy: 'legacy' as const, legacyStep: step, scheduled_days:days,last_review:now.toISOString(), due: new Date(+now + days * DAY).toISOString(), reps: card.reps+1 }
    return {card: next, rating, reviewedAt: now.toISOString(), nextDue: next.due}
  }
  getDueCards(now: Date) { return this.cards.filter(c => +new Date(c.due) <= +now) }
}
export class SM2Strategy extends LegacyScheduleStrategy {
  schedule(card: MemoryCard, rating: ReviewRating, now: Date): ReviewResult {
    const ease = Math.max(1.3, (card.ease ?? 2.5) + (rating === 1 ? -.2 : rating === 2 ? -.15 : rating === 4 ? .15 : 0))
    const days = rating === 1 ? 1 : card.reps === 0 ? 1 : card.reps === 1 ? 6 : Math.round(Math.max(1,card.scheduled_days) * ease)
    const next = {...card, strategy: 'sm2' as const, ease, due:new Date(+now+days*DAY).toISOString(), scheduled_days:days,reps:card.reps+1,lapses:card.lapses+(rating===1?1:0)}
    return {card:next,rating,reviewedAt:now.toISOString(),nextDue:next.due}
  }
}
export function migrateLegacy(card: MemoryCard): MemoryCard {
  const seed = newCard(card.wordId, new Date(card.due))
  return {...seed, due:card.due, reps:card.reps, lapses:card.lapses, stability:Math.max(.1, card.scheduled_days), difficulty:5, state:card.reps ? 2 : 0, last_review:card.last_review}
}
