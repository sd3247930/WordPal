import type {Word,MemoryCard} from '../../../packages/core_learning'
import type {CourseOccurrence} from './IdentityModel'
import {occurrences} from './IdentityModel'
import type {CoursePack} from '../../../packages/content_schema/course'
import type {Answer} from '../../../packages/core_learning'
import {familiarityFor,familiarityLevels,type Familiarity,type FamiliarityLevel} from './FamiliaritySelector'
import {isUserDeleted} from '../../../packages/content_schema/course-lifecycle'
export type WordbookScope='currentCourse'|'installedCourses'|'learnedGlobal'|'allWords'
export type WordbookCategory='due'|'focus'|'mistakes'|'all'
export interface WordbookQuery {scope:WordbookScope;currentCourseId:string;installedCourseIds:string[];unitId?:string;learnedOnly?:boolean;category:WordbookCategory;keyword:string}
export interface WordbookIndex {words:Word[];positions:CourseOccurrence[];cards:Record<string,MemoryCard>;dueIds:string[];favorites:string[];mistakes:string[];learnedIds:string[];suggestions:string[]}
/** Scope, unit and search are applied once, before deriving every counter and category. */
export function queryWordbook(query:WordbookQuery,index:WordbookIndex){
 const courses=new Set(query.scope==='currentCourse'?[query.currentCourseId]:query.installedCourseIds),learned=new Set(index.learnedIds)
 const livePositions=index.positions.filter(position=>!isUserDeleted(position.courseId)),surviving=new Set(livePositions.map(position=>position.lexemeId))
 const deletedOnly=new Set(index.positions.filter(position=>isUserDeleted(position.courseId)&&!surviving.has(position.lexemeId)).map(position=>position.lexemeId))
 const positions=livePositions.filter(p=>{
  if(query.scope==='learnedGlobal'||query.scope==='allWords'&&query.learnedOnly)return learned.has(p.lexemeId)
  if(query.scope==='allWords')return courses.has(p.courseId)||learned.has(p.lexemeId)
  return courses.has(p.courseId)&&(query.scope!=='currentCourse'||!query.unitId||p.unitId===query.unitId)
 })
 const positionsById=new Map<string,CourseOccurrence[]>()
 for(const row of positions){const rows=positionsById.get(row.lexemeId)||[];rows.push(row);positionsById.set(row.lexemeId,rows)}
 const keyword=query.keyword.trim().toLowerCase(),due=new Set(index.dueIds),focus=new Set(index.favorites),mistakes=new Set(index.mistakes),suggestions=new Set(index.suggestions)
 const base=index.words.filter(word=>!deletedOnly.has(word.id)&&(query.scope==='learnedGlobal'?learned.has(word.id):query.scope==='allWords'?positionsById.has(word.id)||learned.has(word.id):positionsById.has(word.id))&&(!(query.scope==='allWords'&&query.learnedOnly)||learned.has(word.id))&&(!keyword||[word.word,word.meaning,...(positionsById.get(word.id)||[]).map(p=>p.unitTitle)].join(' ').toLowerCase().includes(keyword)))
 const ids=new Set(base.map(w=>w.id)),occurrenceCount=positions.filter(row=>ids.has(row.lexemeId)).length
 const stats={dueUniqueLexemeCount:base.filter(w=>due.has(w.id)).length,focusCount:base.filter(w=>focus.has(w.id)).length,mistakesCount:base.filter(w=>mistakes.has(w.id)).length,totalCourseOccurrences:occurrenceCount,totalUniqueLexemes:base.length}
 const rows=base.filter(w=>query.category==='all'||(query.category==='due'?due:query.category==='focus'?focus:mistakes).has(w.id)).sort((a,b)=>{
  if(due.has(a.id)!==due.has(b.id))return due.has(a.id)?-1:1
  const ca=index.cards[a.id],cb=index.cards[b.id]
  return (due.has(a.id)?+new Date(ca?.due||0)-+new Date(cb?.due||0):0)||(cb?.lapses||0)-(ca?.lapses||0)||a.word.localeCompare(b.word)
 })
 return {stats,rows,positionsById,suggestions:base.filter(w=>suggestions.has(w.id)&&!focus.has(w.id))}
}

