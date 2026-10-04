import {defineStore} from 'pinia'
import {computed} from 'vue'
import {useProfileStore} from './profile'
import {courseRegistry,archiveStatus,getCourseLessons,getCourseWordIds} from '../services/content/ContentRegistry'
import {initialProgress} from '../services/storage/MigrationV1toV2'
export const useCourseStore=defineStore('course',()=>{
 const profile=useProfileStore()
 const currentId=computed(()=>profile.db.currentCourseId||'starter'),current=computed(()=>courseRegistry[currentId.value]||courseRegistry.starter)
 const installed=computed(()=>Object.values(courseRegistry).filter(c=>!archiveStatus[c.courseId]))
 const progress=computed(()=>profile.db.courseProgress?.[currentId.value]||{...initialProgress(currentId.value,currentId.value==='starter'?profile.db.lessonIndex:0),lastLessonAccuracy:currentId.value==='starter'?profile.db.lastLessonAccuracy:null})
 const lessons=computed(()=>getCourseLessons(currentId.value)),lesson=computed(()=>lessons.value.find(l=>l.id===progress.value.currentLessonId)||lessons.value[0])
 function choose(id:string){if(!courseRegistry[id]||archiveStatus[id]||profile.db.version!==2)return false;return profile.transact(d=>{if(d.session&&!d.session.completedAt){d.pendingCourseId=id===currentId.value?undefined:id;return}d.currentCourseId=id;d.pendingCourseId=undefined;d.courseProgress??={};d.courseProgress[id]??=initialProgress(id)})}
 function applyPending(){const id=profile.db.pendingCourseId;if(id&&(!courseRegistry[id]||archiveStatus[id]))return profile.transact(d=>{d.pendingCourseId=undefined});if(id&&(!profile.db.session||profile.db.session.completedAt))return choose(id);return false}
 function chooseLesson(id:string){if(!lessons.value.some(l=>l.id===id)||profile.db.session&&!profile.db.session.completedAt)return false;return profile.transact(d=>{d.courseProgress??={};d.courseProgress[currentId.value]??=initialProgress(currentId.value);d.courseProgress[currentId.value].currentLessonId=id;if(currentId.value==='starter')d.lessonIndex=lessons.value.findIndex(l=>l.id===id)})}
 return {currentId,current,installed,progress,lessons,lesson,choose,applyPending,chooseLesson,wordIds:computed(()=>getCourseWordIds(currentId.value))}
})
