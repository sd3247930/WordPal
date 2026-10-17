import {defineStore} from 'pinia'
import {ref,computed,watch} from 'vue'
import {readStorage,writeStorage} from '../services/storage'
import {useLearningStore} from './learning'
import {useProfileStore} from './profile'
import {usePetStore} from './pet'
import {automaticMode,revisitWords} from '../services/study-presentation'
import {wordById} from '../../packages/content_schema'
import {isCorrectSpelling} from '../../packages/phonics'
import type {LearningMode,ReviewRating} from '../../packages/core_learning'
import {availableModes} from '../../packages/content_schema/course'
import {readFeedbackSettings} from './feedback'
import {resolveFrozenWord} from '../services/content/ContentRegistry'
interface RevisitAnswer {wordId:string;correct:boolean}
interface Presentation {sessionId:string;manual:boolean;revisitStarted:boolean;queue:string[];index:number;input:string;selected:string;revealed:boolean;answer:RevisitAnswer|null;answers:RevisitAnswer[];finished:boolean;petId:string;startExp:number;rewardTracked:boolean}
import {PRESENTATION_KEY as key,hasCourseMemory} from '../services/learning/CourseProgressMemory'
const blank=():Presentation=>({sessionId:'',manual:false,revisitStarted:false,queue:[],index:0,input:'',selected:'',revealed:false,answer:null,answers:[],finished:false,petId:'water',startExp:0,rewardTracked:false})
export const useStudyPresentation=defineStore('study-presentation',()=>{
 const learning=useLearningStore(),profile=useProfileStore(),pet=usePetStore(),error=ref('')
 const valid=(raw:any):raw is Presentation=>!!raw&&typeof raw==='object'&&['manual','revisitStarted','revealed','finished','rewardTracked'].every(field=>typeof raw[field as keyof Presentation]==='boolean')&&Number.isFinite(raw.startExp)&&Array.isArray(raw.queue)&&raw.queue.every((id:string)=>typeof id==='string'&&wordById[id])&&Array.isArray(raw.answers)&&raw.answers.every((a:RevisitAnswer)=>a&&typeof a.correct==='boolean'&&!!wordById[a.wordId])&&typeof raw.sessionId==='string'&&Number.isInteger(raw.index)&&raw.index!>=0&&raw.index!<=raw.queue.length&&typeof raw.input==='string'&&typeof raw.selected==='string'&&(!raw.answer||typeof raw.answer.correct==='boolean'&&!!wordById[raw.answer.wordId])&&(!raw.revisitStarted||raw.finished||raw.index!<raw.queue.length)
 function remembered(){
  const stored=readStorage<(Partial<Presentation>&{courseStates?:Record<string,Presentation>})|null>(key,null)
  const owners=new Map(Object.entries(profile.db.courseSessions||{}).map(([id,session])=>[session.id,id]))
  if(learning.session)owners.set(learning.session.id,learning.session.courseId||profile.db.currentCourseId||'starter')
  const states=Object.fromEntries(Object.entries(stored?.courseStates||{}).filter(([id,value])=>hasCourseMemory(id)&&valid(value)&&owners.get(value.sessionId)===id))
  if(valid(stored)){const id=owners.get(stored.sessionId);if(id&&hasCourseMemory(id)){const {courseStates,...active}=stored as Presentation&{courseStates?:Record<string,Presentation>};states[id]=active}}
  return states
 }
 const initial=readStorage<Partial<Presentation>|null>(key,null)
 const state=ref<Presentation>(valid(initial)?Object.fromEntries(Object.entries(initial).filter(([field])=>field!=='courseStates')) as unknown as Presentation:blank())
 function patch(values:Partial<Presentation>){
  const next={...state.value,...values},courseStates=remembered(),id=learning.session?.courseId||profile.db.currentCourseId||'starter'
  if(next.sessionId&&hasCourseMemory(id))courseStates[id]=next
  try{writeStorage(key,{...next,courseStates});state.value=next;error.value='';return true}catch{error.value='界面进度暂时无法保存，请释放设备空间后重试。';return false}
 }
 function sync(){
  const session=learning.session
  if(!session){state.value=blank();return}
  if(state.value.sessionId!==session.id){
   const saved=remembered()[session.courseId||profile.db.currentCourseId||'starter']
   if(saved?.sessionId===session.id)state.value={...saved}
   else{
   const untouched=session.index===0&&!session.answers.length&&!session.input&&!session.selected&&session.mode==='flash'
   if(!patch({...blank(),sessionId:session.id,manual:!untouched,petId:pet.current.element,startExp:pet.all.reduce((sum,item)=>sum+item.exp,0),rewardTracked:untouched}))return
   }
  }
  if(session.completedAt){
   if(!state.value.revisitStarted)patch({revisitStarted:true,queue:revisitWords(session.answers),finished:revisitWords(session.answers).length===0})
  }else if(!state.value.manual&&!session.answers[session.index]&&!session.input&&!session.selected&&!session.revealed){
   const allowed=learning.current?availableModes(learning.current,Object.values(session.wordSnapshot||wordById),readFeedbackSettings().sound,session.plannerConfig?.entryLevel):['flash']
   const desired=automaticMode(session.index,session.kind,session.plannerConfig?.entryLevel),mode=allowed.includes(desired)?desired:'flash'
   if(mode!==session.mode)learning.setMode(mode)
  }
 }
 const revisiting=computed(()=>!!learning.session?.completedAt&&state.value.sessionId===learning.session.id&&state.value.revisitStarted&&!state.value.finished)
 const current=computed(()=>revisiting.value?resolveFrozenWord(wordById[state.value.queue[state.value.index]],learning.session?.courseId,learning.session?.contentVersion):learning.current)
 const mode=computed<LearningMode>(()=>revisiting.value?'spell':learning.session?.mode||'flash')
 const input=computed(()=>revisiting.value?state.value.input:learning.session?.input||'')
 const selected=computed(()=>revisiting.value?state.value.selected:learning.session?.selected||'')
 const revealed=computed(()=>revisiting.value?state.value.revealed:learning.session?.revealed||false)
 const answer=computed(()=>revisiting.value?state.value.answer:learning.session?.answers[learning.session.index])
 const index=computed(()=>revisiting.value?state.value.index:learning.session?.index||0)
 const total=computed(()=>revisiting.value?state.value.queue.length:learning.session?.wordIds.length||0)
 const completed=computed(()=>!!learning.session?.completedAt&&!revisiting.value&&state.value.finished)
 const earnedExp=computed(()=>state.value.rewardTracked?Math.max(0,pet.all.reduce((sum,item)=>sum+item.exp,0)-state.value.startExp):null)
 function chooseMode(value:LearningMode){if(!revisiting.value&&!answer.value&&learning.current&&availableModes(learning.current,Object.values(learning.session?.wordSnapshot||wordById),readFeedbackSettings().sound,learning.session?.plannerConfig?.entryLevel).includes(value)&&patch({manual:true}))learning.setMode(value)}
 function automatic(){if(!revisiting.value&&!answer.value&&patch({manual:false})){learning.patch({input:'',selected:'',revealed:false});sync()}}
 function updateInput(value:string){if(answer.value)return;if(revisiting.value)patch({input:value});else learning.patch({input:value})}
 function select(value:string){if(!answer.value&&!revisiting.value)learning.patch({selected:value})}
 function reveal(){if(revisiting.value)patch({revealed:true});else learning.reveal()}
 function hint(){if(revisiting.value)patch({revealed:true});else learning.hint()}
 function submit(rating?:ReviewRating){
  if(answer.value)return false
  if(!revisiting.value)return learning.submit(rating)
  if(!current.value||!input.value.trim())return false
  const response={wordId:current.value.id,correct:isCorrectSpelling(input.value,current.value)}
  return patch({answer:response,revealed:true,answers:[...state.value.answers,response]})
 }
 function next(){
  if(!answer.value)return
  if(revisiting.value){if(index.value+1>=total.value)patch({finished:true});else patch({index:index.value+1,input:'',revealed:false,answer:null})}
  else {learning.next();sync()}
 }
 function reset(){try{writeStorage(key,blank());state.value=blank();error.value='';return true}catch{error.value='界面进度暂时无法保存，请释放设备空间后重试。';return false}}
 watch(()=>profile.courseMemoryRevision,()=>{state.value=blank();sync()})
 return {state,error,sync,revisiting,current,mode,input,selected,revealed,answer,index,total,completed,earnedExp,chooseMode,automatic,updateInput,select,reveal,hint,submit,next,reset}
})
