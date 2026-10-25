import {localDate,type Answer} from '../../../packages/core_learning'
import type {CoursePack} from '../../../packages/content_schema/course'
import type {Database} from '../../stores/profile'
import {dailyTasks,fullCourseWords,validDailyPlan} from '../learning/DailyLearningPlan'
import {orderedCourseWords} from '../learning/CourseStudySequence'

/** Official evidence only; optional practice and auxiliary activities remain separate. */
export function parentLearningRecords(db:Database){
 const seen=new Set<string>()
 return db.history.filter(answer=>{if(!['new_word','review_due'].includes(answer.source)||!Number.isFinite(Date.parse(answer.at))||seen.has(answer.id))return false;seen.add(answer.id);return true})
}
export function selectParentDashboard(db:Database,pack:CoursePack,now=new Date()){
 if(!Number.isFinite(now.getTime()))return null
 const records=parentLearningRecords(db),days=Array.from({length:7},(_,i)=>{const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6+i,12);return {date:localDate(day),label:(day.getMonth()+1)+'/'+day.getDate(),count:0}}),byDate=new Map(days.map(day=>[day.date,day]))
 for(const record of records)if(Date.parse(record.at)<=now.getTime()){const day=byDate.get(localDate(new Date(record.at)));if(day)day.count++}
 const today=localDate(now),plan=db.courseProgress?.[pack.courseId]?.dailyPlan,available=!!plan?.flow&&validDailyPlan(plan,pack.courseId)&&(!plan.completedAt||plan.date===today||plan.flow.finishedDate===today)
 const tasks=available?dailyTasks(plan):null,total=orderedCourseWords(pack).length,learned=Math.min(total,Object.keys(fullCourseWords(db,pack)).length)
 return {days,learningDays:days.filter(day=>day.count>0).length,max:Math.max(1,...days.map(day=>day.count)),records:[...records].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)),tasks:tasks?{done:tasks.filter(task=>task.complete).length,total:tasks.length,carried:plan!.date!==today&&!plan!.completedAt}:null,course:{total,learned,units:pack.units.length}}
}
const modeNames:Record<Answer['mode'],string>={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'}
function csvCell(value:unknown){let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}
/** Local record export, deliberately separate from restorable JSON backups. */
export function parentLearningCsv(db:Database){
 const rows=[['记录ID','时间','教材ID','单词ID','学习方式','结果','记录类型'],...parentLearningRecords(db).map(a=>[a.id,a.at,a.courseId||'starter',a.wordId,modeNames[a.mode]||a.mode,a.correct?'正确':'需巩固',a.source==='review_due'?'到期复习':'新词学习'])]
 return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'
}
