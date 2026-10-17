import type {Element,PetState} from '../../packages/pet_engine'
import type {Database} from '../stores/profile'
import {courseRegistry,isCourseInstalled} from './content/ContentRegistry'
import {courseIntroductions,orderedCourseWords} from './learning/CourseStudySequence'

export type PetForm=1|2|3|4
// Reserve space for the largest form and its brief unlock animation inside every frame.
export const petFormBaseScale=.72
export const petStages=[
 {title:'幼年期',level:1,scale:petFormBaseScale},
 {title:'成年期',level:4,scale:petFormBaseScale*1.1},
 {title:'进化期',level:8,scale:petFormBaseScale*1.21},
 {title:'未知形态',level:null,scale:petFormBaseScale*1.331}
] as const

export function stageUnlocked(pet:Pick<PetState,'level'>,index:number,curriculumComplete=false){
 if(index===3)return curriculumComplete
 const level=petStages[index]?.level
 return typeof level==='number'&&pet.level>=level
}
export function petGrowthAsset(element:Element,stage:number=1){
 const file=({1:'juvenile',2:'growing',3:'evolved',4:'unknown'} as Record<number,string>)[stage]
 return file?`/static/pet-house/growth/${element}-${file}.png`:''
}
export function displayPetForm(pet:Pick<PetState,'level'>,preferred:unknown,curriculumComplete=false):PetForm{
 return (preferred===2||preferred===3||preferred===4)&&stageUnlocked(pet,preferred-1,curriculumComplete)?preferred:1
}

export interface PetCurriculumProgress {total:number;learned:number;complete:boolean}
/** Revealing colour never changes a form's size, the level thresholds or any learning record. */
export function petStagePresentation(pet:Pick<PetState,'level'|'exp'>,index:number,curriculum:PetCurriculumProgress){
 const stage=petStages[index],unlocked=stageUnlocked(pet,index,curriculum.complete)
 const finite=(value:number)=>Number.isFinite(value)?Math.max(0,value):0
 const start=index===2?300:0,target=index===1?300:700
 const ratio=unlocked?1:!stage?0:index===3?(curriculum.total>0?finite(curriculum.learned)/curriculum.total:0):(finite(pet.exp)-start)/(target-start)
 const bounded=Math.min(1,Math.max(0,ratio)),percent=unlocked?100:Math.min(99,Math.floor(bounded*100))
 return {unlocked,percent,state:unlocked?'unlocked':percent>0?'learning':'locked',
  grayscale:unlocked?0:Math.round(80-60*bounded),opacity:unlocked?1:Number((.7+.2*bounded).toFixed(3)),veil:unlocked?0:Number((.36-.24*bounded).toFixed(3)),
  remaining:index===3?Math.max(0,finite(curriculum.total)-finite(curriculum.learned)):Math.max(0,target-finite(pet.exp))}
}

/** First-pass learning belongs to each installed book, even when books share SRS cards. */
export function allCourseLearningProgress(db:Database){
 const courses=Object.values(courseRegistry).filter(pack=>isCourseInstalled(pack.courseId)).map(pack=>{
  const ids=orderedCourseWords(pack),introduced=courseIntroductions(db,pack.courseId)
  return {courseId:pack.courseId,total:ids.length,learned:ids.filter(id=>id in introduced).length}
 })
 const total=courses.reduce((sum,course)=>sum+course.total,0),learned=courses.reduce((sum,course)=>sum+course.learned,0)
 const complete=total>0&&learned===total
 return {courses,total,learned,complete,percent:complete?100:total?Math.min(99,Math.floor(learned/total*100)):0}
}
