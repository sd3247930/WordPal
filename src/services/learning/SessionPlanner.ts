import {levelModes,levelWordCount,type DailyNewWordLimit,type EntryLevel} from '../../../packages/parent_settings'
import type {LearningMode} from '../../../packages/core_learning'
export interface SessionPlannerConfig {dailyNewWordLimit:DailyNewWordLimit;entryLevel:EntryLevel}
export type PlannedWordSource='review_due'|'new_word'|'practice'
/** Beginners consolidate fewer new words per round than their daily ceiling allows. */
export const BEGINNER_DAILY_NEW_WORD_CAP=5
export const ENTRY_LEVEL_NEW_WORD_CAP=Object.fromEntries(([1,2,3,4,5] as EntryLevel[]).map(level=>[level,levelWordCount(level)])) as Record<EntryLevel,number>
export const plannedNewWordCeiling=(config:SessionPlannerConfig)=>ENTRY_LEVEL_NEW_WORD_CAP[config.entryLevel]
export function planDailySession(input:{config:SessionPlannerConfig;dueIds:string[];weakIds:string[];newIds:string[];newToday:number}){
 const dueIds=[...new Set(input.dueIds)],due=new Set(dueIds)
 const weakIds=[...new Set(input.weakIds)].filter(id=>!due.has(id)),known=new Set([...dueIds,...weakIds])
 const remaining=Math.max(0,plannedNewWordCeiling(input.config)-input.newToday)
 const newIds=[...new Set(input.newIds)].filter(id=>!known.has(id)).slice(0,remaining)
 const wordIds=[...dueIds,...weakIds,...newIds],wordSources:Record<string,PlannedWordSource>={}
 for(const id of dueIds)wordSources[id]='review_due'
 for(const id of weakIds)wordSources[id]='practice'
 for(const id of newIds)wordSources[id]='new_word'
 // The planner owns the level-driven rotation so the learning page and the
 // parent settings preview cannot drift apart.
 const modeOrder=[...levelModes(input.config.entryLevel)] as LearningMode[]
 return {wordIds,wordSources,dueIds,weakIds,newIds,modeOrder}
}
