/**
 * 把本机课程的"按词拆课"合并为"每 Unit 一个课节"（方案 A：不改数据结构）。
 * 用法：npx tsx tools/merge-course-lessons/index.ts --course fltrp-3start-g5a
 */
import {readFileSync,writeFileSync} from 'node:fs'
import {validateCourse,type CoursePack} from '../../packages/content_schema/course'

const args=process.argv.slice(2)
const courseId=args[args.indexOf('--course')+1]
const catalogPath='src/content/local-courses/catalog.json'
const catalog=JSON.parse(readFileSync(catalogPath,'utf8')) as CoursePack[]
const pack=catalog.find(item=>item.courseId===courseId)
if(!pack)throw new Error('课程不存在：'+courseId)

let before=0,after=0
for(const unit of pack.units){
 const wordIds=[...new Set(unit.lessons.flatMap(lesson=>lesson.wordIds))]
 before+=unit.lessons.length
 unit.lessons=[{id:unit.id,title:unit.title,wordIds,activities:unit.lessons[0]?.activities}]
 after+=unit.lessons.length
}
const issues=validateCourse(pack)
if(issues.length)throw new Error('课程校验未通过：'+issues.map(issue=>issue.field+':'+issue.message).join(' / '))
writeFileSync(catalogPath,JSON.stringify(catalog)+'\n')
console.log(JSON.stringify({course:courseId,units:pack.units.length,lessonsBefore:before,lessonsAfter:after,words:pack.vocabulary.length,issues:issues.length}))
