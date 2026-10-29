import type {Word,StudyCapability,StudyStep,LearningSession} from '../../../packages/core_learning'
import {studyCapability} from '../../../packages/core_learning/study-capability'
export {studyCapability,validStudyAudio} from '../../../packages/core_learning/study-capability'
export const questionKey=(session:LearningSession|undefined|null)=>session?[session.courseId,session.id,session.flow?.step||session.mode,session.index,session.wordIds[session.index]].join(':'):''
export function planCapabilities(session:LearningSession,resolve:(id:string)=>Word|undefined,choicesFor:(word:Word)=>Word[]){
 const steps:StudyStep[]=['flash','connect','listen','spell','dictation','consolidate']
 return Object.fromEntries(steps.map(step=>[step,Object.fromEntries(session.wordIds.map(id=>{const word=resolve(id);return [id,session.flow?.completed[step].includes(id)?{status:'completed'}:studyCapability(word,step==='consolidate'?'flash':step,word?choicesFor(word):[])]}))])) as Record<StudyStep,Record<string,StudyCapability>>
}
