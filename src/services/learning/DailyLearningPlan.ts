import {localDate,type Answer,type LearningSession,type StudyStep} from '../../../packages/core_learning'
import {entryLevel,levelWordCount,type EntryLevel} from '../../../packages/parent_settings'
import type {CoursePack} from '../../../packages/content_schema/course'
import type {Database} from '../../stores/profile'
import {orderedCourseWords} from './CourseStudySequence'
import {initialProgress} from '../storage/MigrationV1toV2'
import {isUserDeleted} from '../../../packages/content_schema/course-lifecycle'

export const STUDY_STEPS:readonly StudyStep[]=['flash','connect','listen','spell','dictation','consolidate']
export const STEP_TITLES:Record<StudyStep,string>={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写',consolidate:'复习巩固'}
export const LEVEL_WORD_COUNTS=Object.fromEntries(([1,2,3,4,5] as EntryLevel[]).map(level=>[level,levelWordCount(level)])) as Record<EntryLevel,5|10|15|20>
export const stepMode=(step:StudyStep)=>step==='consolidate'?'flash':step

/** Only explicit completed lessons are reliable legacy completion evidence.
 * Single answers/introductions are retained, but cannot certify six-step completion. */
export function fullCourseWords(db:Database,pack:CoursePack){
 const progress=db.courseProgress?.[pack.courseId],ids=new Set(orderedCourseWords(pack))
 const result:Record<string,string>=Object.fromEntries(Object.entries(progress?.fullLearnedWords||{}).filter(([id])=>ids.has(id)))
 if(!progress?.curriculumSchema)for(const lesson of pack.units.flatMap(unit=>unit.lessons))if(progress?.completedLessons.includes(lesson.id))for(const id of lesson.wordIds)result[id]??=''
 return result
}
export function completedPrefix(db:Database,pack:CoursePack){const ids=orderedCourseWords(pack),done=fullCourseWords(db,pack);const first=ids.findIndex(id=>!(id in done));return first<0?ids.length:first}
export function selectDailyPlan(db:Database,pack:CoursePack,now=new Date()){
 if(isUserDeleted(pack.courseId))return null
 const old=db.courseProgress?.[pack.courseId]?.dailyPlan,date=localDate(now)
 if(old?.flow&&(!old.completedAt||old.date>=date||(old.flow.finishedDate||old.date)>=date))return old
 const level=entryLevel(db.abilityLevel),target=LEVEL_WORD_COUNTS[level],ids=orderedCourseWords(pack).slice(completedPrefix(db,pack),completedPrefix(db,pack)+target)
 if(!ids.length)return null
 return {id:`daily:${pack.courseId}:${date}`,courseId:pack.courseId,contentVersion:pack.contentVersion,date,startedAt:now.toISOString(),kind:'new_word',wordIds:ids,sequenceWordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[],intent:'course',plannerConfig:{entryLevel:level,dailyNewWordLimit:target},flow:{schemaVersion:1,step:'flash',entryLevel:level,target,completed:{flash:[],connect:[],listen:[],spell:[],dictation:[],consolidate:[]},attempts:[]}} satisfies LearningSession
}
export function ensureDailyPlan(db:Database,pack:CoursePack,now=new Date()){
 db.courseProgress??={};const progress=db.courseProgress[pack.courseId]??=initialProgress(pack.courseId)
 if(!progress.curriculumSchema){progress.fullLearnedWords=fullCourseWords(db,pack);progress.curriculumSchema=1}
 const plan=selectDailyPlan(db,pack,now)
 if(!plan)return null
 if(progress.dailyPlan!==plan){
  const old=progress.dailyPlan
  if(old?.completedAt&&old.flow){progress.completedDailyPlans??=[];if(!progress.completedDailyPlans.some(p=>p.id===old.id))progress.completedDailyPlans.push({id:old.id,courseId:pack.courseId,date:old.date,completedAt:old.completedAt,finishedDate:old.flow.finishedDate||old.date,entryLevel:old.flow.entryLevel,target:old.flow.target,wordIds:[...old.wordIds],contentVersion:old.contentVersion,completed:JSON.parse(JSON.stringify(old.flow.completed))})}
  progress.dailyPlan=plan
 }
 return progress.dailyPlan
}
/** Unstarted assignments may change; a begun assignment is immutable, including across midnight. */
export function refreshUnstartedPlans(db:Database){
 for(const progress of Object.values(db.courseProgress||{}))if(progress.dailyPlan?.flow&&!progress.dailyPlan.flow.begunAt&&!progress.dailyPlan.completedAt)delete progress.dailyPlan
}
export function dailyTasks(plan:LearningSession|null|undefined){
 const groups:StudyStep[][]=[['flash'],['connect','listen'],['spell','dictation'],['consolidate']]
 return groups.map(steps=>{const total=plan?.wordIds.length||0,done=plan?.wordIds.filter(id=>steps.every(step=>plan.flow?.completed[step].includes(id))).length||0;return {steps,total,done,complete:total>0&&done===total}})
}
/** Persist this transition and the associated evidence/reward in the same repository transaction. */
export function advanceDailyPlan(plan:LearningSession,now=new Date()){
 if(!plan.flow||plan.completedAt)return false
 const answer=plan.answers[plan.index]
 if(!answer)return false
 if(!answer.correct){plan.answers.splice(plan.index);plan.input='';delete plan.letterDraft;plan.selected='';plan.revealed=plan.mode==='flash';return true}
 if(plan.index<plan.wordIds.length-1){plan.index++;plan.input='';delete plan.letterDraft;plan.selected='';plan.revealed=plan.mode==='flash';delete plan.hinted;delete plan.inputAssistance;return true}
 const next=STUDY_STEPS[STUDY_STEPS.indexOf(plan.flow.step)+1]
 if(next){plan.flow.step=next;plan.mode=stepMode(next);plan.index=0;plan.answers=[];plan.input='';delete plan.letterDraft;delete plan.inputAssistance;plan.selected='';plan.revealed=next==='flash';delete plan.hinted}
 else{plan.completedAt=now.toISOString();plan.flow.finishedDate=localDate(now)}
 return true
}
export function recordDailyAnswer(plan:LearningSession,answer:Answer){
 if(!plan.flow||plan.completedAt||plan.answers[plan.index]||answer.wordId!==plan.wordIds[plan.index])return false
 plan.flow.begunAt??=answer.at;plan.flow.attempts.push(answer);plan.answers.push(answer);plan.revealed=true
 if(answer.correct&&!plan.flow.completed[plan.flow.step].includes(answer.wordId))plan.flow.completed[plan.flow.step].push(answer.wordId)
 return true
}
export function validDailyPlan(plan:LearningSession,owner:string){
 const flow=plan?.flow
 if(!flow||flow.schemaVersion!==1||plan.courseId!==owner||!STUDY_STEPS.includes(flow.step)||![1,2,3,4,5].includes(flow.entryLevel)||LEVEL_WORD_COUNTS[flow.entryLevel]!==flow.target||!Array.isArray(plan.wordIds)||!plan.wordIds.length||plan.wordIds.some(id=>typeof id!=='string')||new Set(plan.wordIds).size!==plan.wordIds.length||!Number.isInteger(plan.index)||plan.index<0||plan.index>=plan.wordIds.length||plan.mode!==stepMode(flow.step)||typeof plan.input!=='string'||typeof plan.selected!=='string'||typeof plan.revealed!=='boolean'||!Number.isFinite(Date.parse(plan.startedAt))||!/^\d{4}-\d{2}-\d{2}$/.test(plan.date)||!Array.isArray(plan.answers)||plan.answers.length<plan.index||plan.answers.length>plan.index+1||!Array.isArray(flow.attempts))return false
 const validAnswer=(answer:Answer)=>answer&&typeof answer.id==='string'&&plan.wordIds.includes(answer.wordId)&&answer.courseId===owner&&typeof answer.correct==='boolean'&&[1,2,3,4].includes(answer.rating)&&Number.isFinite(Date.parse(answer.at))
 if(!flow.attempts.every(validAnswer)||!plan.answers.every((answer,index)=>validAnswer(answer)&&answer.wordId===plan.wordIds[index]))return false
 if(!STUDY_STEPS.every(step=>Array.isArray(flow.completed?.[step])&&new Set(flow.completed[step]).size===flow.completed[step].length&&flow.completed[step].every((id,index)=>id===plan.wordIds[index])))return false
 const index=STUDY_STEPS.indexOf(flow.step)
 if(STUDY_STEPS.some((step,i)=>i<index&&flow.completed[step].length!==plan.wordIds.length||i>index&&flow.completed[step].length!==0))return false
 return !plan.completedAt||!!flow.finishedDate&&STUDY_STEPS.every(step=>flow.completed[step].length===plan.wordIds.length)
}
