import type {Word,MemoryCard} from '../../../packages/core_learning'
import type {CourseOccurrence} from './IdentityModel'
export type WordbookScope='currentCourse'|'installedCourses'|'learnedGlobal'
export type WordbookCategory='due'|'focus'|'mistakes'|'all'
export interface WordbookQuery {scope:WordbookScope;currentCourseId:string;installedCourseIds:string[];unitId?:string;category:WordbookCategory;keyword:string}
export interface WordbookIndex {words:Word[];positions:CourseOccurrence[];cards:Record<string,MemoryCard>;dueIds:string[];favorites:string[];mistakes:string[];learnedIds:string[];suggestions:string[]}
/** Scope, unit and search are applied once, before deriving every counter and category. */
export function queryWordbook(query:WordbookQuery,index:WordbookIndex){
 const courses=new Set(query.scope==='currentCourse'?[query.currentCourseId]:query.installedCourseIds),learned=new Set(index.learnedIds)
 const positions=index.positions.filter(p=>query.scope==='learnedGlobal'?learned.has(p.lexemeId):courses.has(p.courseId)&&(query.scope!=='currentCourse'||!query.unitId||p.unitId===query.unitId))
 const positionsById=new Map<string,CourseOccurrence[]>()
 for(const row of positions){const rows=positionsById.get(row.lexemeId)||[];rows.push(row);positionsById.set(row.lexemeId,rows)}
 const keyword=query.keyword.trim().toLowerCase(),due=new Set(index.dueIds),focus=new Set(index.favorites),mistakes=new Set(index.mistakes),suggestions=new Set(index.suggestions)
 const base=index.words.filter(word=>(query.scope==='learnedGlobal'?learned.has(word.id):positionsById.has(word.id))&&(!keyword||[word.word,word.meaning,...(positionsById.get(word.id)||[]).map(p=>p.unitTitle)].join(' ').toLowerCase().includes(keyword)))
 const ids=new Set(base.map(w=>w.id)),occurrenceCount=positions.filter(row=>ids.has(row.lexemeId)).length
 const stats={dueUniqueLexemeCount:base.filter(w=>due.has(w.id)).length,focusCount:base.filter(w=>focus.has(w.id)).length,mistakesCount:base.filter(w=>mistakes.has(w.id)).length,totalCourseOccurrences:occurrenceCount,totalUniqueLexemes:base.length}
 const rows=base.filter(w=>query.category==='all'||(query.category==='due'?due:query.category==='focus'?focus:mistakes).has(w.id)).sort((a,b)=>{
  if(due.has(a.id)!==due.has(b.id))return due.has(a.id)?-1:1
  const ca=index.cards[a.id],cb=index.cards[b.id]
  return (due.has(a.id)?+new Date(ca?.due||0)-+new Date(cb?.due||0):0)||(cb?.lapses||0)-(ca?.lapses||0)||a.word.localeCompare(b.word)
 })
 return {stats,rows,positionsById,suggestions:base.filter(w=>suggestions.has(w.id)&&!focus.has(w.id))}
}
