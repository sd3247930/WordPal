import nodeTest from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
// 本机课程目录被裁剪后，针对已移除教材的内容用例自动跳过（内容源为空时不再有意义）。
const contentTrimmed=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')||'[]').length===0
const test=(name:string,fn:any)=>nodeTest(name,{skip:contentTrimmed?'本机课程目录已裁剪（教材已移除）':false},fn)
const catalog=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8'))
const g5b=catalog.find((item:any)=>item.courseId==='fltrp-3start-g5b')

test('g5b：113 词全部挂上音频与图片，总量在课程包限制内',()=>{
 assert.equal(g5b.vocabulary.length,113)
 assert.equal(g5b.assets.length,226)
 const ids=new Set<string>(g5b.assets.map((asset:any)=>asset.id))
 for(const word of g5b.vocabulary){
  assert.ok(word.assetRefs?.audio&&ids.has(word.assetRefs.audio),word.lemma+' 缺音频引用')
  assert.ok(word.assetRefs?.image&&ids.has(word.assetRefs.image),word.lemma+' 缺图片引用')
 }
 const total=g5b.assets.reduce((sum:number,asset:any)=>sum+asset.bytes,0)
 assert.ok(total<50*1024*1024,'媒体总量超 50 MiB')
 for(const asset of g5b.assets){
  assert.ok(asset.bytes<=5*1024*1024,asset.path+' 单文件超 5 MiB')
  assert.ok(existsSync('src/static/local-course-media/'+asset.path),asset.path+' 文件缺失')
  if(asset.mediaType==='image/webp')assert.ok(asset.bytes<=120*1024,asset.path+' 超过 120 KB')
 }
})
