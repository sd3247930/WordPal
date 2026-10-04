import {defineStore} from 'pinia'
import {computed} from 'vue'
import {wordById,lessons,words} from '../../packages/content_schema'
import {localDate,canUnlockNextUnit,type LearningMode,type ReviewRating,type Answer,type LearningSession} from '../../packages/core_learning'
import {FSRSScheduler,newCard} from '../../packages/srs_fsrs'
import {isCorrectSpelling} from '../../packages/phonics'
import {applyLearningReward} from '../../packages/pet_engine'
import {useProfileStore} from './profile'
import {useReviewStore} from './review'
export const modes:{id:LearningMode;name:string;description:string}[]=[{id:'flash',name:'闪现',description:'看看单词，回想它的意思'},{id:'connect',name:'连接',description:'为单词找到正确的中文意思'},{id:'listen',name:'听音',description:'听发音，选出对应的单词'},{id:'spell',name:'拼写',description:'看中文，用字母拼出单词'},{id:'dictation',name:'听写',description:'听发音，写出这个单词'}]
export const useLearningStore=defineStore('learning',()=>{
 const profile=useProfileStore(),review=useReviewStore()
 const session=computed(()=>profile.db.session)
 const current=computed(()=>session.value ? wordById[session.value.wordIds[session.value.index]]:undefined)
 const todayAnswers=computed(()=>profile.db.history.filter(a=>localDate(new Date(a.at))===localDate()))
 const newToday=computed(()=>new Set(todayAnswers.value.filter(a=>a.source==='new_word').map(a=>a.wordId)).size)
 const lesson=computed(()=>lessons[Math.min(profile.db.lessonIndex,lessons.length-1)])
 const newWords=computed(()=>{
  if(review.due.length || (session.value && !session.value.completedAt && session.value.kind==='review_due'))return []
  const remaining=Math.max(0,profile.db.dailyLimit-newToday.value)
  return lesson.value.wordIds.filter(id=>!profile.db.cards[id]).slice(0,remaining)
 })
 const needsConsolidation=computed(()=>profile.db.lastLessonAccuracy!==null && profile.db.lastLessonAccuracy<.8)
 const choices=computed(()=>{
  if(!current.value)return []
  const ids=[current.value.id,...current.value.distractors]
  const offset=(session.value?.index??0)%4
  return [...ids.slice(offset),...ids.slice(0,offset)].map(id=>wordById[id])
 })
 function start(request?:string[]){
  review.refresh()
  if(session.value && !session.value.completedAt)return true
  let ids:string[],kind:LearningSession['kind']
  if(review.due.length){ids=review.due.map(c=>c.wordId);kind='review_due'}
  else if(request?.length){ids=request.filter(id=>wordById[id]);kind='practice'}
  else if(needsConsolidation.value){ids=lesson.value.wordIds.filter(id=>profile.db.cards[id]);kind='practice'}
  else{ids=newWords.value;kind='new_word'}
  if(!ids.length)return false
  return profile.transact(d=>{d.session={id:`session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,startedAt:new Date().toISOString(),date:localDate(),kind,wordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[]}})
 }
 function patch(change:Partial<LearningSession>){return profile.transact(d=>{if(d.session && !d.session.completedAt)Object.assign(d.session,change)})}
 function setMode(mode:LearningMode){if(session.value?.answers[session.value.index])return false;return patch({mode,input:'',selected:'',revealed:false})}
 function reveal(){return patch({revealed:true})}
 function hint(){return profile.transact(d=>{if(d.session&&!d.session.revealed&&!d.session.answers[d.session.index]){d.gems=Math.max(0,d.gems-1);d.session.revealed=true}})}
 function submit(rating?:ReviewRating){
  if(!session.value||!current.value||session.value.completedAt||session.value.answers[session.value.index])return false
  const s=session.value,w=current.value
  if(s.mode!=='flash' && ((s.mode==='connect'||s.mode==='listen')?!s.selected:!s.input.trim()))return false
  if(s.mode==='flash' && !s.revealed)return false
  const correct=s.mode==='flash' ? rating!==1 : (s.mode==='spell'||s.mode==='dictation') ? isCorrectSpelling(s.input,w) : s.selected===w.id
  const actualRating:ReviewRating=correct?(s.revealed&&s.mode!=='flash'?2:rating??3):1
  const now=new Date()
  const answer:Answer={id:`${s.id}:${s.index}`,wordId:w.id,correct,rating:actualRating,at:now.toISOString(),source:s.kind==='review_due'?'review_due':'new_word',mode:s.mode,input:s.input||s.selected}
  const ok=profile.transact(d=>{
   if(!d.session || d.session.answers[d.session.index])return
   d.session.answers.push(answer)
   if(s.kind!=='practice'){
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
    if(s.kind==='new_word'||s.kind==='practice'){
     d.lastLessonAccuracy=s.answers.filter(a=>a.correct).length/s.answers.length
     if(canUnlockNextUnit(s.answers)&&s.wordIds.every(id=>lesson.value.wordIds.includes(id))&&lesson.value.wordIds.every(id=>d.cards[id]))d.lessonIndex=Math.min(d.lessonIndex+1,lessons.length-1)
    }
   }
  })
 }
 function previous(){if(!session.value || session.value.index===0)return false;return patch({index:session.value.index-1,input:session.value.answers[session.value.index-1]?.input??'',revealed:true})}
 const learnedCount=computed(()=>Object.keys(profile.db.cards).length)
 const remainingCount=computed(()=>words.length-learnedCount.value)
 return {session,current,choices,todayAnswers,newToday,newWords,lesson,needsConsolidation,learnedCount,remainingCount,start,patch,setMode,reveal,hint,submit,next,previous}
})