export interface CourseCardQuery {courseId:string;unitId?:string;keyword?:string;familiarity?:FamiliarityLevel;dueOnly?:boolean;starredOnly?:boolean;wrongOnly?:boolean;sort?:'courseOrder'|'alphabetical'|'latestLearned'|'dueSoon'|'familiarity';mergeDuplicates?:boolean;pageIndex?:number;pageSize?:number}
export interface CourseCardIndex {pack?:CoursePack;installed:boolean;wordFor:(id:string)=>Word|undefined;cards:Record<string,MemoryCard>;answers:Answer[];dueIds:string[];favorites:string[];mistakes:string[];now?:number}
export interface CourseCardRow {occurrence:CourseOccurrence;word:Word;familiarity:Familiarity;due:boolean;starred:boolean;wrong:boolean;missingContent:boolean;lastLearnedAt:number}
const normalize=(text:string)=>text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
export function summarizeCourseCards(rows:CourseCardRow[]){
 const byFamiliarity=Object.fromEntries(familiarityLevels.map(level=>[level,0])) as Record<FamiliarityLevel,number>
 for(const row of rows)byFamiliarity[row.familiarity.level]++
 return {totalOccurrences:rows.length,uniqueLexemes:new Set(rows.map(row=>row.word.id)).size,learnedOccurrences:rows.filter(row=>row.familiarity.learned).length,dueUniqueLexemes:new Set(rows.filter(row=>row.due).map(row=>row.word.id)).size,byFamiliarity}
}
/** The occurrence table is the base; absence of a memory card never removes a row. */
export function queryCourseCards(query:CourseCardQuery,index:CourseCardIndex){
 const available=!isUserDeleted(query.courseId)&&!!index.pack&&index.installed&&index.pack.courseId===query.courseId
 const history=new Map<string,Answer[]>(),due=new Set(index.dueIds),stars=new Set(index.favorites),wrong=new Set(index.mistakes),keyword=normalize(query.keyword||''),cache=new Map<string,Familiarity>()
 for(const answer of index.answers)if(answer?.wordId){const list=history.get(answer.wordId)||[];list.push(answer);history.set(answer.wordId,list)}
 const base:CourseCardRow[]=[],vocabulary=new Map(index.pack?.vocabulary.map(word=>[word.id,word])||[]),examples=new Map<string,string>()
 for(const unit of index.pack?.units||[])for(const lesson of unit.lessons)for(const [id,text]of Object.entries(lesson.examples||{}))if(!examples.has(unit.id+':'+id))examples.set(unit.id+':'+id,text)
 if(available)for(const occurrence of occurrences(index.pack!)){
  if(query.unitId&&occurrence.unitId!==query.unitId)continue
  const source=index.wordFor(occurrence.lexemeId),entry=vocabulary.get(occurrence.lexemeId)
  const word=source||{id:occurrence.lexemeId,word:entry?.lemma||'词条待核对',meaning:entry?.meaning||'教材内容待补充',ipa:'',pos:'',audio:'',image:'',example:'',phonics:[],phonemes:[],syllables:[],unit:occurrence.unitTitle,lesson:occurrence.lessonIds[0]||'',difficulty:1,distractors:[]}
  if(keyword&&!normalize([word.word,word.meaning,occurrence.unitTitle].join(' ')).includes(keyword))continue
  let familiarity=cache.get(word.id)
  if(!familiarity){familiarity=familiarityFor(word.id,index.cards[word.id],history.get(word.id)||[],index.now);cache.set(word.id,familiarity)}
  if(!source)familiarity={...familiarity,level:'unrated',label:'待评估',reason:'教材词条内容需要核对；原学习记录保留。'}
  base.push({occurrence,word:{...word,example:examples.get(occurrence.unitId+':'+word.id)||word.example},familiarity,due:due.has(word.id),starred:stars.has(word.id),wrong:wrong.has(word.id),missingContent:!source,lastLearnedAt:Math.max(0,...(history.get(word.id)||[]).map(a=>Date.parse(a.at)).filter(Number.isFinite))})
 }
 const filtered=base.filter(row=>(!query.familiarity||row.familiarity.level===query.familiarity)&&(!query.dueOnly||row.due)&&(!query.starredOnly||row.starred)&&(!query.wrongOnly||row.wrong))
 filtered.sort((a,b)=>{
  const order=a.occurrence.order-b.occurrence.order
  if(query.sort==='alphabetical')return a.word.word.localeCompare(b.word.word)||order
  if(query.sort==='latestLearned')return b.lastLearnedAt-a.lastLearnedAt||order
  if(query.sort==='dueSoon')return (+new Date(index.cards[a.word.id]?.due||'9999-01-01'))-(+new Date(index.cards[b.word.id]?.due||'9999-01-01'))||order
  if(query.sort==='familiarity')return familiarityLevels.indexOf(a.familiarity.level)-familiarityLevels.indexOf(b.familiarity.level)||order
  return order
 })
 const seen=new Set<string>(),summary=summarizeCourseCards(filtered),rows=query.mergeDuplicates?filtered.filter(row=>{if(seen.has(row.word.id))return false;seen.add(row.word.id);return true}):filtered
 const pageSize=Math.max(1,Math.min(60,Math.floor(query.pageSize||30))),pages=Math.max(1,Math.ceil(rows.length/pageSize)),pageIndex=Math.max(0,Math.min(pages-1,Math.floor(query.pageIndex||0)))
 return {available,summary,rows,pageRows:rows.slice(pageIndex*pageSize,(pageIndex+1)*pageSize),pageIndex,pages,totalRows:rows.length}
}
