import {defineStore} from 'pinia'
import {ref,computed} from 'vue'
import {words,wordById} from '../../packages/content_schema'
import {useProfileStore} from './profile'
import {useLearningStore} from './learning'
import {useReviewStore} from './review'
import {readStorage,writeStorage} from '../services/storage'
import {needsRecentPractice} from '../services/study-presentation'
import {courseRegistry,archiveStatus,courseMemberships,isCourseInstalled,retainedPositions} from '../services/content/ContentRegistry'
import {occurrences} from '../services/content/IdentityModel'
import {queryWordbook,queryCourseCards,type WordbookQuery,type CourseCardQuery} from '../services/content/WordbookQueryBuilder'
import {getCourseWord} from '../services/content/ContentRegistry'
export interface WordbookScope {courseId?:string;unitId?:string;learnedOnly?:boolean;installedOnly?:boolean}
export type WordbookFilter='due'|'weak'|'mistakes'|'all'
interface Preferences {favorites:string[];later:string[]}
const key='wordpal.wordbook.preferences.v1'
function clean(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&!!wordById[id]))]:[]}
export const useWordbookStore=defineStore('wordbook',()=>{
 const profile=useProfileStore(),learning=useLearningStore(),review=useReviewStore()
 const raw=readStorage<Partial<Preferences>|null>(key,null),preferences=ref<Preferences>({favorites:clean(raw?.favorites),later:clean(raw?.later)}),error=ref('')
 const evidence=computed(()=>[...new Map([...profile.db.history,...(profile.db.practiceAnswers||[]),...(profile.db.session?.answers||[]).filter(answer=>profile.db.session?.kind==='practice'||profile.db.session?.wordSources?.[answer.wordId]==='practice').map(answer=>({...answer,source:'practice' as const}))].map(answer=>[answer.id,answer])).values()])
 const historyByWord=computed(()=>{const index:Record<string,typeof profile.db.history>={};for(const word of words)index[word.id]=[];for(const answer of evidence.value)(index[answer.wordId]??=[]).push(answer);for(const history of Object.values(index))history.sort((a,b)=>(Date.parse(a.at)||0)-(Date.parse(b.at)||0));return index})
 const mistakes=computed(()=>words.filter(word=>needsRecentPractice(historyByWord.value[word.id])).map(word=>word.id))
 const suggestions=computed(()=>review.weak.map(card=>card.wordId).filter(id=>!!wordById[id]&&!preferences.value.favorites.includes(id)))
 const weak=computed(()=>[...new Set([...preferences.value.favorites,...suggestions.value])])
 const positions=computed(()=>[...new Map([...Object.values(courseRegistry).flatMap(occurrences),...retainedPositions.filter(p=>!courseRegistry[p.courseId]).map(p=>({id:JSON.stringify([p.courseId,p.unitId,p.lexemeId]),courseId:p.courseId,unitId:p.unitId,unitTitle:p.unitTitle,lexemeId:p.lexemeId,order:0,lessonIds:[p.lessonId]}))].map(row=>[row.id,row])).values()])
 const learnedIds=computed(()=>[...new Set([...Object.keys(profile.db.cards),...evidence.value.map(a=>a.wordId)])])
 function query(request:WordbookQuery){return queryWordbook(request,{words,positions:positions.value,cards:profile.db.cards,dueIds:review.due.map(c=>c.wordId),favorites:preferences.value.favorites,mistakes:mistakes.value,learnedIds:learnedIds.value,suggestions:suggestions.value})}
 function courseCards(request:CourseCardQuery){return queryCourseCards(request,{pack:courseRegistry[request.courseId],installed:isCourseInstalled(request.courseId),wordFor:id=>getCourseWord(request.courseId,id),cards:profile.db.cards,answers:evidence.value,dueIds:review.due.map(c=>c.wordId),favorites:preferences.value.favorites,mistakes:mistakes.value})}
 function toggle(field:keyof Preferences,id:string){
  if(!wordById[id])return false
  const next={...preferences.value,[field]:preferences.value[field].includes(id)?preferences.value[field].filter(word=>word!==id):[...preferences.value[field],id]}
  try{writeStorage(key,next);preferences.value=next;error.value='';return true}catch{error.value='标记暂时无法保存，请释放设备空间后重试。';return false}
 }
 function list(filter:WordbookFilter,query:string,scope:WordbookScope={}){
  const ids=filter==='due'?review.due.map(card=>card.wordId):filter==='weak'?weak.value:filter==='mistakes'?mistakes.value:words.map(word=>word.id)
  const text=query.trim().toLowerCase()
  const scoped=scope.courseId?new Set(courseRegistry[scope.courseId]?.units.filter(u=>!scope.unitId||u.id===scope.unitId).flatMap(u=>u.lessons.flatMap(l=>l.wordIds))||[]):scope.installedOnly?new Set(Object.values(courseRegistry).filter(c=>isCourseInstalled(c.courseId)).flatMap(c=>c.vocabulary.map(w=>w.id))):null
  return ids.map(id=>wordById[id]).filter(word=>word&&(!scoped||scoped.has(word.id))&&(!scope.learnedOnly||!!profile.db.cards[word.id])&&(!text||[word.word,word.meaning,word.unit,word.lesson,...courseMemberships(word.id).flatMap(m=>[m.courseTitle,m.unitTitle,m.lessonTitle])].join(' ').toLowerCase().includes(text))).sort((a,b)=>{
   const ca=profile.db.cards[a.id],cb=profile.db.cards[b.id]
   const da=ca?+new Date(ca.due):Infinity,db=cb?+new Date(cb.due):Infinity,now=Date.now()
   if((da<=now)!==(db<=now))return da<=now?-1:1
   if(da<=now&&db<=now)return da-db || a.word.localeCompare(b.word)
   const risk=(cb?.lapses||0)-(ca?.lapses||0) || (cb?.difficulty||0)-(ca?.difficulty||0)
   return risk || Number(b.unit===learning.lesson.unit)-Number(a.unit===learning.lesson.unit) || Number(preferences.value.later.includes(a.id))-Number(preferences.value.later.includes(b.id)) || a.word.localeCompare(b.word)
  })
 }
 function reset(){try{const next={favorites:[],later:[]};writeStorage(key,next);preferences.value=next;error.value='';return true}catch{error.value='界面标记清除失败，请检查设备存储。';return false}}
 return {preferences,error,historyByWord,mistakes,suggestions,weak,toggle,list,query,courseCards,evidence,learnedIds,reset}
})
