export type ReviewRating = 1 | 2 | 3 | 4
export type MasteryState = 'new' | 'learning' | 'review' | 'mastered'
export type LearningMode = 'flash' | 'connect' | 'listen' | 'spell' | 'dictation'
export interface Word {
  id: string; word: string; ipa: string; meaning: string; pos: string
  phonics: string[]; phonemes: string[]; syllables: string[]
  audio: string; image: string; example: string; unit: string; lesson: string
  difficulty: number; distractors: string[]
}
export interface Lesson { id: string; name: string; unit: string; wordIds: string[] }
export interface MemoryCard {
  wordId: string; due: string; stability: number; difficulty: number
  elapsed_days: number; scheduled_days: number; reps: number; lapses: number
  learning_steps: number; state: number; last_review?: string
  strategy: 'fsrs' | 'sm2' | 'legacy'; legacyStep?: number; ease?: number
}
export interface ReviewResult { card: MemoryCard; rating: ReviewRating; reviewedAt: string; nextDue: string }
export interface ReviewScheduler {
  schedule(card: MemoryCard, rating: ReviewRating, now: Date): ReviewResult
  getDueCards(now: Date): MemoryCard[]
}
export interface Answer {
  id: string; wordId: string; rating: ReviewRating; correct: boolean; at: string
  source: 'review_due' | 'new_word'; mode: LearningMode; input: string
}
export interface LearningSession {
  id: string; startedAt: string; date: string; kind: 'review_due' | 'new_word' | 'practice'
  wordIds: string[]; index: number; mode: LearningMode; input: string
  revealed: boolean; selected: string; answers: Answer[]; completedAt?: string
}
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export function mastery(card?: MemoryCard): MasteryState {
  if (!card) return 'new'
  if (card.state === 2) return card.stability >= 21 ? 'mastered' : 'review'
  return 'learning'
}
export function canUnlockNextUnit(answers: Answer[]) {
  return answers.length > 0 && answers.filter(a => a.correct).length / answers.length >= .8
}
