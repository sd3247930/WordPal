import {defineStore} from 'pinia'
import {computed} from 'vue'
import {wordById,lessons,words} from '../../packages/content_schema'
import {localDate,canUnlockNextUnit,type LearningMode,type ReviewRating,type Answer,type LearningSession} from '../../packages/core_learning'
import {FSRSScheduler,newCard} from '../../packages/srs_fsrs'
import {isCorrectSpelling} from '../../packages/phonics'
import {applyLearningReward} from '../../packages/pet_engine'
import {useProfileStore} from './profile'
import {useReviewStore} from './review'
import {useCourseStore} from './course'
import {availableModes} from '../../packages/content_schema/course'
import {readFeedbackSettings} from './feedback'
import {initialProgress} from '../services/storage/MigrationV1toV2'
import {getCourseWord,resolveFrozenWord} from '../services/content/ContentRegistry'
import {useParentSettingsStore} from './parent-settings'
import {planDailySession,plannedNewWordCeiling} from '../services/learning/SessionPlanner'
import {needsRecentPractice} from '../services/study-presentation'
export const modes:{id:LearningMode;name:string;description:string}[]=[{id:'flash',name:'闪现',description:'看看单词，回想它的意思'},{id:'connect',name:'连接',description:'为单词找到正确的中文意思'},{id:'listen',name:'听音',description:'听发音，选出对应的单词'},{id:'spell',name:'拼写',description:'看中文，用字母拼出单词'},{id:'dictation',name:'听写',description:'听发音，写出这个单词'}]
export const useLearningStore=defineStore('learning',()=>{
 const profile=useProfileStore(),review=useReviewStore(),course=useCourseStore(),parent=useParentSettingsStore()
 const session=computed(()=>profile.db.session)
 const current=computed(()=>session.value ? resolveFrozenWord(session.value.wordSnapshot?.[session.value.wordIds[session.value.index]]||wordById[session.value.wordIds[session.value.index]],session.value.courseId,session.value.contentVersion):undefined)
 const todayAnswers=computed(()=>profile.db.history.filter(a=>localDate(new Date(a.at))===localDate()))
 const newToday=computed(()=>new Set(todayAnswers.value.filter(a=>a.source==='new_word').map(a=>a.wordId)).size)
 const lesson=computed(()=>course.lesson)
 /**
  * Anki-style daily pool: every unlearned word of the whole course, in lesson order.
  * Previously this only looked at the current lesson, so a 5/10/20 daily limit could
  * never differ from the lesson size (2–9 words).
  */
 const courseWordPool=computed(()=>{
  const seen=new Set<string>(),ids:string[]=[]
  const ordered=course.current.units.flatMap(unit=>unit.lessons),start=Math.max(0,ordered.findIndex(item=>item.id===lesson.value.id))
  const rotated=[...ordered.slice(start),...ordered.slice(0,start)]
  for(const item of rotated)for(const id of item.wordIds)
   if(!seen.has(id)){seen.add(id);ids.push(id)}
  return ids
 })
 const newCandidates=computed(()=>courseWordPool.value.filter(id=>!profile.db.cards[id]&&!!wordById[id]))
 const newWords=computed(()=>{
  if(review.due.length || (session.value && !session.value.completedAt && session.value.kind==='review_due'))return []
  const remaining=Math.max(0,plannedNewWordCeiling(parent.plannerConfig)-newToday.value)
  return newCandidates.value.slice(0,remaining)
 })
 const needsConsolidation=computed(()=>course.currentId==='starter'&&profile.db.lastLessonAccuracy!==null && profile.db.lastLessonAccuracy<.8)
 const dailyPlan=computed(()=>{
  const weak=new Set(review.weak.map(c=>c.wordId)),history=new Map<string,Answer[]>()
  for(const answer of profile.db.history){if(!history.has(answer.wordId))history.set(answer.wordId,[]);history.get(answer.wordId)!.push(answer)}
  return planDailySession({config:parent.plannerConfig,dueIds:review.due.map(c=>c.wordId),weakIds:lesson.value.wordIds.filter(id=>profile.db.cards[id]&&(needsConsolidation.value||weak.has(id)||needsRecentPractice(history.get(id)||[]))),newIds:needsConsolidation.value?[]:newCandidates.value,newToday:newToday.value})
 })
 const currentSource=computed(()=>session.value?.wordSources?.[current.value?.id||'']||session.value?.kind||'practice')
 const choices=computed(()=>{
  if(!current.value)return []
  const pool=session.value?.wordSnapshot||wordById,ids=[current.value.id,...current.value.distractors.filter(id=>pool[id])]
  const offset=(session.value?.index??0)%ids.length
  return [...ids.slice(offset),...ids.slice(0,offset)].map(id=>pool[id])
 })
 function start(request?:string[],scopedDue=false){
  review.refresh()
  if(session.value && !session.value.completedAt)return true
  let ids:string[],kind:LearningSession['kind'],wordSources:LearningSession['wordSources']
  if(scopedDue){const allowed=new Set(request||[]);ids=review.due.map(c=>c.wordId).filter(id=>allowed.has(id));kind='review_due';wordSources=Object.fromEntries(ids.map(id=>[id,'review_due' as const]))}
  else if(review.due.length&&request?.length){ids=review.due.map(c=>c.wordId);kind='review_due'}
  else if(request?.length){ids=request.filter(id=>wordById[id]);kind='practice'}
  else if(needsConsolidation.value&&!review.due.length){ids=lesson.value.wordIds.filter(id=>profile.db.cards[id]);kind='practice'}
  else{const plan=dailyPlan.value;ids=plan.wordIds;wordSources=plan.wordSources;kind=plan.dueIds.length?'review_due':plan.newIds.length?'new_word':'practice'}
  if(!ids.length)return false
  const snapshot:Record<string,typeof wordById[string]>={}
  for(const id of ids){const source=getCourseWord(course.currentId,id);if(!source)continue;const word=JSON.parse(JSON.stringify({...source,example:lesson.value.examples?.[id]||source.example}));if(!word.distractors.length){const candidates=course.wordIds.map(id=>wordById[id]).filter(w=>w&&w.id!==word.id&&w.word!==word.word&&w.meaning!==word.meaning);word.distractors=candidates.filter((w,i)=>candidates.findIndex(other=>other.meaning===w.meaning)===i).slice(0,3).map(w=>w.id)}snapshot[id]=word;for(const distractor of word.distractors)if(wordById[distractor])snapshot[distractor]=JSON.parse(JSON.stringify(wordById[distractor]))}
  return profile.transact(d=>{d.session={id:`session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,startedAt:new Date().toISOString(),date:localDate(),kind,wordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[],courseId:course.currentId,contentVersion:course.current.contentVersion,lessonId:lesson.value.id,wordSnapshot:snapshot,seed:Date.now(),wordSources,plannerConfig:{...parent.plannerConfig}}})
 }
 function patch(change:Partial<LearningSession>){return profile.transact(d=>{if(d.session && !d.session.completedAt)Object.assign(d.session,change)})}
 function setMode(mode:LearningMode){if(session.value?.answers[session.value.index]||!current.value||!availableModes(current.value,Object.values(session.value?.wordSnapshot||wordById),readFeedbackSettings().sound,session.value?.plannerConfig?.entryLevel).includes(mode))return false;return patch({mode,input:'',selected:'',revealed:false})}
 function reveal(){return patch({revealed:true})}
 function hint(){return profile.transact(d=>{if(d.session&&!d.session.revealed&&!d.session.answers[d.session.index]){d.gems=Math.max(0,d.gems-1);d.session.revealed=true}})}
 function submit(rating?:ReviewRating){
  if(!session.value||!current.value||session.value.completedAt||session.value.answers[session.value.index])return false
  const s=session.value,w=current.value,source=currentSource.value
  if(s.mode!=='flash' && ((s.mode==='connect'||s.mode==='listen')?!s.selected:!s.input.trim()))return false
  if(s.mode==='flash' && !s.revealed)return false
  const correct=s.mode==='flash' ? rating!==1 : (s.mode==='spell'||s.mode==='dictation') ? isCorrectSpelling(s.input,w) : s.selected===w.id
  const actualRating:ReviewRating=correct?(s.revealed&&s.mode!=='flash'?2:rating??3):1
  const now=new Date()
  const answer:Answer={id:`${s.id}:${s.index}`,wordId:w.id,correct,rating:actualRating,at:now.toISOString(),source:source==='review_due'?'review_due':'new_word',mode:s.mode,input:s.input||s.selected}
  const ok=profile.transact(d=>{
   if(!d.session || d.session.answers[d.session.index])return
   d.session.answers.push(answer)
   if(source!=='practice'){
    d.cards[w.id]=new FSRSScheduler().schedule(d.cards[w.id]??newCard(w.id,now),actualRating,now).card
    d.history.push(answer)
    applyLearningReward(d,answer)
    if(!d.streakDates.includes(localDate(now)))d.streakDates.push(localDate(now))
   }
   d.session.revealed=true
  })
  review.refresh();return ok
 }
 function next(){
  if(!session.value||session.value.completedAt||!session.value.answers[session.value.index])return false
  return profile.transact(d=>{
   const s=d.session!;
   if(s.index<s.wordIds.length-1){s.index++;s.input='';s.selected='';s.revealed=false}
   else{
    s.completedAt=new Date().toISOString()
    if(s.wordSources&&Object.values(s.wordSources).includes('new_word')){
     const answers=s.answers.filter(a=>s.wordSources![a.wordId]==='new_word'),accuracy=answers.filter(a=>a.correct).length/answers.length,courseId=s.courseId||'starter'
     d.courseProgress??={};d.courseProgress[courseId]??=initialProgress(courseId);d.courseProgress[courseId].lastLessonAccuracy=accuracy
     if(courseId==='starter'){
      d.lastLessonAccuracy=accuracy
      if(canUnlockNextUnit(answers)&&lesson.value.wordIds.every(id=>d.cards[id]))d.lessonIndex=Math.min(d.lessonIndex+1,lessons.length-1)
      d.courseProgress.starter.currentLessonId=lessons[d.lessonIndex].id
     }
    }else if((s.courseId||'starter')==='starter'&&(s.kind==='new_word'||s.kind==='practice')){
     d.lastLessonAccuracy=s.answers.filter(a=>a.correct).length/s.answers.length
     if(canUnlockNextUnit(s.answers)&&s.wordIds.every(id=>lesson.value.wordIds.includes(id))&&lesson.value.wordIds.every(id=>d.cards[id]))d.lessonIndex=Math.min(d.lessonIndex+1,lessons.length-1)
     d.courseProgress??={};d.courseProgress.starter??=initialProgress('starter');d.courseProgress.starter.lastLessonAccuracy=d.lastLessonAccuracy;d.courseProgress.starter.currentLessonId=lessons[d.lessonIndex].id
    }else if(s.kind==='new_word'){
     const courseId=s.courseId!;d.courseProgress??={};d.courseProgress[courseId]??=initialProgress(courseId);d.courseProgress[courseId].lastLessonAccuracy=s.answers.filter(a=>a.correct).length/s.answers.length
    }
   }
  })
 }
 function previous(){if(!session.value || session.value.index===0)return false;return patch({index:session.value.index-1,input:session.value.answers[session.value.index-1]?.input??'',revealed:true})}
 const learnedCount=computed(()=>Object.keys(profile.db.cards).length)
 const remainingCount=computed(()=>course.wordIds.filter(id=>!profile.db.cards[id]).length)
 return {session,current,currentSource,choices,todayAnswers,newToday,newWords,dailyPlan,lesson,needsConsolidation,learnedCount,remainingCount,start,startDue:(ids:string[])=>start(ids,true),patch,setMode,reveal,hint,submit,next,previous}
})
