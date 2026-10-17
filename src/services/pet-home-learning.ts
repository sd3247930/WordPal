import {localDate,type Answer} from '../../packages/core_learning'

/** The same dated formal answers and reward marker used by the existing daily task. */
export function petHomeLearningProgress(history:Answer[],rewardIds:string[],day=localDate()){
 const answers=history.filter(answer=>localDate(new Date(answer.at))===day),count=answers.length
 return {count,practiceCount:Math.min(3,count),learningCount:Math.min(5,count),practiceDone:count>=3,learningDone:count>=5,spellingDone:answers.some(answer=>answer.mode==='spell'||answer.mode==='dictation'),rewarded:rewardIds.includes(`daily-task:${day}`)}
}
