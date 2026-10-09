import {defineStore} from 'pinia'
import {computed} from 'vue'
import {useProfileStore} from './profile'
import {courseRegistry,archiveStatus,getCourseLessons,getCourseWordIds} from '../services/content/ContentRegistry'
import {setArchived} from '../services/content/StorageRepository'
import {initialProgress} from '../services/storage/MigrationV1toV2'
import {useParentSettingsStore} from './parent-settings'
import {recommendCourses} from '../services/learning/CourseRecommendation'
import {COURSE_SELECTION_MESSAGE,courseSummary,type CourseSelectionResult} from '../services/course/CourseSelection'
import type {CoursePack} from '../../packages/content_schema/course'
function toast(message?:string){if(message)uni.showToast?.({title:message,icon:'none'})}
export const useCourseStore=defineStore('course',()=>{
 const profile=useProfileStore()
 const currentId=computed(()=>profile.db.currentCourseId||'starter'),current=computed(()=>courseRegistry[currentId.value]||courseRegistry.starter)
 const installed=computed(()=>Object.values(courseRegistry).filter(c=>!archiveStatus[c.courseId]))
 const parent=useParentSettingsStore(),recommendationConfig=computed(()=>parent.recommendationConfig)
 const recommendation=computed(()=>recommendCourses({...recommendationConfig.value,installed:installed.value,currentCourseId:currentId.value,learnedIds:new Set(Object.keys(profile.db.cards))}))
 const progress=computed(()=>profile.db.courseProgress?.[currentId.value]||{...initialProgress(currentId.value,currentId.value==='starter'?profile.db.lessonIndex:0),lastLessonAccuracy:currentId.value==='starter'?profile.db.lastLessonAccuracy:null})
 const lessons=computed(()=>getCourseLessons(currentId.value)),lesson=computed(()=>lessons.value.find(l=>l.id===progress.value.currentLessonId)||lessons.value[0])
 const textbooks=computed<CoursePack[]>(()=>Object.values(courseRegistry).filter(c=>c.route==='textbook'))
 const pendingCourse=computed(()=>{const id=profile.db.pendingCourseId;return id?courseRegistry[id]:undefined})
 const selectionBlocked=computed(()=>profile.db.version!==2||profile.readOnly)
 /**
   * Validate a switch and, when it is legal, persist it.
   * Never fails silently: every refusal carries a reason the caller can surface.
   */
 function choose(id:string):CourseSelectionResult{
  if(!courseRegistry[id])return {ok:false,reason:'not-registered',message:COURSE_SELECTION_MESSAGE['not-registered']}
  if(archiveStatus[id])return {ok:false,reason:'archived',message:COURSE_SELECTION_MESSAGE.archived}
  if(profile.db.version!==2)return {ok:false,reason:'db-version-mismatch',message:COURSE_SELECTION_MESSAGE['db-version-mismatch']}
  if(profile.readOnly)return {ok:false,reason:'db-readonly',message:COURSE_SELECTION_MESSAGE['db-readonly']}
  const queued=!!(profile.db.session&&!profile.db.session.completedAt)
  const saved=profile.transact(d=>{if(d.session&&!d.session.completedAt){d.pendingCourseId=id===currentId.value?undefined:id;return}d.currentCourseId=id;d.pendingCourseId=undefined;d.courseProgress??={};d.courseProgress[id]??=initialProgress(id)})
  if(!saved)return {ok:false,reason:'db-readonly',message:'课程切换未保存，请释放设备存储后重试。'}
  return {ok:true,queued:queued&&id!==currentId.value}
 }
 /** Single entry point used by the gallery, the quick picker and the parent screen. */
 function applyCourseSelection(id:string):CourseSelectionResult{
  const result=choose(id)
  const pack=courseRegistry[id]
  if(result.ok&&pack){
   const summary=courseSummary(pack)
   toast(result.queued?`本轮结束后将切换到《${pack.title}》`:`已切换到《${pack.title}》，共 ${summary.words} 词`)
  }else toast(result.message)
  return result
 }
 function clearPending(){if(!profile.db.pendingCourseId)return false;return profile.transact(d=>{d.pendingCourseId=undefined})}
 /** Un-archive a course so it can be selected again. Used by the gallery's "恢复并使用". */
 function restoreCourse(id:string):CourseSelectionResult{
  if(!courseRegistry[id])return {ok:false,reason:'not-registered',message:COURSE_SELECTION_MESSAGE['not-registered']}
  if(!archiveStatus[id])return {ok:true}
  try{setArchived(id,false);return {ok:true}}
  catch{return {ok:false,reason:'unknown',message:'课程恢复失败，请稍后重试。'}}
 }
 function applyPending(){const id=profile.db.pendingCourseId;if(!id)return false;if(!courseRegistry[id]||archiveStatus[id])return profile.transact(d=>{d.pendingCourseId=undefined})&&false;if(!profile.db.session||profile.db.session.completedAt)return choose(id).ok;return false}
 function chooseLesson(id:string){if(!lessons.value.some(l=>l.id===id)||profile.db.session&&!profile.db.session.completedAt)return false;return profile.transact(d=>{d.courseProgress??={};d.courseProgress[currentId.value]??=initialProgress(currentId.value);d.courseProgress[currentId.value].currentLessonId=id;if(currentId.value==='starter')d.lessonIndex=lessons.value.findIndex(l=>l.id===id)})}
 return {currentId,current,installed,textbooks,pendingCourse,selectionBlocked,progress,lessons,lesson,choose,applyCourseSelection,clearPending,restoreCourse,applyPending,chooseLesson,recommendationConfig,recommendation,wordIds:computed(()=>getCourseWordIds(currentId.value))}
})
