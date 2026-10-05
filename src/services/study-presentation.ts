import type {Answer,LearningMode,LearningSession,MemoryCard} from '../../packages/core_learning'
import {mastery} from '../../packages/core_learning'
import {abilityMeta,type EntryLevel} from '../../packages/parent_settings'

export const childRatings=['再学一次','有点难','记住了','很熟练'] as const
export function automaticMode(index:number,kind:LearningSession['kind'],entryLevel?:EntryLevel):LearningMode {
 if(entryLevel){const order=abilityMeta(entryLevel).modes;return order[Math.max(0,index)%order.length]}
 const order:LearningMode[]=kind==='review_due'?['flash','listen','connect','spell','dictation']:['flash','connect','listen','spell','dictation']
 return order[Math.max(0,index)%order.length]
}
export function revisitWords(answers:Answer[]):string[]{return [...new Set(answers.filter(answer=>!answer.correct).map(answer=>answer.wordId))]}
export function needsRecentPractice(history:Answer[]):boolean {
 const recent=history.slice(-5)
 if(!recent.length||recent.slice(-2).length===2&&recent.slice(-2).every(answer=>answer.correct))return false
 return recent.filter(answer=>!answer.correct).length>=2 || recent.length>=2&&recent[recent.length-1].rating===1&&recent[recent.length-2].rating>=3
}
export function masteryPresentation(card?:MemoryCard){
 const state=mastery(card)
 return ({new:{dots:0,label:'还未学习'},learning:{dots:1,label:'初次认识'},review:{dots:card&&card.stability>=7?3:2,label:card&&card.stability>=7?'越来越熟悉':'记忆成长中'},mastered:{dots:4,label:'记得很稳'}})[state]
}
export function nextReviewLabel(due?:string,now=new Date()):string {
 if(!due)return '学习后安排复习'
 const date=new Date(due)
 if(Number.isNaN(date.getTime()))return '复习日期待确认'
 if(date.getTime()<=now.getTime())return '今天复习'
 const day=(d:Date)=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())
 const distance=Math.round((day(date)-day(now))/86400000)
 if(distance===0)return '今天稍后'
 if(distance===1)return '明天'
 if(distance>=7&&distance<=13)return '下周'
 return `${distance} 天后`
}
