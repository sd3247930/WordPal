import type {CoursePack} from '../../../packages/content_schema/course'
import type {LearningSession} from '../../../packages/core_learning'
import type {Database} from '../../stores/profile'
import {courseRegistry,isUserDeleted,isCourseReadable} from '../content/ContentRegistry'

/** Course order is independent of a global memory card or a previously selected lesson. */
export function orderedCourseWords(pack:CoursePack){
 if(isUserDeleted(pack.courseId))return []
 const known=new Set(pack.vocabulary.map(word=>word.id)),seen=new Set<string>(),ids:string[]=[]
 const unitOrder=(unit:CoursePack['units'][number],index:number)=>unit.order??Number((unit.title+' '+unit.id).match(/(?:unit|module|u)[\s-]*0*(\d+)/i)?.[1]||index+1)
 const entries=new Map(pack.vocabulary.map(word=>[word.id,word]))
 const units=pack.units.map((unit,index)=>({unit,index})).sort((a,b)=>unitOrder(a.unit,a.index)-unitOrder(b.unit,b.index)||a.index-b.index)
 const inUnit=({unit}:typeof units[number])=>unit.lessons.flatMap(lesson=>lesson.wordIds).map((id,index)=>({id,index})).sort((a,b)=>(entries.get(a.id)?.order??a.index+1)-(entries.get(b.id)?.order??b.index+1)||a.index-b.index).map(item=>item.id)
 for(const id of [...units.flatMap(inUnit),...pack.vocabulary.map(word=>word.id)])if(known.has(id)&&!seen.has(id)){seen.add(id);ids.push(id)}
 return ids
}
export function sessionInCourse(session:LearningSession,courseId:string){
 const pack=courseRegistry[courseId],allowed=new Set(pack?.vocabulary.map(word=>word.id)||[])
 return !!pack&&isCourseReadable(courseId)&&(!session.courseId||session.courseId===courseId)&&session.wordIds.every(id=>allowed.has(id))&&session.answers.every(answer=>allowed.has(answer.wordId)&&session.wordIds.includes(answer.wordId))
}
/** Only evidence owned by this textbook can advance its first pass. Shared SRS is not course progress. */
export function courseIntroductions(db:Database,courseId:string){
 const pack=courseRegistry[courseId];if(!pack)return {}
 const allowed=new Set(pack.vocabulary.map(word=>word.id)),progress=db.courseProgress?.[courseId]
 const result:Record<string,string>=Object.fromEntries(Object.entries(progress?.introducedWords||{}).filter(([id])=>allowed.has(id)))
 for(const lesson of pack.units.flatMap(unit=>unit.lessons))if(progress?.completedLessons.includes(lesson.id))for(const id of lesson.wordIds)result[id]??=''
 const session=(db.session?.courseId||db.currentCourseId||'starter')===courseId?db.session:db.courseSessions?.[courseId]
 if(session&&sessionInCourse(session,courseId))for(const answer of session.answers)if(session.sequenceWordIds?.includes(answer.wordId)||(session.wordSources?.[answer.wordId]||session.kind)==='new_word')result[answer.wordId]??=answer.at
 return result
}
/** Discard foreign targets; remove foreign distractors while preserving valid drafts and answers. */
export function reconcileStudyScope(db:Database){
 function repair(session:LearningSession|null|undefined,owner:string){
  if(!session)return null
  if(!sessionInCourse(session,owner))return null
  if(!session.intent&&!session.sequenceWordIds&&session.kind!=='practice'&&!session.answers.length&&!session.input&&!session.selected){const expected=orderedCourseWords(courseRegistry[owner]).find(id=>!(id in courseIntroductions(db,owner)));if(expected&&session.wordIds[0]!==expected)return null}
  const allowed=new Set(courseRegistry[owner].vocabulary.map(word=>word.id))
  if(session.wordSnapshot){for(const [id,word] of Object.entries(session.wordSnapshot)){if(!allowed.has(id)||!word||word.id!==id)delete session.wordSnapshot[id];else word.distractors=(word.distractors||[]).filter(id=>allowed.has(id))}}
  if(['connect','listen'].includes(session.mode)&&session.selected&&!allowed.has(session.selected))session.selected=''
  if(session.sequenceWordIds)session.sequenceWordIds=session.sequenceWordIds.filter(id=>allowed.has(id))
  return session
 }
 for(const [id,session] of Object.entries(db.courseSessions||{})){const next=repair(session,id);if(next)db.courseSessions![id]=next;else delete db.courseSessions![id]}
 const owner=db.session?.courseId||db.currentCourseId||'starter'
 db.session=repair(db.session,owner)
}
