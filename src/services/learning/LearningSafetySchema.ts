import type {Answer,LearningSession} from '../../../packages/core_learning'
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)
export function validAnswerSafety(answer:Answer){
 if(answer.hintKind!==undefined&&!['answer','encouragement'].includes(answer.hintKind))return false
 if(answer.requestedRating!==undefined&&![1,2,3,4].includes(answer.requestedRating))return false
 if(answer.assessmentVersion!==undefined&&(answer.assessmentVersion!==1||answer.recallAttempt!=='first'))return false
 if(answer.settlement!==undefined&&!['settled','practice','stale_due','already_settled','legacy_session'].includes(answer.settlement))return false
 const audio=answer.audioEvidence
 return audio===undefined||object(audio)&&typeof audio.url==='string'&&Number.isSafeInteger(audio.requestId)&&audio.requestId>=0&&Number.isFinite(Date.parse(audio.heardAt))
}
export function validSessionSafety(session:LearningSession){
 if(session.memoryVersions!==undefined&&(!object(session.memoryVersions)||Object.entries(session.memoryVersions).some(([id,version])=>!session.wordIds.includes(id)||typeof version!=='string'||version.length>1500)))return false
 if(session.hintKind!==undefined&&!['answer','encouragement'].includes(session.hintKind))return false
 if(session.resourceVersion!==undefined&&(typeof session.resourceVersion!=='string'||session.resourceVersion.length>100))return false
 const flow=session.flow
 if(flow?.assessments!==undefined&&(!object(flow.assessments)||Object.entries(flow.assessments).some(([id,answerId])=>!session.wordIds.includes(id)||typeof answerId!=='string'||!flow.attempts.some(answer=>answer.id===answerId&&answer.wordId===id&&answer.step==='consolidate'&&answer.assessmentVersion===1))))return false
 if(flow?.capabilities!==undefined&&(!object(flow.capabilities)||Object.entries(flow.capabilities).some(([step,items])=>!['flash','connect','listen','spell','dictation','consolidate'].includes(step)||!object(items)||Object.entries(items).some(([id,item])=>!session.wordIds.includes(id)||!object(item)||!['ready','unavailable','completed'].includes(item.status as string)||item.reason!==undefined&&typeof item.reason!=='string'))))return false
 return session.answers.every(validAnswerSafety)&&(!flow||flow.attempts.every(validAnswerSafety))
}
