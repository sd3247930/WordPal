import type {Database} from '../../stores/profile'
import type {CoursePack} from '../../../packages/content_schema/course'
import {courseRegistry,isCourseReadable} from './ContentRegistry'
import {deletedCourses,isUserDeleted} from '../../../packages/content_schema/course-lifecycle'
import {readStorage,writeStorage} from '../storage'
import {pruneCourseProgress,PRESENTATION_KEY,ACTIVITY_KEY} from '../learning/CourseProgressMemory'

export const REMOVAL_BACKUP_PREFIX='wordpal.content.removal.backup.'
export interface CourseRemovalScope {courseId:string;wordIds:string[];exclusiveWordIds:string[]}
/** Resolve ownership by exact IDs before any descriptor, version or course memory is removed. */
export function courseRemovalScope(courseId:string,database?:Database):CourseRemovalScope{
 const descriptor=readStorage<Record<string,{positions?:{lexemeId:string}[]}>>('wordpal.content.directory.v1',{})[courseId]
 const entries=readStorage<{courseId:string;key:string;versions?:{key:string}[];previousKey?:string}[]>('wordpal.content.catalog.v2',[]).filter(entry=>entry.courseId===courseId)
 const ids=new Set([...(courseRegistry[courseId]?.vocabulary.map(word=>word.id)||[]),...(descriptor?.positions||[]).map(row=>row.lexemeId)])
 for(const id of readStorage<{wordIds?:string[]}|null>(REMOVAL_BACKUP_PREFIX+courseId,null)?.wordIds||[])ids.add(id)
 for(const id of readStorage<{wordIds?:string[]}|null>('wordpal.content.removal.scope.'+courseId,null)?.wordIds||[])ids.add(id)
 for(const entry of entries)for(const key of [entry.key,...(entry.versions||[]).map(version=>version.key),entry.previousKey].filter((key):key is string=>!!key))for(const word of readStorage<CoursePack|null>(key,null)?.vocabulary||[])ids.add(word.id)
 for(const answer of [...(database?.history||[]),...(database?.practiceAnswers||[])])if(answer.courseId===courseId)ids.add(answer.wordId)
 const surviving=new Set(Object.values(courseRegistry).filter(pack=>pack.courseId!==courseId&&isCourseReadable(pack.courseId)).flatMap(pack=>pack.vocabulary.map(word=>word.id)))
 return {courseId,wordIds:[...ids],exclusiveWordIds:[...ids].filter(id=>!surviving.has(id))}
}
export function removedCourseScopes(database?:Database){return Object.keys(deletedCourses).filter(isUserDeleted).map(id=>courseRemovalScope(id,database))}
const owned=(row:{courseId?:string;wordId:string},scope:CourseRemovalScope)=>row.courseId===scope.courseId||scope.exclusiveWordIds.includes(row.wordId)

/** Recovery snapshots are private storage, never a source for discovery, vocabulary or auto-restore. */
export function backupCourseRemoval(database:Database,scope:CourseRemovalScope){
 const key=REMOVAL_BACKUP_PREFIX+scope.courseId
 const previous=readStorage<unknown>(key,null)
 if(previous&&isUserDeleted(scope.courseId))return
 if(previous)writeStorage(key+'.previous',previous)
 const exclusive=new Set(scope.exclusiveWordIds),id=scope.courseId
 const snapshot={schemaVersion:1,courseId:id,createdAt:new Date().toISOString(),wordIds:scope.wordIds,exclusiveWordIds:scope.exclusiveWordIds,
  cards:Object.fromEntries(Object.entries(database.cards).filter(([id])=>exclusive.has(id))),history:database.history.filter(row=>owned(row,scope)),practiceAnswers:database.practiceAnswers?.filter(row=>owned(row,scope)),auxiliaryRecords:database.auxiliaryRecords?.filter(row=>row.courseId===id),
  progress:database.courseProgress?.[id],session:(database.session?.courseId||database.currentCourseId)===id?database.session:null,courseSession:database.courseSessions?.[id],
  customPractice:database.customPractice?.courseId===id?database.customPractice:null,
  customPracticeCursors:database.customPracticeCursors?.filter(cursor=>cursor.courseId===id),
  descriptor:readStorage<Record<string,unknown>>('wordpal.content.directory.v1',{})[id],preferences:readStorage<unknown>('wordpal.wordbook.preferences.v1',null),
  presentation:readStorage<unknown>(PRESENTATION_KEY,null),activities:readStorage<unknown>(ACTIVITY_KEY,null)}
 writeStorage(key,snapshot)
 if(JSON.stringify(readStorage(key,null))!==JSON.stringify(snapshot))throw new Error('教材记录备份校验失败，已停止清理。')
}
/** Shared word cards, other textbooks, global reward receipts and pet growth stay unchanged. */
export function pruneRemovedCourseRecords(database:Database,scope:CourseRemovalScope){
 const before=JSON.stringify(database),exclusive=new Set(scope.exclusiveWordIds)
 for(const id of exclusive)delete database.cards[id]
 database.history=database.history.filter(row=>!owned(row,scope))
 if(database.practiceAnswers)database.practiceAnswers=database.practiceAnswers.filter(row=>!owned(row,scope))
 if(database.auxiliaryRecords)database.auxiliaryRecords=database.auxiliaryRecords.filter(row=>row.courseId!==scope.courseId)
 if(database.customPractice?.courseId===scope.courseId)database.customPractice=null
 if(database.customPracticeCursors)database.customPracticeCursors=database.customPracticeCursors.filter(cursor=>cursor.courseId!==scope.courseId)
 pruneCourseProgress(database,scope.courseId)
 return before!==JSON.stringify(database)
}
export function pruneRemovedPreferences(scopes:CourseRemovalScope[]){
 const key='wordpal.wordbook.preferences.v1',preferences=readStorage<{favorites:string[];later:string[]}|null>(key,null)
 if(!preferences)return false
 const exclusive=new Set(scopes.flatMap(scope=>scope.exclusiveWordIds))
 const next={...preferences,favorites:(preferences.favorites||[]).filter(id=>!exclusive.has(id)),later:(preferences.later||[]).filter(id=>!exclusive.has(id))}
 if(JSON.stringify(next)===JSON.stringify(preferences))return false
 writeStorage(key,next);return true
}
