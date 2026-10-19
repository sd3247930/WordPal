import {localDate,type LearningSession} from '../../../packages/core_learning'
import type {CoursePack} from '../../../packages/content_schema/course'
import type {Database} from '../../stores/profile'
import {fullCourseWords,STUDY_STEPS} from './DailyLearningPlan'

/** Match the existing textbook completion count; browsing and practice are not completions. */
export function todayCourseWordIds(db:Database,pack:CoursePack,now=new Date()){
 const date=localDate(now)
 return Object.entries(fullCourseWords(db,pack)).filter(([,at])=>at&&localDate(new Date(at))===date).map(([id])=>id)
}

export interface StudyRoundProgress {status:'ready'|'active'|'completed'|'unavailable';completed:number;total:number}
/** Read persisted planned steps only. Retries and optional mistake revisits add no steps. */
export function studyRoundProgress(session:LearningSession|null|undefined):StudyRoundProgress {
 if(!session)return {status:'ready',completed:0,total:0}
 const ids=new Set(session.wordIds)
 if(!ids.size||ids.size!==session.wordIds.length)return {status:'unavailable',completed:0,total:0}
 if(session.flow){
  if(!STUDY_STEPS.every(step=>Array.isArray(session.flow?.completed?.[step])))return {status:'unavailable',completed:0,total:0}
  const total=ids.size*STUDY_STEPS.length
  const completed=STUDY_STEPS.reduce((count,step)=>count+new Set(session.flow!.completed[step].filter(id=>ids.has(id))).size,0)
  return {status:completed===total?'completed':'active',completed,total}
 }
 const completed=new Set(session.answers.filter(answer=>ids.has(answer.wordId)).map(answer=>answer.wordId)).size
 return {status:completed===ids.size?'completed':'active',completed,total:ids.size}
}
