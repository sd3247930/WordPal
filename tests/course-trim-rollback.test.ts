import test from 'node:test'
import {createPinia,setActivePinia} from 'pinia'
import assert from 'node:assert/strict'
import {trimCourseSource} from '../src/services/course/CourseSourceTrimmer'
import {retainDescriptor} from '../src/services/content/CourseDirectory'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {getCourseWord,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {isUserDeleted} from '../packages/content_schema/course-lifecycle'
import {lifecyclePack} from './helpers/lifecycle-fixture'
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,data:string)=>storage.set(key,data),removeStorageSync:(key:string)=>storage.delete(key)}
test('旧残留裁剪后只能明确重新导入恢复教材，专属保留词条不会自动恢复',async()=>{
 storage.clear();loadCourseRegistry();setActivePinia(createPinia());const pack=lifecyclePack('trim-reimport')
 retainDescriptor(pack);storage.set('wordpal.content.installation.v1',JSON.stringify({[pack.courseId]:'notInstalled'}))
 const result=await trimCourseSource(pack.courseId);assert(result.ok);assert(isUserDeleted(pack.courseId));assert.equal(getCourseWord(pack.courseId,'trim-reimport-word'),undefined)
 await installTextCourse(pack);assert(!isUserDeleted(pack.courseId));assert(getCourseWord(pack.courseId,'trim-reimport-word'))
})
