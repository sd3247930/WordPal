import type {CoursePack} from '../../../packages/content_schema/course'
import {cleanCourseLabel} from './CourseSelection'

export interface CourseRemovalPreview {courseId:string;title:string;wordCount:number;mediaCount:number;bundled:boolean}
/** Unknown metadata must never become a plausible empty course in a destructive confirmation. */
export function courseRemovalPreview(pack:CoursePack|undefined,bundled:boolean):CourseRemovalPreview|null{
 if(!pack||!/^[a-z][a-z0-9-]*$/.test(pack.courseId||'')||typeof pack.title!=='string'||!cleanCourseLabel(pack.title)||!Array.isArray(pack.vocabulary)||!Array.isArray(pack.assets))return null
 if(pack.vocabulary.some(word=>!word||typeof word.id!=='string'||!word.id)||pack.assets.some(asset=>!asset||typeof asset.id!=='string'||!asset.id))return null
 return {courseId:pack.courseId,title:cleanCourseLabel(pack.title),wordCount:new Set(pack.vocabulary.map(word=>word.id)).size,mediaCount:pack.assets.length,bundled}
}
