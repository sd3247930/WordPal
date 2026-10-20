import type {Database} from '../../stores/profile'
import {getCourseLessons,wordById} from '../content/ContentRegistry'
import {sha256} from '../content/digest'
import {writeStorage} from './index'
import {validParentSettings,DAILY_NEW_WORD_LIMITS} from '../../../packages/parent_settings'
import {validDailyPlan} from '../learning/DailyLearningPlan'
import {validCustomPractice} from '../learning/CustomPractice'
export const V1_KEY='wordpal.database.v1',V2_KEY='wordpal.database.v2',POINTER_KEY='wordpal.database.active.v2'
export const MIGRATION_BACKUP_KEY='wordpal.migration.backup.v1'
export const CUSTOM_RECOVERY_KEY='wordpal.custom-practice.recovery.v1'
export interface CourseProgress {currentLessonId:string;completedLessons:string[];lastLessonAccuracy:number|null;checkAccuracy:Record<string,number>;checkAttempts:Record<string,number>;introducedWords?:Record<string,string>;dailyPlan?:import('../../../packages/core_learning').LearningSession;fullLearnedWords?:Record<string,string>;studyActivity?:'daily'|'independent';curriculumSchema?:1;completedDailyPlans?:import('../../../packages/core_learning').CompletedDailyPlan[]}
export const initialProgress=(courseId:string,index=0):CourseProgress=>({currentLessonId:getCourseLessons(courseId)[index]?.id||getCourseLessons(courseId)[0]?.id||'',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}})
export function validateDatabase(value:unknown){
 const d=value as Database
 if(!d||typeof d!=='object'||![1,2].includes(d.version)||!d.cards||Array.isArray(d.cards)||!Array.isArray(d.history)||!Array.isArray(d.rewardIds)||d.rewardIds.some(id=>typeof id!=='string')||!d.pets||!['water','fire','earth','wind'].every(id=>d.pets[id]&&Number.isFinite(d.pets[id].exp))||!Array.isArray(d.streakDates)||!Number.isFinite(d.gems)||d.gems<0||!validParentSettings(d)||!Number.isInteger(d.lessonIndex)||d.lessonIndex<0)return false
 if(Object.entries(d.cards).some(([id,c])=>!c||c.wordId!==id||!Number.isFinite(Date.parse(c.due))||['stability','difficulty','elapsed_days','scheduled_days','reps','lapses','learning_steps','state'].some(field=>!Number.isFinite(c[field as keyof typeof c]))))return false
 if(d.history.some(a=>!a||typeof a.wordId!=='string'||typeof a.id!=='string'||!Number.isFinite(Date.parse(a.at))||![1,2,3,4].includes(a.rating)||typeof a.correct!=='boolean'))return false
 if(d.practiceAnswers!==undefined&&(!Array.isArray(d.practiceAnswers)||d.practiceAnswers.some(a=>!a||a.source!=='practice'||typeof a.wordId!=='string'||typeof a.id!=='string'||!Number.isFinite(Date.parse(a.at))||![1,2,3,4].includes(a.rating)||typeof a.correct!=='boolean')))return false
 if(d.courseSessions!==undefined&&(!d.courseSessions||typeof d.courseSessions!=='object'||Array.isArray(d.courseSessions)))return false
 if(d.customPractice!=null&&!validCustomPractice(d.customPractice))return false
 if(Object.entries(d.courseSessions||{}).some(([id,s])=>!s||s.courseId&&s.courseId!==id))return false
 for(const s of [d.session,...Object.values(d.courseSessions||{})]){
 if(s&&(!Array.isArray(s.wordIds)||!s.wordIds.length||s.wordIds.some(id=>typeof id!=='string')||new Set(s.wordIds).size!==s.wordIds.length||!Number.isInteger(s.index)||s.index<0||s.index>=s.wordIds.length||!Array.isArray(s.answers)||s.answers.length>s.wordIds.length||typeof s.input!=='string'||typeof s.selected!=='string'||!['flash','connect','listen','spell','dictation'].includes(s.mode)))return false
 if(s?.wordSources&&(typeof s.wordSources!=='object'||s.wordIds.some(id=>!['review_due','new_word','practice'].includes(s.wordSources![id]))||Object.keys(s.wordSources).some(id=>!s.wordIds.includes(id))))return false
 if(s?.plannerConfig&&(!DAILY_NEW_WORD_LIMITS.includes(s.plannerConfig.dailyNewWordLimit)||![1,2,3,4,5].includes(s.plannerConfig.entryLevel)))return false
 if(s?.sequenceWordIds&&(!Array.isArray(s.sequenceWordIds)||s.sequenceWordIds.some(id=>!s.wordIds.includes(id))||new Set(s.sequenceWordIds).size!==s.sequenceWordIds.length))return false
 if(s?.intent&&!['course','review','practice'].includes(s.intent))return false
 }
 if(d.version===2&&(!d.courseProgress||typeof d.courseProgress!=='object'||Object.values(d.courseProgress).some(p=>!p||typeof p.currentLessonId!=='string'||!Array.isArray(p.completedLessons)||!p.checkAccuracy||!p.checkAttempts)||!Array.isArray(d.auxiliaryRecords)))return false
 if(Object.values(d.courseProgress||{}).some(p=>p.introducedWords!==undefined&&(!p.introducedWords||typeof p.introducedWords!=='object'||Array.isArray(p.introducedWords)||Object.values(p.introducedWords).some(at=>typeof at!=='string'||at!==''&&!Number.isFinite(Date.parse(at))))))return false
 if(Object.entries(d.courseProgress||{}).some(([id,p])=>p.dailyPlan&&!validDailyPlan(p.dailyPlan,id)||p.fullLearnedWords&&Object.values(p.fullLearnedWords).some(at=>typeof at!=='string'||at!==''&&!Number.isFinite(Date.parse(at)))))return false
 if(Object.entries(d.courseProgress||{}).some(([owner,p])=>p.completedDailyPlans!==undefined&&(!Array.isArray(p.completedDailyPlans)||p.completedDailyPlans.some(plan=>!plan||plan.courseId!==owner||typeof plan.id!=='string'||!Number.isFinite(Date.parse(plan.completedAt))||!Array.isArray(plan.wordIds)||!plan.completed||Object.values(plan.completed).some(ids=>!Array.isArray(ids)||ids.length!==plan.wordIds.length||ids.some((id,index)=>id!==plan.wordIds[index]))))))return false
 return true
}
export function convertV1(old:Database):Database{
 const next=JSON.parse(JSON.stringify(old)) as Database;next.version=2;next.currentCourseId='starter';next.courseProgress={starter:{...initialProgress('starter',Math.min(old.lessonIndex,getCourseLessons('starter').length-1)),lastLessonAccuracy:old.lastLessonAccuracy}};next.auxiliaryRecords=[]
 if(next.session){const course=getCourseLessons('starter').find(l=>l.wordIds.some(id=>next.session!.wordIds.includes(id)));Object.assign(next.session,{courseId:'starter',contentVersion:'1.0.0',lessonId:course?.id,wordSnapshot:Object.fromEntries(next.session.wordIds.filter(id=>wordById[id]).map(id=>[id,JSON.parse(JSON.stringify(wordById[id]))])),seed:0})}
 return next
}
export function loadDatabase(fresh:()=>Database):{database:Database;key:string;error:string;readOnly:boolean}{
 let pointer:unknown
 try{const raw=uni.getStorageSync(POINTER_KEY);pointer=raw?JSON.parse(raw):null}catch{return {database:{...fresh(),version:2},key:V2_KEY,error:'档案版本指针无法读取，已停止写入。请在家长区导出故障快照。',readOnly:true}}
 const activeKey=pointer==='v2'?V2_KEY:pointer&&typeof pointer==='object'&&(pointer as any).version===2&&/^wordpal\.database\.restore\.[a-f0-9]{16}$/.test((pointer as any).key)?(pointer as any).key:null
 if(pointer&&!activeKey)return {database:{...fresh(),version:2},key:V2_KEY,error:'档案版本指针不合法，已停止写入。请导出故障快照。',readOnly:true}
 if(activeKey){
  try{
   const db=JSON.parse(uni.getStorageSync(activeKey))
   if(db.version!==2)throw new Error()
   if(db.customPractice!=null&&!validCustomPractice(db.customPractice)){
    const candidate={...db,customPractice:null}
    if(!validateDatabase(candidate))throw new Error()
    const recovery={version:1,at:new Date().toISOString(),customPractice:db.customPractice}
    writeStorage(CUSTOM_RECOVERY_KEY,recovery)
    if(uni.getStorageSync(CUSTOM_RECOVERY_KEY)!==JSON.stringify(recovery))throw new Error()
    writeStorage(activeKey,candidate)
    if(uni.getStorageSync(activeKey)!==JSON.stringify(candidate))throw new Error()
    return {database:candidate,key:activeKey,error:'上次自定义练习断点无法校验，已单独备份。正式学习档案仍可用。',readOnly:false}
   }
   if(!validateDatabase(db))throw new Error()
   return {database:db,key:activeKey,error:'',readOnly:false}
  }catch{return {database:{...fresh(),version:2},key:activeKey,error:'最新学习档案无法读取，已保护数据并停止写入，不会自动用旧备份覆盖。',readOnly:true}}
 }
 let old:Database,raw:string
 try{raw=uni.getStorageSync(V1_KEY)||JSON.stringify(fresh());old=JSON.parse(raw);if(old.version!==1||!validateDatabase(old))throw new Error()}catch{return {database:fresh(),key:V1_KEY,error:'旧学习档案无法读取，已停止写入。请在家长区保存故障快照。',readOnly:true}}
 try{
  const next=convertV1(old)
  uni.setStorageSync(MIGRATION_BACKUP_KEY,raw);writeStorage('wordpal.migration.backup.digest',sha256(raw))
  writeStorage(V2_KEY,next)
  const restored=uni.getStorageSync(V2_KEY);if(sha256(restored)!==sha256(JSON.stringify(next))||!validateDatabase(JSON.parse(restored)))throw new Error('Readback')
  writeStorage(POINTER_KEY,'v2')
  return {database:next,key:V2_KEY,error:'',readOnly:false}
 }catch{return {database:old,key:V1_KEY,error:'课程档案升级尚未完成，原学习数据保留可用。请释放存储后重新打开应用。',readOnly:false}}
}
export function exportRecoverySnapshot(){let activeKey=V2_KEY;try{const pointer=JSON.parse(uni.getStorageSync(POINTER_KEY));if(pointer?.version===2&&/^wordpal\.database\.restore\.[a-f0-9]{16}$/.test(pointer.key))activeKey=pointer.key}catch{}return JSON.stringify({format:'wordpal-private-recovery',version:1,createdAt:new Date().toISOString(),active:uni.getStorageSync(POINTER_KEY),latest:uni.getStorageSync(activeKey),legacy:uni.getStorageSync(V1_KEY),backup:uni.getStorageSync('wordpal.migration.backup.v1')})}
