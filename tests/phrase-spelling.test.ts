import nodeTest from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {isCorrectSpelling,normalizeSpelling} from '../packages/phonics'
// 本机课程目录被裁剪后，针对已移除教材的内容用例自动跳过（内容源为空时不再有意义）。
const contentTrimmed=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')||'[]').length===0
const test=(name:string,fn:any)=>nodeTest(name,{skip:contentTrimmed?'本机课程目录已裁剪（教材已移除）':false},fn)
const g5b=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')).find((item:any)=>item.courseId==='fltrp-3start-g5b')
const phrases=(g5b?.vocabulary||[]).filter((word:any)=>/\s/.test(word.lemma))

test('g5b 含短语词条，拼写判分对空格与大小写宽容',()=>{
 assert.ok(phrases.length>=3,'应存在含空格的短语词条')
 for(const entry of phrases){
  const word={word:entry.lemma,acceptedSpellings:entry.acceptedSpellings} as any
  assert.equal(isCorrectSpelling(entry.lemma,word),true,entry.lemma)
  assert.equal(isCorrectSpelling('  '+entry.lemma.toUpperCase()+' ',word),true,entry.lemma+' 大写/空格应通过')
  assert.equal(isCorrectSpelling(entry.lemma.replace(/\s+/g,''),word),entry.lemma.replace(/\s+/g,'')===entry.lemma,entry.lemma+' 去空格仅在无空格时等价')
 }
 assert.equal(normalizeSpelling('  Food   Group '),'food group')
})
