import test from 'node:test'
import assert from 'node:assert/strict'
import {useBundledFixture} from './support/bundled-fixture'
import {loadCourseRegistry,getCourseWord,isCourseInstalled} from '../src/services/content/ContentRegistry'
import {uninstallCourseContent,enableBundledCourse} from '../src/services/content/StorageRepository'
import {courseDirectory,loadDirectory} from '../src/services/content/CourseDirectory'
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k)}
test('随包教材卸载后重扫不可发现、不可读；明确重新安装才恢复',async()=>{
 storage.clear();const pack=useBundledFixture('bundled-removal')
 await uninstallCourseContent(pack.courseId);loadCourseRegistry();loadDirectory()
 assert(!isCourseInstalled(pack.courseId));assert(!courseDirectory.value.some(row=>row.courseId===pack.courseId));assert.equal(getCourseWord(pack.courseId,pack.vocabulary[0].id),undefined)
 enableBundledCourse(pack.courseId);assert(isCourseInstalled(pack.courseId));assert(getCourseWord(pack.courseId,pack.vocabulary[0].id))
})
