import type {CustomPracticeCursor,CustomPracticeScope,CustomPracticeSession} from '../../../packages/core_learning/custom-practice'
import type {Database} from '../../stores/profile'
import {courseRegistry,isCourseInstalled} from '../content/ContentRegistry'
import {customFingerprint,practiceWordIds,validCustomPractice} from './CustomPractice'

const scopeKey=(scope:CustomPracticeScope)=>JSON.stringify([scope.type,...[...scope.unitIds].sort()])
const sameScope=(a:CustomPracticeScope,b:CustomPracticeScope)=>scopeKey(a)===scopeKey(b)
function validScope(scope:CustomPracticeScope){return !!scope&&['whole-book','units'].includes(scope.type)&&Array.isArray(scope.unitIds)&&scope.unitIds.every(id=>typeof id==='string')&&new Set(scope.unitIds).size===scope.unitIds.length&&(scope.type==='whole-book'?scope.unitIds.length===0:scope.unitIds.length>0)}
export function validCustomPracticeCursors(value:unknown):value is CustomPracticeCursor[]{
 if(!Array.isArray(value))return false
 const keys=new Set<string>()
 for(const cursor of value){
  if(!cursor||typeof cursor.courseId!=='string'||!cursor.courseId||!/^[a-f0-9]{64}$/.test(cursor.contentFingerprint)||!validScope(cursor.scope)||!Number.isSafeInteger(cursor.nextOffset)||cursor.nextOffset<1||typeof cursor.lastSessionId!=='string'||!cursor.lastSessionId||!Number.isFinite(Date.parse(cursor.updatedAt)))return false
  const key=JSON.stringify([cursor.courseId,scopeKey(cursor.scope)]);if(keys.has(key))return false;keys.add(key)
 }
 return true
}
function completedOffset(session:CustomPracticeSession,ids:string[]){
 if(session.status!=='completed'||!validCustomPractice(session))return undefined
 const start=ids.indexOf(session.wordIds[0]);if(start<0||session.sequenceStart!==undefined&&session.sequenceStart!==start||session.wordIds.some((id,index)=>id!==ids[start+index]))return undefined
 return start+session.wordIds.length
}
/** Each textbook and exact scope has its own sequence. Mode choices do not reset it. */
export function customPracticeBatch(db:Database,courseId:string,scope:CustomPracticeScope){
 const ids=practiceWordIds(courseId,scope),pack=courseRegistry[courseId],fingerprint=pack?customFingerprint(pack):'',cursor=db.customPracticeCursors?.find(item=>item.courseId===courseId&&item.contentFingerprint===fingerprint&&sameScope(item.scope,scope))
 let next=cursor&&cursor.nextOffset<=ids.length?cursor.nextOffset:0
 const saved=db.customPractice
 // The latest completed legacy session can seed a cursor without replaying its first batch.
 if(!next&&saved?.courseId===courseId&&saved.contentFingerprint===fingerprint&&sameScope(saved.scope,scope))next=completedOffset(saved,ids)??0
 const restarted=ids.length>0&&next===ids.length,offset=restarted?0:next
 return {offset,total:ids.length,remaining:ids.length-offset,restarted,wordIds:ids.slice(offset)}
}
/** Save together with completion (or before replacing a legacy completed session). */
export function recordCustomSequence(db:Database,session:CustomPracticeSession|null|undefined){
 if(!session||!isCourseInstalled(session.courseId))return false
 const pack=courseRegistry[session.courseId];if(!pack||customFingerprint(pack)!==session.contentFingerprint)return false
 const nextOffset=completedOffset(session,practiceWordIds(session.courseId,session.scope));if(nextOffset===undefined)return false
 const existing=db.customPracticeCursors?.find(item=>item.courseId===session.courseId&&sameScope(item.scope,session.scope))
 if(existing?.lastSessionId===session.id||session.sequenceStart===undefined&&existing?.contentFingerprint===session.contentFingerprint)return false
 const cursor:CustomPracticeCursor={courseId:session.courseId,contentFingerprint:session.contentFingerprint,scope:JSON.parse(JSON.stringify(session.scope)),nextOffset,lastSessionId:session.id,updatedAt:session.completedAt!}
 db.customPracticeCursors=[...(db.customPracticeCursors||[]).filter(item=>item.courseId!==session.courseId||!sameScope(item.scope,session.scope)),cursor]
 return true
}
