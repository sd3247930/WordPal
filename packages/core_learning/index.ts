import type {PhonicsData} from '../phonics/types'
import type {LetterBlockDraft} from '../phonics/letter-blocks'
import type {DailyNewWordLimit,EntryLevel} from '../parent_settings'
export type ReviewRating = 1 | 2 | 3 | 4
export type MasteryState = 'new' | 'learning' | 'review' | 'mastered'
export type LearningMode = 'flash' | 'connect' | 'listen' | 'spell' | 'dictation'
export type StudyStep = LearningMode | 'consolidate'
export interface StudyCapability {status:'ready'|'unavailable'|'completed';reason?:string}
export interface AudioEvidence {url:string;requestId:number;heardAt:string}
export interface DailyFlow {
  schemaVersion:1; step:StudyStep; entryLevel:EntryLevel; target:number
  completed:Record<StudyStep,string[]>; attempts:Answer[]; begunAt?:string; finishedDate?:string
  /** First final assessment is independent of the teaching retry/pass state. */
  assessments?:Record<string,string>
  capabilities?:Partial<Record<StudyStep,Record<string,StudyCapability>>>
}
export interface CompletedDailyPlan {
 id:string;courseId:string;date:string;completedAt:string;finishedDate:string
 entryLevel:EntryLevel;target:number;wordIds:string[];contentVersion?:string
 completed:Record<StudyStep,string[]>
}
export interface Word {
  id: string; word: string; ipa: string; meaning: string; pos: string
  phonics: string[]; phonemes: string[]; syllables: string[]
  phonicsData?:PhonicsData
  audio: string; image: string; example: string; unit: string; lesson: string
  difficulty: number; distractors: string[]
  acceptedSpellings?: string[]; senseId?:string; sourceId?:string
  phoneticUK?:string;phoneticUS?:string;audioUK?:string;audioUS?:string;examples?:{en:string;zh:string}[];tags?:string[];learningLevel?:number
}
export interface Lesson { id: string; name: string; unit: string; wordIds: string[];courseId?:string;unitId?:string;activities?:string[];storyId?:string;phonicsRuleIds?:string[];examples?:Record<string,string> }
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
  source: 'review_due' | 'new_word' | 'practice'; mode: LearningMode; input: string
  hinted?:boolean; dueAtSubmit?:string;courseId?:string
  inputAssistance?:'tiles'
  hintKind?:'answer'|'encouragement';requestedRating?:ReviewRating
  assessmentVersion?:1;recallAttempt?:'first';step?:StudyStep
  settlement?:'settled'|'practice'|'stale_due'|'already_settled'|'legacy_session'
  audioEvidence?:AudioEvidence
}
export interface LearningSession {
  id: string; startedAt: string; date: string; kind: 'review_due' | 'new_word' | 'practice'
  wordIds: string[]; index: number; mode: LearningMode; input: string
  revealed: boolean; selected: string; answers: Answer[]; completedAt?: string
  /** Recall help is separate from revealing the correct answer; absent in legacy sessions. */
  hinted?:boolean
  hintKind?:'answer'|'encouragement'
  letterDraft?:LetterBlockDraft;inputAssistance?:'tiles'
  courseId?:string;contentVersion?:string;resourceVersion?:string;lessonId?:string;wordSnapshot?:Record<string,Word>;seed?:number
  wordSources?:Record<string,'review_due'|'new_word'|'practice'>
  /** Frozen shared-card identity. Legacy due sessions must obtain a fresh queue. */
  memoryVersions?:Record<string,string>
  plannerConfig?:{dailyNewWordLimit:DailyNewWordLimit;entryLevel:EntryLevel}
  /** First-pass targets follow textbook order; practice/review can still be requested explicitly. */
  sequenceWordIds?:string[]
  intent?:'course'|'review'|'practice'
  /** The course-owned daily plan is the sole authority for six-step progress. */
  flow?:DailyFlow
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
