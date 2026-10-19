import {reactive} from 'vue'
import {readStorage,writeStorage} from '../local_storage'

export const DELETED_COURSES_KEY='wordpal.content.deleted.v1'
export interface DeletedCourse {versions:string[];deletedAt:string}
export const deletedCourses=reactive<Record<string,DeletedCourse>>({})
const generations=new Map<string,number>()
const validId=(id:string)=>id!=='starter'&&/^[a-z][a-z0-9-]*$/.test(id)
export const isUserDeleted=(id:string)=>!!deletedCourses[id]
export const courseGeneration=(id:string)=>generations.get(id)||0
export function assertCourseGeneration(id:string,generation:number){if(courseGeneration(id)!==generation)throw new Error('教材状态已变更，请重新确认安装。')}

/** Legacy descriptors were written by uninstall, unlike an ordinary never-installed listing. */
export function loadCourseLifecycle(){
 for(const id of Object.keys(deletedCourses))delete deletedCourses[id]
 const stored=readStorage<Record<string,DeletedCourse>>(DELETED_COURSES_KEY,{})
 for(const [id,record] of Object.entries(stored))if(validId(id)&&Array.isArray(record?.versions))deletedCourses[id]={versions:record.versions.filter(version=>typeof version==='string'),deletedAt:record.deletedAt||''}
 const states=readStorage<Record<string,string>>('wordpal.content.installation.v1',{})
 const descriptors=readStorage<Record<string,{courseId?:string;contentVersion?:string}>>('wordpal.content.directory.v1',{})
 const completed=new Set(readStorage<{done?:string[]}>('wordpal.batch-uninstall.v1',{}).done||[])
 for(const [id,state] of Object.entries(states))if(validId(id)&&state==='notInstalled'&&(descriptors[id]?.courseId===id||completed.has(id))&&!deletedCourses[id]){
  // Persistence is completed by the removal migration after its recoverable backup is saved.
  deletedCourses[id]={versions:descriptors[id]?.contentVersion?[descriptors[id].contentVersion!]:[],deletedAt:''}
 }
}
export function markCourseDeleted(id:string,versions:string[]=[]){
 if(!validId(id))throw new Error('教材删除标识无效。')
 const record={versions:[...new Set([...(deletedCourses[id]?.versions||[]),...versions])],deletedAt:deletedCourses[id]?.deletedAt||new Date().toISOString()}
 writeStorage(DELETED_COURSES_KEY,{...deletedCourses,[id]:record})
 deletedCourses[id]=record;generations.set(id,courseGeneration(id)+1)
}
/** Only validated, explicitly requested installation may call this commit operation. */
export function restoreDeletedCourse(id:string){
 if(!isUserDeleted(id))return
 const next={...deletedCourses};delete next[id]
 writeStorage(DELETED_COURSES_KEY,next);delete deletedCourses[id]
 generations.set(id,courseGeneration(id)+1)
}
export function courseIdFromPackKey(key:string){return key.match(/^wordpal\.content\.pack\.([a-z][a-z0-9-]*)\.[a-f0-9]{16}$/)?.[1]}
export function assertContentReadable(id:string){if(isUserDeleted(id))throw new Error('教材已删除，请主动重新导入后再使用。')}
