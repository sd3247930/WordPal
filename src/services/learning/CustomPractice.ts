import {spellingInputReady} from '../../../packages/phonics/letter-blocks'
import type {Answer,LearningMode,ReviewRating,Word} from '../../../packages/core_learning'
import type {CustomPracticeScope,CustomPracticeSession} from '../../../packages/core_learning/custom-practice'
import type {CoursePack} from '../../../packages/content_schema/course'
import type {Database} from '../../stores/profile'
import {availableModes} from '../../../packages/content_schema/course'
import {isCorrectSpelling} from '../../../packages/phonics'
import {readParentSettings} from '../../../packages/parent_settings'
import {courseRegistry,isCourseInstalled,getCourseWord,resolveFrozenWord} from '../content/ContentRegistry'
import {orderedCourseWords,orderedCourseUnits} from './CourseStudySequence'
import {sha256} from '../content/digest'

export const CUSTOM_MODES:readonly LearningMode[]=['flash','connect','listen','spell','dictation']
export const CUSTOM_MODE_NAMES:Record<LearningMode,string>={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'}
export function validCustomModes(value:unknown):value is LearningMode[]{return Array.isArray(value)&&value.length>0&&value.length<=CUSTOM_MODES.length&&value.every((mode,index)=>CUSTOM_MODES.includes(mode)&&(!index||CUSTOM_MODES.indexOf(mode)>CUSTOM_MODES.indexOf(value[index-1])))}
export const wholeBook=():CustomPracticeScope=>({type:'whole-book',unitIds:[]})
let sessionCounter=0
export const customFingerprint=(pack:CoursePack)=>sha256(JSON.stringify([pack.contentVersion,pack.units,pack.vocabulary,pack.assets]))
export function practiceWordIds(courseId:string,scope:CustomPracticeScope){
 const pack=courseRegistry[courseId]
 if(!pack||!isCourseInstalled(courseId))return []
 const ordered=orderedCourseWords(pack).filter(id=>!!getCourseWord(courseId,id))
 if(scope.type==='whole-book')return ordered
 const units=pack.units.filter(unit=>scope.unitIds.includes(unit.id))
 if(!units.length||units.length!==new Set(scope.unitIds).size)return []
 const allowed=new Set(units.flatMap(unit=>unit.lessons.flatMap(lesson=>lesson.wordIds)))
 return ordered.filter(id=>allowed.has(id))
}
export function practiceCountError(value:string|number,total:number){
 if(!total)return '所选范围没有可练习的词条，请更换教材或单元。'
 if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value)))return '请输入完整的整数词数。'
 if(Number(value)<1||Number(value)>total)return `请输入 1～${total} 之间的整数。`
 return ''
}
export function defaultPracticeCount(db:Database,total:number){return Math.min(readParentSettings(db).dailyNewWordLimit,total)}
const meaningKey=(value:string)=>value.normalize('NFC').trim().replace(/\s+/g,' ')
function meaningAlternatives(word:Word,pool:Word[]){
 const meanings=new Set([meaningKey(word.meaning)]),choices:Word[]=[]
 for(const other of pool){const key=meaningKey(other.meaning);if(other.id===word.id||other.word===word.word||!key||meanings.has(key))continue;meanings.add(key);choices.push(other);if(choices.length===3)break}
 return choices
}
export function customModeProblems(courseId:string,ids:string[],sound:boolean){
 const pool=orderedCourseWords(courseRegistry[courseId]||{vocabulary:[],units:[]} as unknown as CoursePack).map(id=>getCourseWord(courseId,id)).filter((word):word is Word=>!!word)
 return Object.fromEntries(CUSTOM_MODES.map(mode=>{
  const missing=ids.find(id=>{const word=getCourseWord(courseId,id);return !word||!availableModes(word,pool,sound).includes(mode)||mode==='connect'&&meaningAlternatives(word,pool).length<3})
  const problem=!ids.length?'请先选择有词条的范围。':missing?mode==='connect'?'当前教材无法为部分词条组成 4 个不同词义，请选择其它模式。':['listen','dictation'].includes(mode)?!sound?'学习声音已关闭，请先在设置中开启。':'部分词条暂无可用发音，不能完成本项练习。':'部分词条缺少可区分的配对选项，请选择其它模式。':''
  return [mode,problem]
 })) as Record<LearningMode,string>
}
export function createCustomPractice(input:{courseId:string;scope:CustomPracticeScope;count:string|number;modes:LearningMode[];sound:boolean;offset?:number;now?:Date;id?:string}):CustomPracticeSession{
 const pack=courseRegistry[input.courseId],ids=practiceWordIds(input.courseId,input.scope),offset=input.offset??0
 if(!Number.isSafeInteger(offset)||offset<0||ids.length>0&&offset>=ids.length)throw Error('练习起点无效，请重新选择范围。')
 const error=practiceCountError(input.count,ids.length-offset)
 if(error)throw Error(error)
 if(!Array.isArray(input.modes)||!input.modes.length||new Set(input.modes).size!==input.modes.length||input.modes.some(mode=>!CUSTOM_MODES.includes(mode)))throw Error('请选择至少一种不重复的练习方式。')
 const modes=CUSTOM_MODES.filter(mode=>input.modes.includes(mode))
 const chosen=ids.slice(offset,offset+Number(input.count)),problems=customModeProblems(input.courseId,chosen,input.sound)
 for(const mode of input.modes)if(problems[mode])throw Error(CUSTOM_MODE_NAMES[mode]+'：'+problems[mode])
 const words=orderedCourseWords(pack).map(id=>getCourseWord(input.courseId,id)).filter((word):word is Word=>!!word),snapshot:Record<string,Word>={}
 for(const id of chosen){
  const word=getCourseWord(input.courseId,id)!,alternatives=modes.includes('connect')?meaningAlternatives(word,words):words.filter(other=>other.id!==id&&other.meaning!==word.meaning&&other.word!==word.word).slice(0,3)
  snapshot[id]=JSON.parse(JSON.stringify({...word,distractors:alternatives.map(other=>other.id)}))
  for(const other of alternatives)snapshot[other.id]??=JSON.parse(JSON.stringify({...other,distractors:[]}))
 }
 const now=(input.now||new Date()).toISOString(),seed=Math.floor(Math.random()*0x7fffffff)
 return {schemaVersion:1,source:'custom',id:input.id||`custom-${Date.now()}-${seed.toString(36)}-${++sessionCounter}`,courseId:pack.courseId,contentVersion:pack.contentVersion,contentFingerprint:customFingerprint(pack),courseTitle:pack.title,
  scope:JSON.parse(JSON.stringify(input.scope)),scopeLabel:input.scope.type==='whole-book'?'整本教材':orderedCourseUnits(pack).filter(unit=>input.scope.unitIds.includes(unit.id)).map(unit=>unit.title).join('、'),
  wordIds:chosen,wordSnapshot:snapshot,requestedCount:Number(input.count),sequenceStart:offset,modes:[...modes],modeIndex:0,index:0,
  results:{flash:{completedWordIds:[],attempts:[]},connect:{completedWordIds:[],attempts:[]},listen:{completedWordIds:[],attempts:[]},spell:{completedWordIds:[],attempts:[]},dictation:{completedWordIds:[],attempts:[]}},input:'',selected:'',revealed:false,answer:null,status:'paused',startedAt:now,updatedAt:now,elapsedMs:0,seed}
}
export function customResumeProblem(session:CustomPracticeSession|null|undefined){
 if(!session)return '没有可继续的自定义练习。'
 const pack=courseRegistry[session.courseId]
 if(!pack||!isCourseInstalled(session.courseId))return '原教材已移除或不可用，不能继续本次练习。可以结束后重新选择教材。'
 if(pack.contentVersion!==session.contentVersion||customFingerprint(pack)!==session.contentFingerprint)return '教材内容版本已变更，原断点已保留。请结束后按新版本重新练习。'
 const ordered=practiceWordIds(session.courseId,session.scope),allowed=new Set(ordered)
 if(session.sequenceStart!==undefined&&session.wordIds.some((id,index)=>id!==ordered[session.sequenceStart!+index]))return '练习顺序已失效，原断点已保留，请重新选择范围。'
 if(session.wordIds.some(id=>!allowed.has(id)||!resolveFrozenWord(session.wordSnapshot[id],session.courseId,session.contentVersion)))return '原练习词条已不可用，不能从其它教材继续。'
 return ''
}
function accountTime(session:CustomPracticeSession,now:Date){if(session.activeSince)session.elapsedMs+=Math.max(0,now.getTime()-Date.parse(session.activeSince));delete session.activeSince;session.updatedAt=now.toISOString()}
export function checkpointCustom(session:CustomPracticeSession,now=new Date()){const running=session.status==='running';accountTime(session,now);if(running)session.activeSince=now.toISOString()}
export function runCustom(session:CustomPracticeSession,now=new Date()){
 if(!['paused','running'].includes(session.status))return false
 session.status='running';session.activeSince=now.toISOString();session.updatedAt=now.toISOString()
 return true
}
export function pauseCustom(session:CustomPracticeSession,now=new Date()){
 if(session.status!=='running')return false
 accountTime(session,now);session.status='paused';return true
}
export function endCustom(session:CustomPracticeSession,now=new Date()){
 if(!['running','paused'].includes(session.status))return false
 accountTime(session,now);session.status='ended';session.endedAt=now.toISOString();return true
}
export function customToken(session:CustomPracticeSession){return `${session.id}:${session.modeIndex}:${session.index}`}
export function recordCustomAnswer(db:Database,token:string,rating?:ReviewRating,heard=false,now=new Date()){
 const session=db.customPractice
 if(!session||session.status!=='running'||customToken(session)!==token||session.answer)return false
 const mode=session.modes[session.modeIndex],id=session.wordIds[session.index],word=session.wordSnapshot[id],result=session.results[mode]
 if(!word||mode==='flash'&&!session.revealed||['listen','dictation'].includes(mode)&&!heard||['connect','listen'].includes(mode)&&!session.selected||['spell','dictation'].includes(mode)&&!session.input.trim())return false
 if(['spell','dictation'].includes(mode)&&!spellingInputReady(session.input,word,session.letterDraft))return false
 const correct=mode==='flash'?rating!==1:['connect','listen'].includes(mode)?session.selected===id:isCorrectSpelling(session.input,word)
 const answer:Answer={id:`${session.id}:${mode}:${session.index}:${result.attempts.length}`,wordId:id,courseId:session.courseId,mode,source:'practice',correct,rating:correct?(session.inputAssistance==='tiles'?2:rating||3):1,...(session.inputAssistance==='tiles'?{inputAssistance:'tiles' as const,hinted:true}:{}),input:session.input||session.selected,at:now.toISOString()}
 result.attempts.push(answer);session.answer=answer;checkpointCustom(session,now)
 if(correct&&!result.completedWordIds.includes(id))result.completedWordIds.push(id)
 db.practiceAnswers??=[];if(!db.practiceAnswers.some(item=>item.id===answer.id))db.practiceAnswers.push(answer)
 return true
}
export function advanceCustom(session:CustomPracticeSession,token:string,now=new Date()){
 if(session.status!=='running'||customToken(session)!==token||!session.answer)return false
 if(session.answer.correct){
  if(session.index<session.wordIds.length-1)session.index++
  else if(session.modeIndex<session.modes.length-1){session.modeIndex++;session.index=0}
  else{accountTime(session,now);session.status='completed';session.completedAt=now.toISOString();return true}
 }
 delete session.letterDraft;delete session.inputAssistance;session.input='';session.selected='';session.revealed=false;session.answer=null;checkpointCustom(session,now);return true
}
export function customProgress(session:CustomPracticeSession){
 const total=session.wordIds.length,steps=session.modes.reduce((sum,mode)=>sum+session.results[mode].completedWordIds.length,0)
 return {total,steps,totalSteps:total*session.modes.length,completedModes:session.modes.filter(mode=>session.results[mode].completedWordIds.length===total).length,percent:Math.floor(steps/(total*session.modes.length)*100)}
}
// Self-ratings are completion evidence, not graded answers. Retries remain in the denominator.
export function customResults(session:CustomPracticeSession){
 const ids=new Set(session.wordIds),covered=new Set(session.modes.flatMap(mode=>session.results[mode].completedWordIds).filter(id=>ids.has(id)))
 const graded=session.modes.filter(mode=>mode!=='flash').flatMap(mode=>session.results[mode].attempts)
 const gradedCorrect=graded.filter(answer=>answer.correct).length
 return {selectedWordCount:ids.size,completedWordCount:covered.size,selectedModeCount:session.modes.length,
  gradedAnswered:graded.length,gradedCorrect,accuracy:graded.length?Math.round(gradedCorrect/graded.length*100):null,
  completionRate:Math.floor(covered.size/Math.max(1,ids.size)*100),...customProgress(session)}
}
export function customChoices(session:CustomPracticeSession){
 const id=session.wordIds[session.index],word=session.wordSnapshot[id],pool=[word,...(word?.distractors||[]).map(id=>session.wordSnapshot[id])].filter(Boolean)
 const offset=(session.seed+session.index)%Math.max(1,pool.length);return [...pool.slice(offset),...pool.slice(0,offset)]
}
export function customMatchGroup(session:CustomPracticeSession){
 // End a group before a duplicate meaning so two identical labels never produce an ambiguous pair.
 const groups:string[][]=[];let group:string[]=[],meanings=new Set<string>()
 for(const id of session.wordIds){const meaning=meaningKey(session.wordSnapshot[id].meaning);if(group.length===4||meanings.has(meaning)){groups.push(group);group=[];meanings=new Set()}group.push(id);meanings.add(meaning)}
 if(group.length)groups.push(group)
 const current=session.wordSnapshot[session.wordIds[session.index]],ids=groups.find(ids=>ids.includes(current.id))||[]
 // Reserve the correct meaning before adding distractors, including short final groups.
 const choices=[current],seen=new Set([meaningKey(current.meaning)])
 function fill(pool:Word[]){for(const word of pool){const key=meaningKey(word.meaning);if(choices.length===4)break;if(word.id===current.id||word.word===current.word||!key||seen.has(key))continue;seen.add(key);choices.push(word)}}
 fill(ids.map(id=>session.wordSnapshot[id]));fill(Object.values(session.wordSnapshot))
 // Legacy snapshots may contain duplicate distractors. Only the unchanged source course may fill gaps.
 const pack=courseRegistry[session.courseId]
 if(choices.length<4&&pack&&isCourseInstalled(session.courseId)&&customFingerprint(pack)===session.contentFingerprint)fill(orderedCourseWords(pack).map(id=>getCourseWord(session.courseId,id)).filter((word):word is Word=>!!word))
 choices.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
 let random=(session.seed+session.wordIds.indexOf(ids[0]))>>>0
 for(let i=choices.length-1;i>0;i--){random=(Math.imul(random,1664525)+1013904223)>>>0;const j=random%(i+1);[choices[i],choices[j]]=[choices[j],choices[i]]}
 return {wordIds:ids,choices,groupNumber:groups.indexOf(ids)+1,totalGroups:groups.length}
}
export function validCustomPractice(value:unknown):value is CustomPracticeSession{
 const s=value as CustomPracticeSession
 if(!s||s.schemaVersion!==1||s.source!=='custom'||typeof s.id!=='string'||typeof s.courseId!=='string'||typeof s.contentVersion!=='string'||typeof s.courseTitle!=='string'||typeof s.scopeLabel!=='string'||!/^[a-f0-9]{64}$/.test(s.contentFingerprint)||!['running','paused','completed','ended'].includes(s.status)||!Number.isFinite(s.elapsedMs)||s.elapsedMs<0||!Number.isInteger(s.seed)||!Number.isFinite(Date.parse(s.startedAt))||!Number.isFinite(Date.parse(s.updatedAt)))return false
 if(s.sequenceStart!==undefined&&(!Number.isSafeInteger(s.sequenceStart)||s.sequenceStart<0))return false
 if(!s.scope||!['whole-book','units'].includes(s.scope.type)||!Array.isArray(s.scope.unitIds)||s.scope.unitIds.some(id=>typeof id!=='string')||new Set(s.scope.unitIds).size!==s.scope.unitIds.length||s.scope.type==='units'&&!s.scope.unitIds.length||s.scope.type==='whole-book'&&s.scope.unitIds.length)return false
 if(!Array.isArray(s.wordIds)||!s.wordIds.length||s.wordIds.some(id=>typeof id!=='string')||new Set(s.wordIds).size!==s.wordIds.length||s.requestedCount!==s.wordIds.length||!s.wordSnapshot||s.wordIds.some(id=>{const w=s.wordSnapshot[id];return !w||w.id!==id||typeof w.word!=='string'||typeof w.meaning!=='string'||typeof w.audio!=='string'||typeof w.image!=='string'||!Array.isArray(w.distractors)}))return false
 if(!validCustomModes(s.modes)||!Number.isInteger(s.modeIndex)||s.modeIndex<0||s.modeIndex>=s.modes.length||!Number.isInteger(s.index)||s.index<0||s.index>=s.wordIds.length||typeof s.input!=='string'||typeof s.selected!=='string'||typeof s.revealed!=='boolean')return false
 if(s.status==='running'&&!Number.isFinite(Date.parse(s.activeSince||''))||s.status!=='running'&&s.activeSince!==undefined||s.status==='completed'&&!Number.isFinite(Date.parse(s.completedAt||''))||s.status==='ended'&&!Number.isFinite(Date.parse(s.endedAt||'')))return false
 for(const mode of CUSTOM_MODES){
  const result=s.results?.[mode]
  if(!result||!Array.isArray(result.completedWordIds)||result.completedWordIds.length>s.wordIds.length||result.completedWordIds.some((id,index)=>id!==s.wordIds[index])||!Array.isArray(result.attempts))return false
  if(result.attempts.some(a=>!a||typeof a.id!=='string'||a.mode!==mode||a.courseId!==s.courseId||a.source!=='practice'||!s.wordIds.includes(a.wordId)||typeof a.correct!=='boolean'||![1,2,3,4].includes(a.rating)||typeof a.input!=='string'||!Number.isFinite(Date.parse(a.at)))||new Set(result.attempts.map(a=>a.id)).size!==result.attempts.length)return false
  if(result.completedWordIds.some(id=>!result.attempts.some(a=>a.wordId===id&&a.correct)))return false
  const index=s.modes.indexOf(mode),count=result.completedWordIds.length
  if(index<0&&(count||result.attempts.length)||index>=0&&index<s.modeIndex&&count!==s.wordIds.length||index>s.modeIndex&&(count||result.attempts.length))return false
 }
 const mode=s.modes[s.modeIndex],result=s.results[mode]
 if(s.answer&&(!result.attempts.length||JSON.stringify(s.answer)!==JSON.stringify(result.attempts[result.attempts.length-1])||s.answer.wordId!==s.wordIds[s.index]))return false
 if(result.completedWordIds.length!==s.index+(s.answer?.correct?1:0))return false
 return s.status!=='completed'||s.modes.every(mode=>s.results[mode].completedWordIds.length===s.wordIds.length)
}
