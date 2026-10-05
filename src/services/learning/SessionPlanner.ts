import type {DailyNewWordLimit,EntryLevel} from '../../../packages/parent_settings'
export interface SessionPlannerConfig {dailyNewWordLimit:DailyNewWordLimit;entryLevel:EntryLevel}
export type PlannedWordSource='review_due'|'new_word'|'practice'
export function planDailySession(input:{config:SessionPlannerConfig;dueIds:string[];weakIds:string[];newIds:string[];newToday:number}){
 const dueIds=[...new Set(input.dueIds)],due=new Set(dueIds)
 const weakIds=[...new Set(input.weakIds)].filter(id=>!due.has(id)),known=new Set([...dueIds,...weakIds])
 const remaining=Math.max(0,input.config.dailyNewWordLimit-input.newToday)
 const newIds=[...new Set(input.newIds)].filter(id=>!known.has(id)).slice(0,remaining)
 const wordIds=[...dueIds,...weakIds,...newIds],wordSources:Record<string,PlannedWordSource>={}
 for(const id of dueIds)wordSources[id]='review_due'
 for(const id of weakIds)wordSources[id]='practice'
 for(const id of newIds)wordSources[id]='new_word'
 return {wordIds,wordSources,dueIds,weakIds,newIds}
}
