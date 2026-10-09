import {computed,reactive} from 'vue'
import type {CoursePack} from '../../../packages/content_schema/course'
import {readStorage,writeStorage} from '../storage'
import {courseRegistry,archiveStatus,installationStatus,isCourseInstalled,isBundledCourse,resolveCourseAsset,wordById} from './ContentRegistry'
import {occurrences,type CourseOccurrence} from './IdentityModel'

export interface CourseDescriptor {
 courseId:string;title:string;route:CoursePack['route'];publisher?:string|null;edition?:string;editionYear?:number|null;startGrade?:1|3|null;grade?:number|null;semester?:string|null;contentVersion:string;abilityLevels:string[]
 units:{id:string;title:string;lessons:number}[];wordCount:number;occurrenceCount:number;coverage:{audio:number;image:number;example:number;bytes:number};sources:CoursePack['sources'];positions:CourseOccurrence[]
}
export const DIRECTORY_KEY='wordpal.content.directory.v1'
export const directoryCache=reactive<Record<string,CourseDescriptor>>({})
export function describeCourse(pack:CoursePack):CourseDescriptor{
 const positions=occurrences(pack),items=pack.vocabulary.map(w=>({...wordById[w.id],...w,audio:(w.assetRefs?.audio?resolveCourseAsset(pack.courseId,w.assetRefs.audio):w.audio)||wordById[w.id]?.audio,image:w.assetRefs?.image?resolveCourseAsset(pack.courseId,w.assetRefs.image):w.image,example:w.example||wordById[w.id]?.example}))
 const local=(value?:string)=>!!value&&!/^https?:/i.test(value)
 return {courseId:pack.courseId,title:pack.title,route:pack.route,publisher:pack.publisher,edition:pack.edition,editionYear:pack.editionYear,startGrade:pack.startGrade,grade:pack.grade,semester:pack.semester,contentVersion:pack.contentVersion,abilityLevels:pack.abilityLevels,
  units:pack.units.map(u=>({id:u.id,title:u.title,lessons:u.lessons.length})),wordCount:pack.vocabulary.length,occurrenceCount:positions.length,sources:pack.sources,positions,
  coverage:{audio:items.filter(w=>local(w?.audio)||local(w?.audioUS)||local(w?.audioUK)).length,image:items.filter(w=>local(w?.image)).length,example:items.filter(w=>!!w?.example).length,bytes:pack.assets.reduce((n,a)=>n+a.bytes,0)}}
}
export function loadDirectory(){for(const id of Object.keys(directoryCache))delete directoryCache[id];Object.assign(directoryCache,readStorage<Record<string,CourseDescriptor>>(DIRECTORY_KEY,{}))}
export function retainDescriptor(pack:CoursePack){const descriptor=describeCourse(pack),next={...readStorage<Record<string,CourseDescriptor>>(DIRECTORY_KEY,{}),...directoryCache,[pack.courseId]:descriptor};writeStorage(DIRECTORY_KEY,next);Object.assign(directoryCache,next)}
export const courseDirectory=computed(()=>Object.values({...directoryCache,...Object.fromEntries(Object.values(courseRegistry).map(pack=>[pack.courseId,describeCourse(pack)]))}))
export function installationLabel(id:string){return installationStatus[id]==='installing'?'正在安装':installationStatus[id]==='failed'?'安装失败，可重试':isCourseInstalled(id)?'已安装':archiveStatus[id]?'已归档':'未安装'}
export function canReinstall(id:string){return isBundledCourse(id)&&!!courseRegistry[id]}
