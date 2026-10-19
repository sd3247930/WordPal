import assert from 'node:assert/strict'
import {useLearningStore} from '../../src/stores/learning'
import {useProfileStore} from '../../src/stores/profile'
/** Legacy session fixtures still verify old backups, explicit review and historical SRS behavior. */
export function startLegacyRound(learning=useLearningStore()){
 if(learning.session&&!learning.session.flow&&!learning.session.completedAt)return true
 const started=learning.start();if(!started)return false
 const profile=useProfileStore(),session=JSON.parse(JSON.stringify(learning.session!));delete session.flow
 profile.transact(d=>{d.session=session;const progress=d.courseProgress![session.courseId];delete progress.dailyPlan;progress.studyActivity='independent'})
 return true
}
export function answerDailyWord(learning=useLearningStore()){
 const word=learning.current!;assert(word)
 if(['connect','listen'].includes(learning.session!.mode))learning.patch({selected:word.id})
 else if(['spell','dictation'].includes(learning.session!.mode))learning.patch({input:word.word})
 else learning.reveal()
 assert(learning.submit(3));assert(learning.next())
}
export function finishDaily(learning=useLearningStore()){
 const count=learning.session!.wordIds.length
 for(let i=0;!learning.session?.completedAt&&i<count*6+1;i++)answerDailyWord(learning)
 assert(learning.session?.completedAt,'six-step task must finish within 6N answers')
}
