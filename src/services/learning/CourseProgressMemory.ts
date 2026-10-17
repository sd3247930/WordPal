import type {Database} from '../../stores/profile'
import {courseRegistry,installationStatus} from '../content/ContentRegistry'
import {readStorage,writeStorage} from '../storage'
import {reconcileStudyScope} from './CourseStudySequence'

export const PRESENTATION_KEY='wordpal.study.presentation.v1'
export const ACTIVITY_KEY='wordpal.activities.session.v2'
/** Archived textbooks still exist; directory-only placeholders have no learning memory. */
export const hasCourseMemory=(id:string)=>!!courseRegistry[id]&&installationStatus[id]!=='notInstalled'

/** Only course-local cursors and sessions are removed. Word cards and answer history are untouched. */
export function pruneCourseProgress(database:Database,removedId?:string){
 if(database.version!==2)return false
 const exists=(id:string)=>id!==removedId&&hasCourseMemory(id)
 const before=JSON.stringify([database.currentCourseId,database.pendingCourseId,database.session,database.courseProgress,database.courseSessions])
 for(const id of Object.keys(database.courseProgress||{}))if(!exists(id))delete database.courseProgress![id]
 for(const [id,session] of Object.entries(database.courseSessions||{}))if(!exists(id)||session.courseId&&session.courseId!==id)delete database.courseSessions![id]
 const current=database.currentCourseId||'starter',owner=database.session?.courseId||current
 if(database.session&&!exists(owner))database.session=null
 const target=exists(current)?current:'starter'
 if(target!==current||database.session&&(database.session.courseId||current)!==target){
  if(database.session){database.courseSessions??={};database.courseSessions[owner]=database.session}
  database.session=database.courseSessions?.[target]||null
  if(database.courseSessions)delete database.courseSessions[target]
  database.currentCourseId=target
 }
 if(database.pendingCourseId&&!exists(database.pendingCourseId))database.pendingCourseId=undefined
 reconcileStudyScope(database)
 return before!==JSON.stringify([database.currentCourseId,database.pendingCourseId,database.session,database.courseProgress,database.courseSessions])
}

/** Prune both legacy active UI state and per-course UI state after a textbook disappears. */
export function pruneCourseUiMemory(database:Database,removedId?:string){
 const sessions=new Map(Object.entries(database.courseSessions||{}).map(([id,session])=>[session.id,id]))
 if(database.session)sessions.set(database.session.id,database.session.courseId||database.currentCourseId||'starter')
 let changed=false
 for(const key of [PRESENTATION_KEY,ACTIVITY_KEY]){
  const raw=readStorage<Record<string,any>|null>(key,null)
  if(!raw||typeof raw!=='object')continue
  const owner=(value:Record<string,any>)=>key===ACTIVITY_KEY?value.courseId:sessions.get(value.sessionId)
  const valid=(value:Record<string,any>,id?:string)=>{if(!value||typeof value!=='object'||!owner(value)||owner(value)===removedId||!hasCourseMemory(owner(value))||id&&owner(value)!==id)return false;const allowed=new Set(courseRegistry[owner(value)].vocabulary.map(word=>word.id));return key===ACTIVITY_KEY?Array.isArray(value.wordIds)&&value.wordIds.every((id:string)=>allowed.has(id))&&Object.keys(value.words||{}).every(id=>allowed.has(id)):(!value.queue||value.queue.every((id:string)=>allowed.has(id)))}
  const courseStates=Object.fromEntries(Object.entries(raw.courseStates||{}).filter(([id,value])=>valid(value as Record<string,any>,id)))
  const {courseStates:ignored,...active}=raw
  const keepActive=valid(active)||(key===PRESENTATION_KEY&&active.sessionId==='')
  const next=keepActive?{...active,...(Object.keys(courseStates).length?{courseStates}:{})}:Object.keys(courseStates).length?{courseStates}:null
  if(JSON.stringify(next)!==JSON.stringify(raw)){writeStorage(key,next);changed=true}
 }
 return changed
}
