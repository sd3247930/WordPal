import type {CoursePack} from '../../../packages/content_schema/course'
import {abilityId,abilityMeta,type EntryLevel} from '../../../packages/parent_settings'
import {isUserDeleted} from '../../../packages/content_schema/course-lifecycle'
export function recommendCourses(input:{entryLevel:EntryLevel;installed:CoursePack[];currentCourseId:string;learnedIds:Set<string>}){
 const id=abilityId(input.entryLevel)
 const courses=input.installed.filter(c=>!isUserDeleted(c.courseId)&&c.abilityLevels.includes(id)).map(course=>({course,remaining:course.vocabulary.filter(w=>!input.learnedIds.has(w.id)).length}))
 courses.sort((a,b)=>Number(b.remaining>0)-Number(a.remaining>0)||Number(b.course.courseId===input.currentCourseId)-Number(a.course.courseId===input.currentCourseId)||a.course.courseId.localeCompare(b.course.courseId))
 return {entryLevel:input.entryLevel,meta:abilityMeta(input.entryLevel),courses:courses.map(c=>c.course),currentMatches:courses.some(c=>c.course.courseId===input.currentCourseId)}
}
