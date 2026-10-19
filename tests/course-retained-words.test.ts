import test from 'node:test'
import assert from 'node:assert/strict'
import {markCourseDeleted,loadCourseLifecycle} from '../packages/content_schema/course-lifecycle'
import {queryWordbook} from '../src/services/content/WordbookQueryBuilder'
import {wordById,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {occurrences} from '../src/services/content/IdentityModel'
import {lifecyclePack} from './helpers/lifecycle-fixture'
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>storage.set(k,v)}
test('删除后的旧查询快照不得返回专属词，其他教材词仍可查询',()=>{
 storage.clear();loadCourseRegistry();const b=lifecyclePack('cached-b','cat'),d=lifecyclePack('cached-d','dog')
 const index={words:[wordById.cat,wordById.dog],positions:[...occurrences(b),...occurrences(d)],cards:{},dueIds:[],favorites:[],mistakes:[],learnedIds:['cat','dog'],suggestions:[]}
 markCourseDeleted(b.courseId,[])
 const result=queryWordbook({scope:'learnedGlobal',currentCourseId:b.courseId,installedCourseIds:[b.courseId,d.courseId],category:'all',keyword:''},index)
 assert.deepEqual(result.rows.map(row=>row.id),['dog']);assert(![...result.positionsById.values()].flat().some(row=>row.courseId===b.courseId));storage.clear();loadCourseLifecycle()
})
