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
import {orderedCourseWords,courseIntroductions,sessionInCourse} from '../services/learning/CourseStudySequence'
export const modes:{id:LearningMode;name:string;description:string}[]=[{id:'flash',name:'闪现',description:'看看单词，回想它的意思'},{id:'connect',name:'连接',description:'为单词找到正确的中文意思'},{id:'listen',name:'听音',description:'听发音，选出对应的单词'},{id:'spell',name:'拼写',description:'看中文，用字母拼出单词'},{id:'dictation',name:'听写',description:'听发音，写出这个单词'}]
export const useLearningStore=defineStore('learning',()=>{
 const profile=useProfileStore(),review=useReviewStore(),course=useCourseStore(),parent=useParentSettingsStore()
 const session=computed(()=>profile.db.session&&sessionInCourse(profile.db.session,course.currentId)?profile.db.session:null)
 const current=computed(()=>session.value ? resolveFrozenWord(session.value.wordSnapshot?.[session.value.wordIds[session.value.index]]||wordById[session.value.wordIds[session.value.index]],session.value.courseId,session.value.contentVersion):undefined)
 const todayAnswers=computed(()=>profile.db.history.filter(a=>localDate(new Date(a.at))===localDate()))
 const courseWordPool=computed(()=>orderedCourseWords(course.current)),allowedIds=computed(()=>new Set(courseWordPool.value))
 const introductions=computed(()=>courseIntroductions(profile.db,course.currentId))
 const newToday=computed(()=>Object.values(introductions.value).filter(at=>at&&localDate(new Date(at))===localDate()).length)
 const newCandidates=computed(()=>courseWordPool.value.filter(id=>!(id in introductions.value)&&!!wordById[id]))
 const studyWords=computed(()=>newCandidates.value.slice(0,Math.max(0,plannedNewWordCeiling(parent.plannerConfig)-newToday.value)))
 const newWords=computed(()=>studyWords.value.filter(id=>!profile.db.cards[id]))
 const due=computed(()=>review.due.filter(card=>allowedIds.value.has(card.wordId)))
 const lesson=computed(()=>{const id=session.value?.wordIds[session.value.index]||newCandidates.value[0];return course.lessons.find(lesson=>lesson.wordIds.includes(id))||course.lesson})
 const needsConsolidation=computed(()=>course.currentId==='starter'&&profile.db.lastLessonAccuracy!==null && profile.db.lastLessonAccuracy<.8)
 const dailyPlan=computed(()=>{
  if(studyWords.value.length){
   const plan=planDailySession({config:parent.plannerConfig,dueIds:[],weakIds:[],newIds:studyWords.value,newToday:0})
   const dueSet=new Set(due.value.map(card=>card.wordId))
   for(const id of plan.wordIds)plan.wordSources[id]=profile.db.cards[id]?(dueSet.has(id)?'review_due':'practice'):'new_word'
   return {...plan,newIds:plan.wordIds.filter(id=>plan.wordSources[id]==='new_word'),dueIds:plan.wordIds.filter(id=>plan.wordSources[id]==='review_due'),weakIds:plan.wordIds.filter(id=>plan.wordSources[id]==='practice'),sequenceIds:[...plan.wordIds]}
  }
  const weak=new Set(review.weak.map(c=>c.wordId)),history=new Map<string,Answer[]>()
  for(const answer of profile.db.history){if(!history.has(answer.wordId))history.set(answer.wordId,[]);history.get(answer.wordId)!.push(answer)}
  return {...planDailySession({config:parent.plannerConfig,dueIds:due.value.map(c=>c.wordId),weakIds:lesson.value.wordIds.filter(id=>id in introductions.value&&profile.db.cards[id]&&(needsConsolidation.value||weak.has(id)||needsRecentPractice(history.get(id)||[]))),newIds:[],newToday:newToday.value}),sequenceIds:[] as string[]}
 })
 const currentSource=computed(()=>session.value?.wordSources?.[current.value?.id||'']||session.value?.kind||'practice')
 const choices=computed(()=>{
  if(!current.value)return []
  const pool=session.value?.wordSnapshot||wordById,selected=[current.value],meanings=new Set([current.value.meaning])
  for(const id of [...current.value.distractors,...courseWordPool.value]){if(!allowedIds.value.has(id)||selected.some(word=>word.id===id))continue;const word=resolveFrozenWord(pool[id]||getCourseWord(course.currentId,id),course.currentId,session.value?.contentVersion);if(!word||meanings.has(word.meaning)||word.word===current.value.word)continue;selected.push(word);meanings.add(word.meaning);if(selected.length===4)break}
  const offset=(session.value?.index??0)%selected.length
  return [...selected.slice(offset),...selected.slice(0,offset)]
 })
 function start(request?:string[],scopedDue=false,selection?:{unitId?:string;wordId?:string}){
  review.refresh()
  if(session.value && !session.value.completedAt)return true
  let ids:string[],kind:LearningSession['kind'],wordSources:LearningSession['wordSources'],sequenceWordIds:string[]|undefined
  const requested=[...new Set(request||[])].filter(id=>allowedIds.value.has(id)&&!!wordById[id])
  if(request?.length&&!requested.length){uni.showToast?.({title:'该单词不在当前教材中，请先选择对应教材。',icon:'none'});return false}
  if(scopedDue){const allowed=new Set(requested);ids=due.value.map(c=>c.wordId).filter(id=>allowed.has(id));kind='review_due';wordSources=Object.fromEntries(ids.map(id=>[id,'review_due' as const]))}
  else if(due.value.length&&requested.length){ids=due.value.map(c=>c.wordId);kind='review_due'}
  else if(requested.length){ids=requested;kind='practice'}
  else{const plan=dailyPlan.value;ids=plan.wordIds;wordSources=plan.wordSources;sequenceWordIds=plan.sequenceIds.length?plan.sequenceIds:undefined;kind=plan.newIds.length?'new_word':plan.dueIds.length?'review_due':'practice'}
  if(!ids.length)return false
  const snapshot:Record<string,typeof wordById[string]>={}
  for(const id of ids){
   const source=getCourseWord(course.currentId,id);if(!source)continue
   const sourceLesson=course.lessons.find(lesson=>lesson.wordIds.includes(id)),word=JSON.parse(JSON.stringify({...source,example:sourceLesson?.examples?.[id]||source.example}))
   const alternatives=[...word.distractors,...courseWordPool.value],meanings=new Set([word.meaning]),seen=new Set([id]);word.distractors=[]
   for(const candidate of alternatives){if(seen.has(candidate)||!allowedIds.value.has(candidate))continue;seen.add(candidate);const other=getCourseWord(course.currentId,candidate);if(!other||other.word===word.word||meanings.has(other.meaning))continue;meanings.add(other.meaning);word.distractors.push(candidate);if(word.distractors.length===3)break}
   snapshot[id]=word
   for(const distractor of word.distractors)if(!snapshot[distractor])snapshot[distractor]=JSON.parse(JSON.stringify({...getCourseWord(course.currentId,distractor),distractors:[]}))
  }
  return profile.transact(d=>{const introduced=courseIntroductions(d,course.currentId);if(Object.keys(introduced).length){d.courseProgress??={};const progress=d.courseProgress[course.currentId]??=initialProgress(course.currentId);progress.introducedWords=introduced}d.session={id:`session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,startedAt:new Date().toISOString(),date:localDate(),kind,wordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[],courseId:course.currentId,contentVersion:course.current.contentVersion,lessonId:lesson.value.id,wordSnapshot:snapshot,seed:Date.now(),wordSources,plannerConfig:{...parent.plannerConfig},intent:scopedDue||requested.length&&kind==='review_due'?'review':requested.length?'practice':'course',...(sequenceWordIds?{sequenceWordIds}:{})}})
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
  const answer:Answer={id:`${s.id}:${s.index}`,wordId:w.id,correct,rating:actualRating,at:now.toISOString(),source,mode:s.mode,input:s.input||s.selected,hinted:s.mode!=='flash'&&s.revealed,courseId:course.currentId,...(source==='review_due'&&profile.db.cards[w.id]?{dueAtSubmit:profile.db.cards[w.id].due}:{})}
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
 function next(){
  if(!session.value||session.value.completedAt||!session.value.answers[session.value.index])return false
  return profile.transact(d=>{
   const s=d.session!;
   if(s.index<s.wordIds.length-1){s.index++;s.input='';s.selected='';s.revealed=false}
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
 function previous(){if(!session.value || session.value.index===0)return false;return patch({index:session.value.index-1,input:session.value.answers[session.value.index-1]?.input??'',revealed:true})}
 const learnedCount=computed(()=>Object.keys(profile.db.cards).length)
 const remainingCount=computed(()=>course.wordIds.filter(id=>!profile.db.cards[id]).length)
 const positionFor=(id?:string)=>{const index=courseWordPool.value.indexOf(id||'');return index<0?null:{index:index+1,total:courseWordPool.value.length}}
 const currentPosition=computed(()=>positionFor(current.value?.id))
 return {session,current,currentSource,choices,todayAnswers,newToday,newWords,studyWords,due,dailyPlan,lesson,needsConsolidation,learnedCount,remainingCount,currentPosition,positionFor,start,startSelected:(unitId?:string,wordId?:string)=>start(undefined,false,{unitId,wordId}),startDue:(ids:string[])=>start(ids,true),patch,setMode,reveal,hint,submit,next,previous}
})
