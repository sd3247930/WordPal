import nodeTest from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sha256} from '../src/services/content/digest'
// 本机课程目录被裁剪后，针对已移除教材的内容用例自动跳过（内容源为空时不再有意义）。
const contentTrimmed=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')||'[]').length===0
const test=(name:string,fn:any)=>nodeTest(name,{skip:contentTrimmed?'本机课程目录已裁剪（教材已移除）':false},fn)
const g5b=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')).find((item:any)=>item.courseId==='fltrp-3start-g5b')

test('g5b：每个资源的 SHA256 与磁盘文件一致',()=>{
 assert.equal(g5b.assets.length,226)
 for(const asset of g5b.assets){
  const bytes=new Uint8Array(readFileSync('src/static/local-course-media/'+asset.path))
  assert.equal(sha256(bytes),asset.sha256,asset.path)
 }
})
