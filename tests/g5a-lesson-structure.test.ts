import nodeTest from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
// 本机课程目录被裁剪后，针对已移除教材的内容用例自动跳过（内容源为空时不再有意义）。
const contentTrimmed=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')||'[]').length===0
const test=(name:string,fn:any)=>nodeTest(name,{skip:contentTrimmed?'本机课程目录已裁剪（教材已移除）':false},fn)
const g5a=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')).find((item:any)=>item.courseId==='fltrp-3start-g5a')

test('g5a：每 Unit 一个课节，课节覆盖该单元全部单词',()=>{
 assert.equal(g5a.units.length,6)
 const vocabularyIds=new Set<string>(g5a.vocabulary.map((word:any)=>word.id))
 let counted=0
 for(const unit of g5a.units){
  assert.equal(unit.lessons.length,1,unit.id+' 应只有一个课节')
  const lesson=unit.lessons[0]
  assert.equal(lesson.id,unit.id,'课节 id 应与单元一致，便于 lessonIndex 直接表示单元索引')
  const ids=lesson.wordIds
  assert.equal(new Set(ids).size,ids.length,unit.id+' 课节内词条重复')
  for(const id of ids)assert.ok(vocabularyIds.has(id),unit.id+' 引用了未知词条 '+id)
  counted+=ids.length
 }
 assert.equal(counted,g5a.vocabulary.length,'课节词数应与词表总数一致')
})
