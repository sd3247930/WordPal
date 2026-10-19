import {defineStore} from 'pinia'
import {computed,ref} from 'vue'
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
import {orderedCourseWords,courseIntroductions,sessionInCourse} from '../services/learning/CourseStudySequence'
import {selectDailyPlan,ensureDailyPlan,dailyTasks,advanceDailyPlan,recordDailyAnswer,fullCourseWords,completedPrefix,STEP_TITLES} from '../services/learning/DailyLearningPlan'
import {todayCourseWordIds} from '../services/learning/StudyStats'
export const modes:{id:LearningMode;name:string;description:string}[]=[{id:'flash',name:'闪现',description:'看看单词，回想它的意思'},{id:'connect',name:'连接',description:'为单词找到正确的中文意思'},{id:'listen',name:'听音',description:'听发音，选出对应的单词'},{id:'spell',name:'拼写',description:'看中文，用字母拼出单词'},{id:'dictation',name:'听写',description:'听发音，写出这个单词'}]
export const useLearningStore=defineStore('learning',()=>{
 const profile=useProfileStore(),review=useReviewStore(),course=useCourseStore(),parent=useParentSettingsStore()
 const clock=ref(Date.now())
 const todayPlan=computed(()=>selectDailyPlan(profile.db,course.current,new Date(clock.value)))
 const isDaily=computed(()=>course.progress.studyActivity==='daily'&&!!course.progress.dailyPlan?.flow?.begunAt)
 const session=computed(()=>isDaily.value?course.progress.dailyPlan!:profile.db.session&&sessionInCourse(profile.db.session,course.currentId)?profile.db.session:null)
 const tasks=computed(()=>dailyTasks(todayPlan.value))
 const planProblem=computed(()=>todayPlan.value?.wordIds.some(id=>!allowedIds.value.has(id))?'教材内容已变更，原任务已保留。请在家长区恢复对应教材版本后继续。':'')
 const current=computed(()=>session.value ? resolveFrozenWord(session.value.wordSnapshot?.[session.value.wordIds[session.value.index]]||wordById[session.value.wordIds[session.value.index]],session.value.courseId,session.value.contentVersion):undefined)
 const todayAnswers=computed(()=>profile.db.history.filter(a=>localDate(new Date(a.at))===localDate()))
 const courseWordPool=computed(()=>orderedCourseWords(course.current)),allowedIds=computed(()=>new Set(courseWordPool.value))
 const introductions=computed(()=>courseIntroductions(profile.db,course.currentId))
 const newTodayWordIds=computed(()=>todayCourseWordIds(profile.db,course.current,new Date(clock.value)))
 const newToday=computed(()=>newTodayWordIds.value.length)
 const newCandidates=computed(()=>courseWordPool.value.filter(id=>!(id in introductions.value)&&!!wordById[id]))
 const studyWords=computed(()=>todayPlan.value&&!todayPlan.value.completedAt?todayPlan.value.wordIds:[])
 const newWords=computed(()=>studyWords.value.filter(id=>!profile.db.cards[id]))
 const due=computed(()=>review.due.filter(card=>allowedIds.value.has(card.wordId)))
 const lesson=computed(()=>{const id=session.value?.wordIds[session.value.index]||todayPlan.value?.wordIds[0]||newCandidates.value[0];return course.lessons.find(lesson=>lesson.wordIds.includes(id))||course.lesson})
 const needsConsolidation=computed(()=>course.currentId==='starter'&&profile.db.lastLessonAccuracy!==null && profile.db.lastLessonAccuracy<.8)
 const dailyPlan=computed(()=>({wordIds:todayPlan.value?.wordIds||[],newIds:todayPlan.value?.wordIds||[],dueIds:[] as string[],weakIds:[] as string[],sequenceIds:todayPlan.value?.wordIds||[],wordSources:todayPlan.value?.wordSources||{}}))
 const textbookProgress=computed(()=>{const ids=courseWordPool.value,learned=Object.keys(fullCourseWords(profile.db,course.current)).length,prefix=completedPrefix(profile.db,course.current);return {total:ids.length,learned,prefix,percent:ids.length?Math.floor(learned/ids.length*100):0}})
 const currentSource=computed(()=>session.value?.wordSources?.[current.value?.id||'']||session.value?.kind||'practice')
 const choices=computed(()=>{
  if(!current.value)return []
  const pool=session.value?.wordSnapshot||wordById,selected=[current.value],meanings=new Set([current.value.meaning])
  for(const id of [...current.value.distractors,...courseWordPool.value]){if(!allowedIds.value.has(id)||selected.some(word=>word.id===id))continue;const word=resolveFrozenWord(pool[id]||getCourseWord(course.currentId,id),course.currentId,session.value?.contentVersion);if(!word||meanings.has(word.meaning)||word.word===current.value.word)continue;selected.push(word);meanings.add(word.meaning);if(selected.length===4)break}
  const offset=(session.value?.index??0)%selected.length
  return [...selected.slice(offset),...selected.slice(0,offset)]
 })
 function freezeWords(ids:string[]){
  const snapshot:Record<string,typeof wordById[string]>={}
  for(const id of ids){
   const source=getCourseWord(course.currentId,id);if(!source)continue
   const sourceLesson=course.lessons.find(lesson=>lesson.wordIds.includes(id)),word=JSON.parse(JSON.stringify({...source,example:sourceLesson?.examples?.[id]||source.example}))
   const alternatives=[...word.distractors,...courseWordPool.value],meanings=new Set([word.meaning]),seen=new Set([id]);word.distractors=[]
   for(const candidate of alternatives){if(seen.has(candidate)||!allowedIds.value.has(candidate))continue;seen.add(candidate);const other=getCourseWord(course.currentId,candidate);if(!other||other.word===word.word||meanings.has(other.meaning))continue;meanings.add(other.meaning);word.distractors.push(candidate);if(word.distractors.length===3)break}
   snapshot[id]=word
   for(const distractor of word.distractors)if(!snapshot[distractor])snapshot[distractor]=JSON.parse(JSON.stringify({...getCourseWord(course.currentId,distractor),distractors:[]}))
  }
  return snapshot
 }
 function startIndependent(request?:string[],scopedDue=false,selection?:{unitId?:string;wordId?:string},practiceOnly=false){
  review.refresh()
  if(profile.db.session&&!profile.db.session.completedAt&&sessionInCourse(profile.db.session,course.currentId))return profile.transact(d=>{d.courseProgress![course.currentId].studyActivity='independent'})
  let ids:string[],kind:LearningSession['kind'],wordSources:LearningSession['wordSources'],sequenceWordIds:string[]|undefined
  const requested=[...new Set(request||[])].filter(id=>allowedIds.value.has(id)&&!!wordById[id])
  if(request?.length&&!requested.length){uni.showToast?.({title:'该单词不在当前教材中，请先选择对应教材。',icon:'none'});return false}
  if(practiceOnly){ids=requested;kind='practice';wordSources=Object.fromEntries(ids.map(id=>[id,'practice' as const]))}
  else if(scopedDue){const allowed=new Set(requested);ids=due.value.map(c=>c.wordId).filter(id=>allowed.has(id));kind='review_due';wordSources=Object.fromEntries(ids.map(id=>[id,'review_due' as const]))}
  else if(due.value.length&&requested.length){ids=due.value.map(c=>c.wordId);kind='review_due'}
  else if(requested.length){ids=requested;kind='practice'}
  else{ids=[];kind='practice'}
  if(!ids.length)return false
  const snapshot=freezeWords(ids)
  return profile.transact(d=>{d.courseProgress??={};(d.courseProgress[course.currentId]??=initialProgress(course.currentId)).studyActivity='independent';const introduced=courseIntroductions(d,course.currentId);if(Object.keys(introduced).length){d.courseProgress??={};const progress=d.courseProgress[course.currentId]??=initialProgress(course.currentId);progress.introducedWords=introduced}d.session={id:`session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,startedAt:new Date().toISOString(),date:localDate(),kind,wordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[],courseId:course.currentId,contentVersion:course.current.contentVersion,lessonId:lesson.value.id,wordSnapshot:snapshot,seed:Date.now(),wordSources,plannerConfig:{...parent.plannerConfig},intent:scopedDue||requested.length&&kind==='review_due'?'review':requested.length?'practice':'course',...(sequenceWordIds?{sequenceWordIds}:{})}})
 }
 function refreshDay(){clock.value=Date.now()}
 // Page previews must not write a new daily assignment over an independent visit.
 // The explicit start action atomically persists the plan and its frozen words.
 function prepareDaily(){refreshDay();return !!todayPlan.value&&!planProblem.value}
 function start(request?:string[],scopedDue=false,selection?:{unitId?:string;wordId?:string}){
  if(request?.length||scopedDue)return startIndependent(request,scopedDue,selection)
  refreshDay();if(!todayPlan.value||planProblem.value){if(planProblem.value)uni.showToast?.({title:planProblem.value,icon:'none'});return false}
  const owner=course.currentId,pack=course.current
  return profile.transact(d=>{
   const plan=ensureDailyPlan(d,pack,new Date(clock.value))!;d.courseProgress![owner].studyActivity='daily'
   if(!plan.wordSnapshot){
    plan.wordSnapshot=freezeWords(plan.wordIds)
    plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,d.cards[id]?(Date.parse(d.cards[id].due)<=clock.value?'review_due':'practice'):'new_word']))
   }
   plan.flow!.begunAt??=new Date(clock.value).toISOString();if(plan.mode==='flash'&&!plan.answers[plan.index])plan.revealed=true
  })
 }
 function activeDraft(d:typeof profile.db){return isDaily.value?d.courseProgress?.[course.currentId]?.dailyPlan:d.session}
 function patch(change:Partial<LearningSession>){return profile.transact(d=>{const target=activeDraft(d);if(target&&!target.completedAt){if(target.flow){for(const field of ['input','selected','revealed'] as const)if(change[field]!==undefined)(target as any)[field]=change[field]}else Object.assign(target,change)}})}
 function setMode(mode:LearningMode){if(isDaily.value)return session.value?.mode===mode;if(session.value?.answers[session.value.index]||!current.value||!availableModes(current.value,Object.values(session.value?.wordSnapshot||wordById),readFeedbackSettings().sound,session.value?.plannerConfig?.entryLevel).includes(mode))return false;return patch({mode,input:'',selected:'',revealed:false,hinted:false})}
 function reveal(){return patch({revealed:true})}
 function hint(){
  const s=session.value
  if(!s||s.completedAt||s.answers[s.index])return false
  if(s.hinted||s.mode!=='flash'&&s.revealed)return true
  return profile.transact(d=>{const target=activeDraft(d);if(target&&target.id===s.id&&target.index===s.index&&!target.hinted&&!target.answers[target.index]){d.gems=Math.max(0,d.gems-1);target.hinted=true}})
 }
 function submit(rating?:ReviewRating){
  if(!session.value||!current.value||session.value.completedAt||session.value.answers[session.value.index])return false
  if(isDaily.value)return submitDaily(rating)
  const s=session.value,w=current.value,source=currentSource.value
  if(s.mode!=='flash' && ((s.mode==='connect'||s.mode==='listen')?!s.selected:!s.input.trim()))return false
  if(s.mode==='flash' && !s.revealed)return false
  const correct=s.mode==='flash' ? rating!==1 : (s.mode==='spell'||s.mode==='dictation') ? isCorrectSpelling(s.input,w) : s.selected===w.id
  const actualRating:ReviewRating=correct?((s.hinted||s.revealed)&&s.mode!=='flash'?2:rating??3):1
  const now=new Date()
  const answer:Answer={id:`${s.id}:${s.index}`,wordId:w.id,correct,rating:actualRating,at:now.toISOString(),source,mode:s.mode,input:s.input||s.selected,hinted:s.mode!=='flash'&&!!(s.hinted||s.revealed),courseId:course.currentId,...(source==='review_due'&&profile.db.cards[w.id]?{dueAtSubmit:profile.db.cards[w.id].due}:{})}
  const ok=profile.transact(d=>{
   if(!d.session || d.session.answers[d.session.index])return
   d.session.answers.push(answer)
   if(s.sequenceWordIds?.includes(w.id)||source==='new_word'){d.courseProgress??={};const p=d.courseProgress[course.currentId]??=initialProgress(course.currentId);p.introducedWords={...courseIntroductions(d,course.currentId),[w.id]:now.toISOString()}}
   // Real free-practice evidence is retained without scheduling or rewards.
   if(source==='practice'){d.practiceAnswers??=[];d.practiceAnswers.push(answer)}
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
 function submitDaily(rating?:ReviewRating){
  const s=session.value!,w=current.value!,owner=s.courseId!,step=s.flow!.step
  if(planProblem.value||s.mode!=='flash'&&(['connect','listen'].includes(s.mode)?!s.selected:!s.input.trim())||s.mode==='flash'&&!s.revealed)return false
  const correct=s.mode==='flash'?rating!==1:['spell','dictation'].includes(s.mode)?isCorrectSpelling(s.input,w):s.selected===w.id
  const now=new Date(),hadError=s.flow!.attempts.some(a=>a.wordId===w.id&&!a.correct),actualRating:ReviewRating=correct?(hadError||s.mode!=='flash'&&(s.hinted||s.revealed)?2:rating??3):1
  const source=step==='consolidate'&&correct?(s.wordSources?.[w.id]||'new_word'):'practice'
  const answer:Answer={id:`${s.id}:${step}:${s.index}:${s.flow!.attempts.length}`,wordId:w.id,courseId:owner,at:now.toISOString(),correct,rating:actualRating,mode:s.mode,source,input:s.input||s.selected}
  return profile.transact(d=>{
   const target=d.courseProgress?.[owner]?.dailyPlan
   if(!target||target.id!==s.id||target.flow?.step!==step||target.index!==s.index||!recordDailyAnswer(target,answer))return
   d.practiceAnswers??=[]
   // All six activities retain evidence, while SRS and original rewards settle once per word.
   if(source==='practice')d.practiceAnswers.push(answer)
   else if(!d.history.some(a=>a.id===answer.id||a.wordId===w.id&&localDate(new Date(a.at))===localDate(now))){
    d.cards[w.id]=new FSRSScheduler().schedule(d.cards[w.id]??newCard(w.id,now),actualRating,now).card
    d.history.push(answer);applyLearningReward(d,answer)
   }else d.practiceAnswers.push({...answer,source:'practice'})
   if(!d.streakDates.includes(localDate(now)))d.streakDates.push(localDate(now))
  })
 }
 function next(){
  if(!session.value||session.value.completedAt||!session.value.answers[session.value.index])return false
  if(isDaily.value){const s=session.value,owner=s.courseId!,step=s.flow!.step,index=s.index;return profile.transact(d=>{
   const p=d.courseProgress![owner],target=p.dailyPlan!
   if(target.id!==s.id||target.flow?.step!==step||target.index!==index||!advanceDailyPlan(target))return
   if(target.completedAt){const at=target.completedAt;p.fullLearnedWords??={};p.introducedWords??={};for(const id of target.wordIds){p.fullLearnedWords[id]=at;p.introducedWords[id]??=at}const nextId=courseWordPool.value[completedPrefix(d,course.current)]||target.wordIds.at(-1);const nextLesson=course.lessons.find(l=>l.wordIds.includes(nextId!));if(nextLesson)p.currentLessonId=nextLesson.id}
  })}
  return profile.transact(d=>{
   const s=d.session!;
   if(s.index<s.wordIds.length-1){s.index++;s.input='';s.selected='';s.revealed=false;delete s.hinted}
   else{
    s.completedAt=new Date().toISOString()
    if(s.sequenceWordIds?.length){const id=s.courseId||course.currentId,p=d.courseProgress![id],introduced=courseIntroductions(d,id),next=courseWordPool.value.find(wordId=>!(wordId in introduced)),target=course.lessons.find(lesson=>lesson.wordIds.includes(next||s.wordIds.at(-1)!))||lesson.value;p.currentLessonId=target.id;p.lastLessonAccuracy=s.answers.filter(answer=>answer.correct).length/s.answers.length;if(id==='starter'){d.lastLessonAccuracy=p.lastLessonAccuracy;d.lessonIndex=Math.max(0,lessons.findIndex(lesson=>lesson.id===target.id))}return}
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
 function previous(){if(isDaily.value||!session.value || session.value.index===0)return false;return patch({index:session.value.index-1,input:session.value.answers[session.value.index-1]?.input??'',revealed:true})}
 const learnedCount=computed(()=>Object.keys(profile.db.cards).length)
 const remainingCount=computed(()=>course.wordIds.filter(id=>!profile.db.cards[id]).length)
 const positionFor=(id?:string)=>{const index=courseWordPool.value.indexOf(id||'');return index<0?null:{index:index+1,total:courseWordPool.value.length}}
 const currentPosition=computed(()=>positionFor(current.value?.id))
 return {session,current,currentSource,choices,todayAnswers,newToday,newTodayWordIds,newWords,studyWords,due,dailyPlan,todayPlan,tasks,isDaily,planProblem,textbookProgress,prepareDaily,refreshDay,startPractice:()=>startIndependent(todayPlan.value?.wordIds||lesson.value.wordIds,false,undefined,true),stepTitles:STEP_TITLES,lesson,needsConsolidation,learnedCount,remainingCount,currentPosition,positionFor,start,startSelected:(unitId?:string,wordId?:string)=>start(undefined,false,{unitId,wordId}),startDue:(ids:string[])=>start(ids,true),patch,setMode,reveal,hint,submit,next,previous}
})
