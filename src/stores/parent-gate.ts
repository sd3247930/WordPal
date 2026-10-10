import {computed,reactive,shallowRef} from 'vue'
import {defineStore} from 'pinia'
import {createParentMathQuestion,normalizeParentAnswer,parentQuestionKey,type ParentGateState} from '../services/parent/ParentMathQuestion'
const LAST_QUESTION_KEY='wordpal.parent-gate.last-question.v1'
export const useParentGateStore=defineStore('parent-gate',()=>{
 const state=reactive<ParentGateState>({question:null,input:'',status:'idle',attemptCount:0,unlocked:false})
 const owner=shallowRef<object|null>(null);let previousKey=''
 try{const stored=uni.getStorageSync(LAST_QUESTION_KEY);if(typeof stored==='string'&&/^[1-9]x[1-9]$/.test(stored))previousKey=stored}catch{/* A read failure never grants access. */}
 const active=computed(()=>owner.value!==null),unlocked=computed(()=>active.value&&state.unlocked)
 function nextQuestion(){
  state.question=createParentMathQuestion(previousKey);previousKey=parentQuestionKey(state.question.left,state.question.right)
  // This single comparison key is the only persisted gate value.
  try{uni.setStorageSync(LAST_QUESTION_KEY,previousKey)}catch{/* In-memory no-repeat still applies. */}
  state.input='';state.status='idle';state.attemptCount=0;state.unlocked=false
 }
 function isCurrentVisit(visit:object){return owner.value===visit}
 function beginVisit(visit:object){owner.value=visit;nextQuestion()}
 function resumeVisit(visit:object){if(!isCurrentVisit(visit))beginVisit(visit)}
 function leaveVisit(visit?:object){if(visit&&!isCurrentVisit(visit))return;owner.value=null;state.question=null;state.input='';state.status='idle';state.attemptCount=0;state.unlocked=false}
 function setInput(value:unknown){state.input=normalizeParentAnswer(value);if(state.status==='incorrect')state.status='idle';return state.input}
 async function verify(){
  if(!owner.value||!state.question||!state.input||state.status==='checking'||state.unlocked)return 'ignored' as const
  const visit=owner.value,question=state.question,input=state.input;state.status='checking'
  await Promise.resolve()
  if(!isCurrentVisit(visit)||state.question?.id!==question.id)return 'ignored' as const
  if(Number(input)===question.answer){state.unlocked=true;state.status='correct';return 'correct' as const}
  state.unlocked=false;state.status='incorrect';state.attemptCount++
  if(state.attemptCount>=3){nextQuestion();return 'replaced' as const}
  return 'incorrect' as const
 }
 function canAccess(){
  if(!unlocked.value)return false
  if(typeof getCurrentPages!=='function')return false
  const pages=getCurrentPages();return pages[pages.length-1]?.route==='pages/parent/index'
 }
 return {state,active,unlocked,isCurrentVisit,beginVisit,resumeVisit,leaveVisit,setInput,verify,canAccess}
})
