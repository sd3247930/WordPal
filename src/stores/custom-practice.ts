import {computed,ref,watch} from 'vue'
import {defineStore} from 'pinia'
import type {LearningMode,ReviewRating} from '../../packages/core_learning'
import type {CustomPracticeScope} from '../../packages/core_learning/custom-practice'
import {useProfileStore,type Database} from './profile'
import {useCourseStore} from './course'
import {useFeedbackStore} from './feedback'
import {courseRegistry,isCourseInstalled,resolveFrozenWord} from '../services/content/ContentRegistry'
import {stopAudio} from '../services/audio'
import {warmUpcomingAudio} from '../services/audio/AudioPreload'
import {orderedCourseUnits} from '../services/learning/CourseStudySequence'
import {customPracticeBatch,recordCustomSequence} from '../services/learning/CustomPracticeSequence'
import {CUSTOM_MODES,wholeBook,practiceCountError,defaultPracticeCount,customModeProblems,createCustomPractice,customResumeProblem,customToken,runCustom,pauseCustom,endCustom,recordCustomAnswer,advanceCustom,customProgress,customChoices,customMatchGroup} from '../services/learning/CustomPractice'

export const useCustomPracticeStore=defineStore('custom-practice',()=>{
 const profile=useProfileStore(),courses=useCourseStore(),feedback=useFeedbackStore()
 // A persisted running checkpoint belongs to a previous process; its offline interval is not practice time.
 let recoveredRunningId=profile.db.customPractice?.status==='running'?profile.db.customPractice.id:''
 const screen=ref<'closed'|'config'|'overview'|'training'|'paused'|'summary'>('closed'),error=ref(''),notice=ref(''),heardToken=ref(''),confirmation=ref<'end'|'replace'|''>('')
 const courseId=ref(''),scope=ref<CustomPracticeScope>(wholeBook()),count=ref(''),modeSelection=ref<LearningMode[]>(['flash'])
 let lastPartialSelection:LearningMode[]=['flash']
 const installed=computed(()=>courses.installed.filter(pack=>isCourseInstalled(pack.courseId)))
 const pack=computed(()=>courseRegistry[courseId.value]),batch=computed(()=>customPracticeBatch(profile.db,courseId.value,scope.value)),total=computed(()=>batch.value.remaining)
 const rangeTotal=computed(()=>batch.value.total),sequenceHint=computed(()=>batch.value.restarted?'已练完本范围，将从第 1 词开始新一轮':batch.value.offset?`本次从第 ${batch.value.offset+1} 词开始 · 剩余 ${total.value} 词`:'')
 const units=computed(()=>pack.value?orderedCourseUnits(pack.value):[])
 const countError=computed(()=>practiceCountError(count.value,total.value))
 const candidateIds=computed(()=>countError.value?[]:batch.value.wordIds.slice(0,Number(count.value)))
 const problems=computed(()=>customModeProblems(courseId.value,candidateIds.value,feedback.settings.sound))
 const selectedModes=computed(()=>CUSTOM_MODES.filter(mode=>modeSelection.value.includes(mode)))
 const continuous=computed({get:()=>selectedModes.value.length===CUSTOM_MODES.length,set:(enabled:boolean)=>{if(enabled){if(!continuous.value)lastPartialSelection=[...selectedModes.value];modeSelection.value=[...CUSTOM_MODES]}else modeSelection.value=[...lastPartialSelection]}})
 // Legacy single-mode callers share the selection array instead of a parallel draft.
 const singleMode=computed({get:()=>selectedModes.value.length===1?selectedModes.value[0]:undefined,set:(mode:LearningMode|undefined)=>{modeSelection.value=mode?[mode]:[];lastPartialSelection=[...modeSelection.value]}})
 function toggleMode(mode:LearningMode){if(!CUSTOM_MODES.includes(mode)||!modeSelection.value.includes(mode)&&problems.value[mode])return;modeSelection.value=modeSelection.value.includes(mode)?modeSelection.value.filter(item=>item!==mode):[...modeSelection.value,mode];if(modeSelection.value.length<CUSTOM_MODES.length)lastPartialSelection=[...modeSelection.value]}
 const startProblem=computed(()=>countError.value||(!selectedModes.value.length?'请选择至少一种练习方式。':selectedModes.value.map(mode=>problems.value[mode]).find(Boolean)||'')||(profile.readOnly?'学习档案暂时只读，无法保存自定义练习。':''))
 const session=computed(()=>profile.db.customPractice||null),recoverable=computed(()=>!!session.value&&['running','paused'].includes(session.value.status))
 const resumeProblem=computed(()=>customResumeProblem(session.value))
 const mode=computed(()=>session.value?.modes[session.value.modeIndex]||'flash')
 const current=computed(()=>session.value?resolveFrozenWord(session.value.wordSnapshot[session.value.wordIds[session.value.index]],session.value.courseId,session.value.contentVersion):undefined)
 const progress=computed(()=>session.value?customProgress(session.value):null)
 const choices=computed(()=>session.value?customChoices(session.value):[]),matchGroup=computed(()=>session.value?customMatchGroup(session.value):null)
 const token=computed(()=>session.value?customToken(session.value):'')
 function save(change:(db:Database)=>boolean){let changed=false;const ok=profile.transact(db=>{changed=change(db)});if(!ok)error.value='练习进度尚未保存，请释放设备存储后重试。';else if(changed)error.value='';return ok&&changed}
 function stop(){heardToken.value='';stopAudio();warmUpcomingAudio([])}
 function pause(){stop();if(session.value?.status!=='running')return true;const ok=save(db=>{const s=db.customPractice!;if(s.id===recoveredRunningId)delete s.activeSince;return pauseCustom(s)});if(ok){recoveredRunningId='';if(screen.value==='training')screen.value='paused'}return ok}
 function openConfig(){
  if(!pause())return false
  const completed=session.value?.status==='completed'&&!resumeProblem.value?session.value:null
  courseId.value=completed?.courseId||(installed.value.some(pack=>pack.courseId===courses.currentId)?courses.currentId:installed.value[0]?.courseId||'')
  scope.value=completed?JSON.parse(JSON.stringify(completed.scope)):wholeBook();count.value=String(defaultPracticeCount(profile.db,total.value));restoreModes();notice.value='';error.value='';screen.value='config';return true
 }
 function restoreModes(){
  const saved=session.value
  const modes=saved?.courseId===courseId.value&&!customResumeProblem(saved)?saved.modes.filter(mode=>!problems.value[mode]):[]
  modeSelection.value=modes.length?[...modes]:['flash'];lastPartialSelection=modeSelection.value.length<5?[...modeSelection.value]:['flash']
 }
 function clamp(){if(!countError.value)return;const value=Number(count.value);if(Number.isSafeInteger(value)&&value>total.value){count.value=String(total.value);notice.value=`范围已变化，本次调整为 ${total.value} 词。`}}
 function chooseCourse(id:string){if(!isCourseInstalled(id))return;courseId.value=id;scope.value=wholeBook();if(!Number.isSafeInteger(Number(count.value))||Number(count.value)<1)count.value=String(defaultPracticeCount(profile.db,total.value));clamp();restoreModes();error.value=''}
 function chooseScope(type:CustomPracticeScope['type']){scope.value=type==='whole-book'?wholeBook():{type:'units',unitIds:units.value.slice(0,1).map(unit=>unit.id)};clamp()}
 function toggleUnit(id:string){const selected=scope.value.unitIds;scope.value={type:'units',unitIds:selected.includes(id)?selected.filter(item=>item!==id):[...selected,id]};clamp()}
 function step(amount:number){const value=Number(count.value);count.value=String(Math.min(total.value,Math.max(1,(Number.isSafeInteger(value)?value:1)+amount)));notice.value=''}
 function start(replace=false):'started'|'confirm'|'failed'{
  if(screen.value!=='config')return 'failed'
  if(startProblem.value){error.value=startProblem.value;return 'failed'}
  if(recoverable.value&&!replace)return 'confirm'
  try{
   const next=createCustomPractice({courseId:courseId.value,scope:scope.value,count:count.value,modes:selectedModes.value,sound:feedback.settings.sound,offset:batch.value.offset})
   const multiple=selectedModes.value.length>1
   if(!multiple)runCustom(next)
   if(!save(db=>{recordCustomSequence(db,db.customPractice);db.customPractice=next;return true}))return 'failed'
   recoveredRunningId='';stop();screen.value=multiple?'overview':'training';return 'started'
  }catch(problem){error.value=(problem as Error).message;return 'failed'}
 }
 function showPaused(){stop();screen.value='paused';error.value=''}
 function resume(){
  if(screen.value==='training'&&session.value?.status==='running')return true
  if(resumeProblem.value){error.value=resumeProblem.value;return false}
  const s=session.value!,availability=customModeProblems(s.courseId,s.wordIds,feedback.settings.sound),unavailable=s.modes.slice(s.modeIndex).map(mode=>availability[mode]).find(Boolean)
  if(unavailable){error.value=unavailable;return false}
  if(!save(db=>runCustom(db.customPractice!)))return false
  recoveredRunningId='';stop();screen.value='training';return true
 }
 function patch(values:Partial<Pick<NonNullable<typeof session.value>,'input'|'selected'|'revealed'|'letterDraft'|'inputAssistance'>>){
  if(!session.value||session.value.status!=='running'||session.value.answer||resumeProblem.value)return false
  const expected=token.value;return save(db=>{const s=db.customPractice;if(!s||customToken(s)!==expected||s.status!=='running'||s.answer)return false;Object.assign(s,values);s.updatedAt=new Date().toISOString();return true})
 }
 function submit(rating?:ReviewRating){
  if(resumeProblem.value){error.value=resumeProblem.value;return false}
  if(['listen','dictation'].includes(mode.value)&&heardToken.value!==token.value){error.value='请先播放当前单词的发音，再确认答案。';return false}
  const expected=token.value;return save(db=>recordCustomAnswer(db,expected,rating,heardToken.value===expected))
 }
 function next(){
  if(resumeProblem.value){error.value=resumeProblem.value;return false}
  const expected=token.value
  const ok=save(db=>{const s=db.customPractice;if(!s||!advanceCustom(s,expected))return false;if(s.status==='completed')recordCustomSequence(db,s);return true})
  if(ok){stop();if(session.value?.status==='completed')screen.value='summary'}return ok
 }
 function end(){stop();if(!session.value||!['running','paused'].includes(session.value.status))return false;const ok=save(db=>{const s=db.customPractice!;if(s.id===recoveredRunningId)delete s.activeSince;return endCustom(s)});if(ok){recoveredRunningId='';screen.value='closed';notice.value='已结束本次自定义练习。'}return ok}
 function back(){if(confirmation.value){confirmation.value='';return true}if(screen.value==='closed')return false;if(screen.value==='training'){if(pause())screen.value='paused'}else{if(pause())screen.value='closed'}return true}
 function leave(){if(screen.value==='closed')return true;if(!pause())return false;confirmation.value='';screen.value='closed';return true}
 watch(()=>session.value,session=>{if(!session&&!['closed','config'].includes(screen.value)){stop();screen.value='closed';confirmation.value='';notice.value='原教材已移除，自定义练习已停止。'}})
 return {screen,isOpen:computed(()=>screen.value!=='closed'),error,notice,confirmation,courseId,scope,count,singleMode,continuous,installed,pack,units,total,rangeTotal,sequenceHint,countError,problems,selectedModes,startProblem,session,recoverable,resumeProblem,mode,current,progress,choices,matchGroup,token,heardToken,openConfig,chooseCourse,chooseScope,toggleUnit,toggleMode,step,start,showPaused,resume,patch,submit,next,pause,end,back,leave}
})
