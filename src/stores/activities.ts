import {defineStore} from 'pinia'
import {ref,computed,watch} from 'vue'
import {useProfileStore} from './profile'
import {useCourseStore} from './course'
import {useReviewStore} from './review'
import {getCourseLessons,getCourseWord,getCourseWordIds,resolveFrozenWord} from '../services/content/ContentRegistry'
import {readStorage,writeStorage} from '../services/storage'
import {initialProgress} from '../services/storage/MigrationV1toV2'
import {isCorrectSpelling,normalizeSpelling} from '../../packages/phonics'
import {spellingInputReady,type LetterBlockDraft,type SpellingInputChange} from '../../packages/phonics/letter-blocks'
import type {Word} from '../../packages/core_learning'
export type ActivityKind='check'|'pair'|'letters'|'sentence'|'cloze'|'story'|'picture'|'listen-picture'|'phonics'|'challenge'|'speed'
export interface ActivityState {id:string;courseId:string;contentVersion:string;lessonId:string;kind:ActivityKind;wordIds:string[];words:Record<string,Word>;index:number;input:string;selected:string;answers:{wordId:string;correct:boolean}[];completed:boolean;recorded:boolean;storyId?:string;storySnapshot?:{title:string;sentences:string[];questions?:{question:string;options:string[];answer:number}[]};revealed:boolean;hinted:boolean;timer?:{remainingMs:number;runningSince:number|null};letterDraft?:LetterBlockDraft;inputAssistance?:'tiles';retrying?:boolean;retryAnswer?:{wordId:string;correct:boolean}|null;retryAttempts?:{wordId:string;correct:boolean;input:string}[]}
import {ACTIVITY_KEY as key,hasCourseMemory} from '../services/learning/CourseProgressMemory'
export const useActivitiesStore=defineStore('activities',()=>{
 const profile=useProfileStore(),course=useCourseStore(),review=useReviewStore(),error=ref('')
 const valid=(raw:any):raw is ActivityState=>{if(!raw||!hasCourseMemory(raw.courseId))return false;const allowed=new Set(getCourseWordIds(raw.courseId));return Array.isArray(raw.wordIds)&&raw.wordIds.every((id:string)=>allowed.has(id)&&raw.words?.[id])&&Object.keys(raw.words||{}).every(id=>allowed.has(id))&&Number.isInteger(raw.index)&&raw.index>=0&&Array.isArray(raw.answers)}
 function remembered(pause=false){
  const raw=readStorage<(Partial<ActivityState>&{courseStates?:Record<string,ActivityState>})|null>(key,null)
  const states=Object.fromEntries(Object.entries(raw?.courseStates||{}).filter(([id,value])=>hasCourseMemory(id)&&valid(value)&&value.courseId===id))
  if(valid(raw)&&hasCourseMemory(raw.courseId)){const {courseStates,...active}=raw as ActivityState&{courseStates?:Record<string,ActivityState>};states[raw.courseId]=active}
  // Background time is free: a restored timed round waits for an explicit resume.
  if(pause)for(const state of Object.values(states))if(state.timer)state.timer={remainingMs:Math.max(0,Math.min(15000,Number(state.timer.remainingMs)||0)),runningSince:null}
  return states
 }
 const savedStates=ref<Record<string,ActivityState>>(remembered(true))
 const state=computed(()=>savedStates.value[course.currentId]||null)
 function patch(next:ActivityState|null){
  const courseStates={...savedStates.value};for(const id of Object.keys(courseStates))if(!hasCourseMemory(id))delete courseStates[id]
  if(next)courseStates[next.courseId]=next;else delete courseStates[course.currentId]
  try{writeStorage(key,next?{...next,courseStates}:Object.keys(courseStates).length?{courseStates}:null);savedStates.value=courseStates;error.value='';return true}catch{error.value='练习进度无法保存，请释放设备空间后重试。';return false}
 }
 watch(()=>profile.courseMemoryRevision,()=>{savedStates.value=remembered(true)})
 const current=computed(()=>resolveFrozenWord(state.value?.words[state.value.wordIds[state.value.kind==='story'?0:state.value.index]],state.value?.courseId,state.value?.contentVersion))
 const total=computed(()=>state.value?.kind==='story'?Math.max(1,state.value.storySnapshot?.questions?.length||0):state.value?.wordIds.length||0)
 const choices=computed(()=>{if(!current.value||!state.value)return [];const used=new Set<string>(),pool=[current.value,...Object.values(state.value.words).map(w=>resolveFrozenWord(w,state.value!.courseId,state.value!.contentVersion)!).filter(w=>w.id!==current.value!.id&&w.meaning!==current.value!.meaning)];return pool.filter(w=>{if(used.has(w.meaning))return false;used.add(w.meaning);return true}).slice(0,4).sort((a,b)=>a.id.localeCompare(b.id))})
 function start(kind:ActivityKind){
  const lesson=course.lesson,pack=course.current
  if(!lesson)return false
  if(kind==='check'){review.refresh();const allowed=new Set(course.wordIds);if(review.due.some(card=>allowed.has(card.wordId))||lesson.wordIds.some(id=>!profile.db.cards[id])){error.value='先完成到期复习与本课未学词，再进行整课检查。';return false}}
  const pool=course.wordIds.flatMap(id=>{const word=getCourseWord(course.currentId,id);return word?[word]:[]})
  if(kind==='listen-picture'&&pool.filter(w=>!!w.image).length<2){error.value='本课没有足够的不同词图，可选择文字练习。';return false}
  if(['check','pair','challenge','speed'].includes(kind)&&pool.filter((w,i)=>pool.findIndex(other=>other.meaning===w.meaning)===i).length<2){error.value='词表不足以形成客观选择题，可先浏览或拼装单词。';return false}
  const eligible=lesson.wordIds.filter(id=>{const w=getCourseWord(course.currentId,id);if(!w)return false;const example=lesson.examples?.[id]||w.example;return kind==='cloze'?example.toLowerCase().split(/[^a-z'-]+/).includes(w.word.toLowerCase()):kind==='sentence'?!!example:kind==='picture'||kind==='listen-picture'?!!w.image&&(kind!=='listen-picture'||!!w.audio):kind==='phonics'?!!w.phonics.length&&w.phonics.length===w.phonemes.length&&!!w.audio:true})
  if(!eligible.length){error.value='本课缺少该活动所需资源，请选择文字练习。';return false}
  const story=pack.stories?.find(s=>s.id===lesson.storyId)
  if(kind==='story'&&!story){error.value='本课暂无已审核故事，请选择其他练习。';return false}
  const targets=kind==='check'?[...new Set(lesson.wordIds)]:eligible,needed=new Set([...targets,...(story?.targetWordIds||[])])
  // Freeze target words and a bounded distractor pool instead of copying a whole course.
  const frozen=[...pool.filter(w=>needed.has(w.id)),...pool.filter(w=>!needed.has(w.id)&&(kind!=='listen-picture'||!!w.image)).slice(0,4)].map(w=>({...w,example:lesson.examples?.[w.id]||w.example}))
  const next:ActivityState={id:'activity-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),courseId:pack.courseId,contentVersion:pack.contentVersion,lessonId:lesson.id,kind,wordIds:targets,words:JSON.parse(JSON.stringify(Object.fromEntries(frozen.map(w=>[w.id,w])))),index:0,input:'',selected:'',answers:[],completed:false,recorded:false,storyId:story?.id,storySnapshot:story?{title:story.title,sentences:story.sentences,questions:story.questions}:undefined,revealed:false,hinted:false,...(kind==='speed'?{timer:{remainingMs:15000,runningSince:null}}:{})}
  return patch(next)
 }
 function input(value:string){if(state.value&&!state.value.completed)patch({...state.value,input:value})}
 function blockInput(value:SpellingInputChange){const s=state.value;if(s&&!s.completed&&(!s.answers[s.index]||s.retrying&&!s.retryAnswer))return patch({...s,...value});return false}
 function retry(){const s=state.value;if(!s||s.kind!=='letters'||!s.answers[s.index]||s.completed)return false;return patch({...s,retrying:true,retryAnswer:null,input:'',letterDraft:undefined,revealed:false})}
 function select(value:string){if(state.value&&!state.value.completed)patch({...state.value,selected:value})}
 function hint(){if(state.value)patch({...state.value,hinted:true,revealed:true})}
 const remainingMs=(now=Date.now())=>{const t=state.value?.timer;return t?Math.max(0,t.remainingMs-(t.runningSince===null?0:Math.max(0,now-t.runningSince))):0}
 function pauseTimer(now=Date.now()){const s=state.value;if(!s?.timer||s.timer.runningSince===null)return false;return patch({...s,timer:{remainingMs:remainingMs(now),runningSince:null}})}
 function resumeTimer(now=Date.now()){const s=state.value;if(!s?.timer||s.completed||s.answers[s.index]||s.timer.runningSince!==null)return false;if(s.timer.remainingMs===0)return expireTimer(now);return patch({...s,timer:{...s.timer,runningSince:now}})}
 function expireTimer(now=Date.now()){const s=state.value,w=current.value;if(!s?.timer||!w||s.completed||s.answers[s.index]||remainingMs(now)>0)return false;return patch({...s,timer:{remainingMs:0,runningSince:null},answers:[...s.answers,{wordId:w.id,correct:false}],revealed:true})}
 function submit(){
  const s=state.value,w=current.value;if(!s||!w||s.completed||s.answers[s.index]&&!(s.kind==='letters'&&s.retrying&&!s.retryAnswer))return false
  if(s.kind==='letters'&&!spellingInputReady(s.input,w,s.letterDraft))return false
  let correct=false
  if(s.kind==='speed'){if(!s.timer||s.timer.runningSince===null)return false;if(remainingMs()===0)return expireTimer()}
  if(['check','pair','picture','listen-picture','challenge','speed'].includes(s.kind)){if(!s.selected)return false;correct=s.selected===w.id}
  else if(s.kind==='story'){const q=s.storySnapshot?.questions?.[s.index];if(q&&!s.selected)return false;correct=q?+s.selected===q.answer:true}
  else if(s.kind==='phonics')correct=true
  else{if(!s.input.trim())return false;correct=s.kind==='sentence'?normalizeSpelling(s.input).replace(/[.!?]$/,'')===normalizeSpelling(w.example).replace(/[.!?]$/,''):isCorrectSpelling(s.input,w)}
  if(s.kind==='letters'&&s.retrying)return patch({...s,retryAnswer:{wordId:w.id,correct},retryAttempts:[...(s.retryAttempts||[]),{wordId:w.id,correct,input:s.input}],revealed:true})
  return patch({...s,answers:[...s.answers,{wordId:w.id,correct}],revealed:true,...(s.timer?{timer:{remainingMs:remainingMs(),runningSince:null}}:{})})
 }
 function next(){const s=state.value;if(!s||!s.answers[s.index]||s.completed||s.retrying&&!s.retryAnswer)return false;if(s.index+1===total.value){if(!patch({...s,completed:true}))return false;return record()}return patch({...s,index:s.index+1,input:'',selected:'',revealed:false,letterDraft:undefined,retrying:false,retryAnswer:null,...(s.timer?{timer:{remainingMs:15000,runningSince:null}}:{})})}
 function record(){const s=state.value;if(!s?.completed||s.recorded)return false;const correct=s.answers.filter(a=>a.correct).length,total=s.kind==='story'?s.answers.length:s.wordIds.length
  const ok=profile.transact(d=>{
   d.auxiliaryRecords??=[];if(d.auxiliaryRecords.some(a=>a.id===s.id))return
   d.auxiliaryRecords.push({id:s.id,courseId:s.courseId,lessonId:s.lessonId,kind:s.kind,at:new Date().toISOString(),correct,total,wordIds:[...new Set(s.wordIds)],objective:['check','pair','letters','sentence','cloze','picture','listen-picture'].includes(s.kind),hinted:s.hinted||s.inputAssistance==='tiles'})
   if(s.kind==='check'&&s.answers.length===s.wordIds.length){d.courseProgress??={};const p=d.courseProgress[s.courseId]??=initialProgress(s.courseId);p.checkAttempts[s.lessonId]=(p.checkAttempts[s.lessonId]||0)+1;p.checkAccuracy[s.lessonId]=correct/total;if(correct/total>=.8){if(!p.completedLessons.includes(s.lessonId))p.completedLessons.push(s.lessonId);const lessons=getCourseLessons(s.courseId),index=lessons.findIndex(l=>l.id===s.lessonId);p.currentLessonId=lessons[Math.min(index+1,lessons.length-1)].id}}
  });if(!ok){error.value=profile.storageError;return false}return patch({...s,recorded:true})
 }
 function close(){return patch(null)}
 function reset(){try{writeStorage(key,null);savedStates.value={};error.value='';return true}catch{error.value='练习进度无法保存，请释放设备空间后重试。';return false}}
 const recommendation=computed(()=>{const records=(profile.db.auxiliaryRecords||[]).filter(r=>r.objective&&!r.hinted&&new Date(r.at).getTime()>Date.now()-14*86400000);const total=records.reduce((n,r)=>n+r.total,0),correct=records.reduce((n,r)=>n+r.correct,0),unique=new Set(records.flatMap(r=>r.wordIds||[]));return records.length>=3&&unique.size>=20&&correct/total>=.85?'最近练习越来越熟悉，可请家长考虑下一能力级别。':''})
 return {state,current,total,choices,error,start,input,blockInput,retry,select,hint,submit,next,record,close,reset,recommendation,remainingMs,pauseTimer,resumeTimer,expireTimer}
})
