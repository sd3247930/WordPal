import type {Answer,MemoryCard} from '../../../packages/core_learning'
import {localDate} from '../../../packages/core_learning'

export const familiarityLevels=['unseen','introduced','practicing','familiar','mastered','unrated'] as const
export type FamiliarityLevel=typeof familiarityLevels[number]
export const familiarityLabels:Record<FamiliarityLevel,string>={unseen:'未学',introduced:'初识',practicing:'练习中',familiar:'较熟悉',mastered:'熟练掌握',unrated:'待评估'}
/** Product presentation thresholds; these never configure the scheduler. */
export const FamiliarityPolicy={familiarDays:2,masteredDays:3,recentWindow:3} as const
export interface Familiarity {level:FamiliarityLevel;label:string;reason:string;learned:boolean;successfulDays:number;recentCorrect:number;recentTotal:number}
const modes=new Set(['flash','connect','listen','spell','dictation'])
export function validFamiliarityAnswer(answer:Answer,wordId:string,now:number){
 return !!answer&&answer.wordId===wordId&&typeof answer.id==='string'&&!!answer.id&&Number.isFinite(Date.parse(answer.at))&&Date.parse(answer.at)<=now&&typeof answer.correct==='boolean'&&[1,2,3,4].includes(answer.rating)&&modes.has(answer.mode)&&['new_word','review_due','practice'].includes(answer.source)
}
/** A read-only projection of real answers. Missing legacy evidence remains unknown. */
export function familiarityFor(wordId:string,card:MemoryCard|undefined,answers:Answer[],now=Date.now()):Familiarity{
 const matching=answers.filter(a=>a?.wordId===wordId),valid=matching.filter(a=>validFamiliarityAnswer(a,wordId,now))
 const unique=[...new Map(valid.map(a=>[a.id,a])).values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))
 const independent=unique.filter(a=>a.mode!=='flash'),success=(a:Answer)=>a.correct&&a.rating>=3&&a.hinted!==true
 const recent=independent.slice(-FamiliarityPolicy.recentWindow),days=new Set(independent.filter(success).map(a=>localDate(new Date(a.at))))
 let level:FamiliarityLevel,reason:string
 const trustworthy=matching.length===valid.length,stable=recent.length>0&&recent.every(success)
 const dueSuccess=independent.some(a=>success(a)&&a.source==='review_due'&&(!a.dueAtSubmit||Number.isFinite(Date.parse(a.dueAtSubmit))&&Date.parse(a.dueAtSubmit)<=Date.parse(a.at)))
 if(!unique.length){level=card||matching.length?'unrated':'unseen';reason=level==='unrated'?'保留原有复习计划；旧记录缺少可靠的答题证据。':'还没有完成有效学习活动；浏览和听发音不计入已学。'}
 else if(!trustworthy){level='unrated';reason='部分历史记录无法核实，暂不估计熟知程度；原有复习计划保留。'}
 else if(!independent.length){level='introduced';reason='已完成认词自评，还需要独立答题来验证记忆。'}
 else if(stable&&days.size>=FamiliarityPolicy.masteredDays&&dueSuccess){level='mastered';reason=`已有 ${days.size} 个不同日期的独立答对记录，并通过真正到期的复习。`}
 else if(stable&&days.size>=FamiliarityPolicy.familiarDays){level='familiar';reason=`已有 ${days.size} 个不同日期的独立答对记录；继续按计划复习。`}
 else{level='practicing';reason=recent.some(a=>!success(a))?'最近有答错或需要提示的记录，继续练习会更稳。':'已有独立答题记录，跨天练习证据仍在积累。'}
 const recentCorrect=recent.filter(success).length
 return {level,label:familiarityLabels[level],reason:reason+(recent.length?` 最近 ${recent.length} 次独立练习中，无提示答对 ${recentCorrect} 次。`:''),learned:unique.length>0,successfulDays:days.size,recentCorrect,recentTotal:recent.length}
}
