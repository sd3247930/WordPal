import type {CoursePack} from '../../../packages/content_schema/course'
import type {Word,MemoryCard,Answer} from '../../../packages/core_learning'

export interface CourseOccurrence {id:string;courseId:string;unitId:string;unitTitle:string;lexemeId:string;order:number;lessonIds:string[]}
/** Existing canonical IDs already distinguish meanings; never deduplicate by spelling. */
export function occurrences(pack:CoursePack):CourseOccurrence[]{
 const result:CourseOccurrence[]=[]
 for(const unit of pack.units){const seen=new Map<string,CourseOccurrence>();for(const lesson of unit.lessons)for(const id of lesson.wordIds){
  let row=seen.get(id)
  if(!row){row={id:JSON.stringify([pack.courseId,unit.id,id]),courseId:pack.courseId,unitId:unit.id,unitTitle:unit.title,lexemeId:id,order:result.length,lessonIds:[]};seen.set(id,row);result.push(row)}
  if(!row.lessonIds.includes(lesson.id))row.lessonIds.push(lesson.id)
 }}
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
