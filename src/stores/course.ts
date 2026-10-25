import {defineStore} from 'pinia'
import {computed} from 'vue'
import {useProfileStore} from './profile'
import {courseRegistry,archiveStatus,isCourseInstalled,isCourseReadable,getCourseLessons,getCourseWordIds} from '../services/content/ContentRegistry'
import {retainLearnedLexemes,setArchived,uninstallCourseContent} from '../services/content/StorageRepository'
import {initialProgress} from '../services/storage/MigrationV1toV2'
import {useParentSettingsStore} from './parent-settings'
import {recommendCourses} from '../services/learning/CourseRecommendation'
import {COURSE_SELECTION_MESSAGE,courseSummary,cleanCourseLabel,type CourseSelectionResult} from '../services/course/CourseSelection'
import type {CoursePack} from '../../packages/content_schema/course'
import {readStorage,writeStorage} from '../services/storage'
import {occurrenceProgress} from '../services/content/IdentityModel'
import {pruneCourseProgress,hasCourseMemory,PRESENTATION_KEY,ACTIVITY_KEY} from '../services/learning/CourseProgressMemory'
import {courseRemovalScope} from '../services/content/CourseRemovalData'
import {isUserDeleted} from '../services/content/ContentRegistry'
import {stopAudio} from '../services/audio'
import {warmUpcomingAudio} from '../services/audio/AudioPreload'
function toast(message?:string){if(message)uni.showToast?.({title:message,icon:'none'})}
export const useCourseStore=defineStore('course',()=>{
 const profile=useProfileStore()
 const displayPack=(pack:CoursePack)=>({...pack,title:cleanCourseLabel(pack.title),edition:pack.edition?cleanCourseLabel(pack.edition):pack.edition})
 const currentId=computed(()=>isCourseReadable(profile.db.currentCourseId||'starter')?profile.db.currentCourseId||'starter':'starter'),current=computed(()=>displayPack(courseRegistry[currentId.value]||courseRegistry.starter))
 const installed=computed(()=>Object.values(courseRegistry).filter(c=>isCourseInstalled(c.courseId)).map(displayPack))
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
  if(!isCourseInstalled(id))return {ok:false,reason:'unknown',message:'请先安装教材，再设为当前课程。'}
  if(profile.db.version!==2)return {ok:false,reason:'db-version-mismatch',message:COURSE_SELECTION_MESSAGE['db-version-mismatch']}
  if(profile.readOnly)return {ok:false,reason:'db-readonly',message:COURSE_SELECTION_MESSAGE['db-readonly']}
  const saved=profile.transact(d=>{
   pruneCourseProgress(d)
   if(id!==(d.currentCourseId||'starter')||d.session?.courseId&&d.session.courseId!==id){
    d.courseSessions??={}
    if(d.session)d.courseSessions[d.session.courseId||d.currentCourseId||'starter']=d.session
    d.session=d.courseSessions[id]||null
    delete d.courseSessions[id]
   }
   d.currentCourseId=id;d.pendingCourseId=undefined;d.courseProgress??={};d.courseProgress[id]??=initialProgress(id)
  })
  if(!saved)return {ok:false,reason:'db-readonly',message:'课程切换未保存，请释放设备存储后重试。'}
  return {ok:true,queued:false}
 }
 /** Single entry point used by the gallery, the quick picker and the parent screen. */
 function applyCourseSelection(id:string):CourseSelectionResult{
  const result=choose(id)
  const pack=courseRegistry[id]
  if(result.ok&&pack){
   const summary=courseSummary(pack)
   toast(`已切换到《${cleanCourseLabel(pack.title)}》，共 ${summary.words} 词`)
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
 function applyPending(){const id=profile.db.pendingCourseId;if(!id)return false;if(!isCourseInstalled(id))return profile.transact(d=>{d.pendingCourseId=undefined})&&false;return choose(id).ok}
 async function uninstall(id:string,confirmed:boolean,replacement?:string){
  if(!confirmed)throw new Error('请先确认删除教材及本册专属记录。')
  if(profile.readOnly)throw new Error('学习档案只读，暂不能移除教材。')
  if(id==='starter')throw new Error('默认启蒙课程需保留。')
  if(isUserDeleted(id))return uninstallCourseContent(id)
  const scope=courseRemovalScope(id,profile.db)
  const previous=currentId.value,original=JSON.parse(JSON.stringify(profile.db)) as typeof profile.db
  const uiMemory=[PRESENTATION_KEY,ACTIVITY_KEY,'wordpal.wordbook.preferences.v1'].map(key=>({key,value:uni.getStorageSync(key)}))
  stopAudio();warmUpcomingAudio([])
  if(id===previous){if(!replacement||replacement===id||!isCourseInstalled(replacement))throw new Error('请选择另一份已安装教材作为当前课程。');if(!choose(replacement).ok)throw new Error('替代教材未保存，已保留原教材。')}
  try{
   // Persist progress removal before removing content; a full device must not leave revivable cursors.
   if(!profile.removeCourseRecords([scope]))throw new Error('教材记录暂时无法备份和清理，教材已保留，请释放设备存储后重试。')
   const prefs=readStorage<{favorites:string[];later:string[]}|null>('wordpal.wordbook.preferences.v1',null)||{favorites:[],later:[]}
   const retained=[...Object.keys(profile.db.cards),...profile.db.history.map(a=>a.wordId),...prefs.favorites,...prefs.later]
   const result=await uninstallCourseContent(id,retained)
   return result
  }catch(error){
   if(hasCourseMemory(id)){
    const restored=profile.transact(draft=>{for(const field of Object.keys(draft))delete (draft as any)[field];Object.assign(draft,original)})
    try{for(const item of uiMemory){if(item.value===''||item.value===undefined||item.value===null)uni.removeStorageSync(item.key);else uni.setStorageSync(item.key,item.value)}}catch{profile.storageError='教材仍保留，但进度恢复未完成，请释放设备存储后重新打开应用。'}
    profile.courseMemoryRevision++
    if(!restored)throw new Error('教材未删除，原进度恢复未完成，请释放设备存储后重试。')
   }
   throw error
  }
 }
 function learnedIds(){const prefs=readStorage<{favorites:string[];later:string[]}>('wordpal.wordbook.preferences.v1',{favorites:[],later:[]});return [...Object.keys(profile.db.cards),...profile.db.history.map(answer=>answer.wordId),...prefs.favorites,...prefs.later]}
 function retainLearnedWords(){return retainLearnedLexemes(learnedIds())}
 function chooseLesson(id:string){if(!lessons.value.some(l=>l.id===id)||profile.db.session&&!profile.db.session.completedAt)return false;return profile.transact(d=>{d.courseProgress??={};d.courseProgress[currentId.value]??=initialProgress(currentId.value);d.courseProgress[currentId.value].currentLessonId=id;if(currentId.value==='starter')d.lessonIndex=lessons.value.findIndex(l=>l.id===id)})}
 return {currentId,current,installed,textbooks,pendingCourse,selectionBlocked,progress,occurrenceProgress:computed(()=>occurrenceProgress(current.value,progress.value.completedLessons)),lessons,lesson,choose,applyCourseSelection,clearPending,restoreCourse,applyPending,chooseLesson,uninstall,retainLearnedWords,recommendationConfig,recommendation,wordIds:computed(()=>getCourseWordIds(currentId.value))}
})
