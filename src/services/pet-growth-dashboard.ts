import type {PetState} from '../../packages/pet_engine'
import type {Answer} from '../../packages/core_learning'
import {courseRegistry,isCourseInstalled} from './content/ContentRegistry'

const validCount=(value:number)=>Number.isFinite(value)&&value>=0&&Number.isInteger(value)?value:null
/** Read-only projection: exp is already lifetime XP in the existing pet engine. */
export function petGrowthMetrics(pet:PetState,history:Answer[],unavailable=false){
 const lifetimeXp=unavailable?null:validCount(pet.exp),level=unavailable?null:validCount(pet.level)
 const levelXp=lifetimeXp===null?null:lifetimeXp%100
 const bond=unavailable||!Number.isFinite(pet.affection)||pet.affection<0||pet.affection>100?null:pet.affection
 const answers=new Map<string,Answer>()
 for(const a of history)if(a&&typeof a.id==='string'&&a.id&&typeof a.wordId==='string'&&a.wordId&&['new_word','review_due'].includes(a.source)&&Number.isFinite(Date.parse(a.at))&&[1,2,3,4].includes(a.rating)&&typeof a.correct==='boolean'&&['flash','connect','listen','spell','dictation'].includes(a.mode)&&!answers.has(a.id))answers.set(a.id,a)
 return {level:level!==null&&level>0?level:null,levelXp,requiredXp:100,lifetimeXp,bond,bondMax:100,
  remainingXp:levelXp===null?null:100-levelXp,
  device:{answerCount:unavailable?null:answers.size,uniqueWords:unavailable?null:new Set([...answers.values()].map(a=>a.wordId)).size,activeMinutes:null}}
}
export function petStudyDestination(courseId:string){
 return isCourseInstalled(courseId)&&courseRegistry[courseId]?.vocabulary.length?'learn':'course'
}
