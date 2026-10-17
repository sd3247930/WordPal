import test from 'node:test'
import assert from 'node:assert/strict'
import {courseDirectory,directoryCache,describeCourse} from '../src/services/content/CourseDirectory'
import {registerCourse,starterPack} from '../src/services/content/ContentRegistry'
import {cleanCourseLabel} from '../src/services/course/CourseSelection'
test('已安装新版教材隐藏旧目录占位，保留旧目录与不同学期',()=>{
 const pack={...structuredClone(starterPack),courseId:'fltrp-3start-g5a-u1-u6',title:'外研版三起点 五年级上册',route:'textbook' as const,publisher:'合成出版社',edition:'三年级起点',startGrade:3 as const,grade:5,semester:'上册'}
 registerCourse(pack)
 const old={...pack,courseId:'fltrp-3start-g5a',title:'外研版三起点 5年级上册（待核对）'}
 directoryCache[old.courseId]=describeCourse(old)
 directoryCache['fltrp-3start-g5b']=describeCourse({...old,courseId:'fltrp-3start-g5b',semester:'下册'})
 const visible=courseDirectory.value.filter(p=>p.courseId.startsWith('fltrp-3start-g5'))
 assert.deepEqual(visible.map(p=>p.courseId).sort(),['fltrp-3start-g5a-u1-u6','fltrp-3start-g5b'])
 assert.ok(directoryCache[old.courseId]);assert.equal(visible.some(p=>p.title.includes('待核对')),false)
 assert.equal(cleanCourseLabel('教材（待核对）'),'教材')
})
