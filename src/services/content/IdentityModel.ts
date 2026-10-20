import type {CoursePack} from '../../../packages/content_schema/course'
import type {Word,MemoryCard,Answer} from '../../../packages/core_learning'
import {orderedUnits,orderedWordIds} from '../../../packages/content_schema/course-order'

export interface CourseOccurrence {id:string;courseId:string;unitId:string;unitTitle:string;lexemeId:string;order:number;lessonIds:string[];unitWordOrder?:number;bookWordOrder?:number;positionStatus?:'confirmed'|'unconfirmed'}
/** Existing canonical IDs already distinguish meanings; never deduplicate by spelling. */
export function occurrences(pack:CoursePack):CourseOccurrence[]{
 const result:CourseOccurrence[]=[]
 const known=new Set(pack.vocabulary.map(word=>word.id)),assigned=new Set<string>()
 for(const unit of orderedUnits(pack)){
  const lessonsByWord=new Map<string,string[]>()
  for(const lesson of unit.lessons)for(const id of new Set(lesson.wordIds)){const lessons=lessonsByWord.get(id)||[];lessons.push(lesson.id);lessonsByWord.set(id,lessons)}
  for(const [index,id] of orderedWordIds(pack,[...lessonsByWord.keys()]).entries()){
   result.push({id:JSON.stringify([pack.courseId,unit.id,id]),courseId:pack.courseId,unitId:unit.id,unitTitle:unit.title,lexemeId:id,order:result.length,bookWordOrder:result.length+1,unitWordOrder:index+1,positionStatus:known.has(id)?'confirmed':'unconfirmed',lessonIds:lessonsByWord.get(id)!})
   assigned.add(id)
  }
 }
 for(const id of orderedWordIds(pack,pack.vocabulary.map(word=>word.id)).filter(id=>!assigned.has(id)))result.push({id:JSON.stringify([pack.courseId,'',id]),courseId:pack.courseId,unitId:'',unitTitle:'',lexemeId:id,order:result.length,bookWordOrder:result.length+1,positionStatus:pack.units.length?'unconfirmed':'confirmed',lessonIds:[]})
 return result
}
export function lexeme(word:Word){return {id:word.id,lemma:word.word,language:'en' as const,pos:word.pos,meaningsZh:[word.meaning],phonics:word.phonics,ipa:word.ipa}}
export function learningRecord(id:string,card:MemoryCard|undefined,history:Answer[],starred:boolean){
 const answers=history.filter(a=>a.wordId===id)
 return {lexemeId:id,schedulerState:card,isStarred:starred,firstLearnedAt:answers[0]?.at,lastReviewedAt:answers.at(-1)?.at,nextReviewAt:card?.due,mistakeCount:answers.filter(a=>!a.correct).length}
}
export function identityMapping(ids:string[],packs:CoursePack[]){
 const rows=packs.flatMap(occurrences)
 return [...new Set(ids)].map(id=>({oldWordId:id,lexemeId:id,occurrenceIds:rows.filter(row=>row.lexemeId===id).map(row=>row.id)}))
}
export function occurrenceProgress(pack:CoursePack,completedLessons:string[]){const completed=new Set(completedLessons);return {courseId:pack.courseId,completedOccurrenceIds:occurrences(pack).filter(row=>row.lessonIds.some(id=>completed.has(id))).map(row=>row.id)}}
