import nodeTest from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getCourseLessons} from '../src/services/content/ContentRegistry'
import {loadCourseRegistry,configureLocalCourses} from '../src/services/content/ContentRegistry'
import type {CoursePack} from '../packages/content_schema/course'
// 本机课程目录被裁剪后，针对已移除教材的内容用例自动跳过（内容源为空时不再有意义）。
const contentTrimmed=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')||'[]').length===0
const test=(name:string,fn:any)=>nodeTest(name,{skip:contentTrimmed?'本机课程目录已裁剪（教材已移除）':false},fn)
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value)}
const catalog=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')) as CoursePack[]

test('合并课程：lessonIndex 等价于单元索引；未合并课程不受影响',()=>{
 configureLocalCourses(catalog)
 loadCourseRegistry()
 const g5a=catalog.find(item=>item.courseId==='fltrp-3start-g5a')!
 const lessons=getCourseLessons('fltrp-3start-g5a')
 assert.equal(lessons.length,g5a.units.length)
 g5a.units.forEach((unit,index)=>{
  assert.equal(lessons[index].id,unit.id)
  assert.equal(lessons[index].unitId,unit.id)
  assert.deepEqual(lessons[index].wordIds,unit.lessons[0].wordIds)
 })
 // 未合并的课程（如 starter）仍是多课节，单元索引与课节索引不必相等
 const starter=getCourseLessons('starter')
 assert.ok(starter.length>0)
 assert.notEqual(starter[0].id,starter[0].unitId)
})
