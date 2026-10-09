import {validateCourse,type CoursePack} from '../../packages/content_schema/course'
import {BOOKS} from './generate'

/** Cross-pack invariants, in addition to the existing strict schema. */
export function validateBundles(courses:CoursePack[]):string[] {
 const issues:string[]=[],words=new Map<string,string>(),meanings=new Map<string,string>()
 if(courses.length!==6)issues.push('必须有六册，不能以空包替代。')
 for(const meta of BOOKS)if(!courses.some(p=>p.courseId==='fltrp-3start-'+meta.key))issues.push('缺少 '+meta.key)
 for(const pack of courses){
  issues.push(...validateCourse(pack).filter(i=>i.severity==='error').map(i=>pack.courseId+' '+i.message))
  if(pack.sources.some(s=>s.rightsStatus!=='pending-review'))issues.push(pack.courseId+' 不得自动升级许可。')
  if(pack.editionYear!==null||pack.assets.length)issues.push(pack.courseId+' 不得补造版次或导入原图资产。')
  for(const word of pack.vocabulary){const k=word.lemma.toLowerCase()+'|'+word.meaning+'|'+(word.pos||''),old=words.get(word.id);if(old&&old!==k)issues.push('同 ID 对应不同词义：'+word.id);words.set(word.id,k);const id=meanings.get(k);if(id&&id!==word.id)issues.push('跨册同词同义未去重：'+word.lemma);meanings.set(k,word.id)}
  const orders=pack.units.map(u=>u.order||0);if(orders.some((v,i)=>i>0&&v<orders[i-1]))issues.push(pack.courseId+' 单元顺序错误。')
  for(const unit of pack.units){const size=unit.lessons.reduce((n,l)=>n+l.wordIds.length,0);for(const lesson of unit.lessons)if(lesson.wordIds.length>15||(size>=8&&lesson.wordIds.length<8))issues.push(pack.courseId+' 课节大小错误。')}
 }
 return issues
}
