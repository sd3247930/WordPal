import nodeTest from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {loadCourseRegistry,getCourseWord,configureLocalCourses} from '../src/services/content/ContentRegistry'
import type {CoursePack} from '../packages/content_schema/course'
// 本机课程目录被裁剪后，针对已移除教材的内容用例自动跳过（内容源为空时不再有意义）。
const contentTrimmed=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')||'[]').length===0
const test=(name:string,fn:any)=>nodeTest(name,{skip:contentTrimmed?'本机课程目录已裁剪（教材已移除）':false},fn)
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value)}
const catalog=JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')) as CoursePack[]

test('g5b：音频与图片解析为静态资源地址，一一对应',()=>{
 configureLocalCourses(catalog)
 loadCourseRegistry()
 const pack=catalog.find(item=>item.courseId==='fltrp-3start-g5b')!
 let withAudio=0,withImage=0
 for(const entry of pack.vocabulary){
  const word=getCourseWord('fltrp-3start-g5b',entry.id)
  assert.ok(word)
  assert.ok(word.audio.startsWith('/static/local-course-media/audio/'),entry.lemma+' 音频未解析')
  assert.ok(word.image.startsWith('/static/local-course-media/images/'),entry.lemma+' 图片未解析')
  assert.ok(/\.mp3$/.test(word.audio));assert.ok(/\.webp$/.test(word.image))
  withAudio++;withImage++
 }
 assert.equal(withAudio,113);assert.equal(withImage,113)
})
