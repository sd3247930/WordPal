import {parseCsv} from '../../src/services/course-import/ImportWizard'
import {validateCourse,type CoursePack,type VocabularyEntry} from '../../packages/content_schema/course'
import type {Word} from '../../packages/core_learning'
import {sha256} from '../../src/services/content/digest'
export interface ImportAudit {sourceRows:number;repairs:{line:number;reason:string}[];occurrences:{line:number;courseId:string;unitId:string;order:number;wordId:string}[];books:{courseId:string;rows:number;uniqueWords:number;units:number;lessons:number}[]}
const clean=(value:string)=>value.normalize('NFC').trim().replace(/\s+/g,' ')
export const lexicalKey=(lemma:string,meaning:string)=>clean(lemma).toLowerCase()+'|'+clean(meaning)
export function normalizePrimaryCsv(text:string,revision:string,trusted:Word[]=[]){
 const rows=parseCsv(text),header=rows.shift()?.values
 if(header?.join('|')!=='edition|grade|term|unit id|unit name|sn|english|chinese|phonetic')throw new Error('主词库 CSV 表头不匹配。')
 const audit:ImportAudit={sourceRows:rows.length,repairs:[],occurrences:[],books:[]},books=new Map<string,CoursePack>()
 const known=new Map<string,Word[]>();for(const word of trusted){const key=lexicalKey(word.word,word.meaning);known.set(key,[...(known.get(key)||[]),word])}
 for(const row of rows){
  if(row.values.length<8)throw new Error('第 '+row.line+' 行缺少英文或释义，不能猜测。')
  const [edition,gradeText,termText,unitText,unitName,orderText,english,chinese,...phonetic]=row.values
  const grade=Number(gradeText),term=Number(termText),unitOrder=Number(unitText),order=Number(orderText),lemma=clean(english),meaning=clean(chinese)
  if(!/^\d+$/.test(edition)||!Number.isInteger(grade)||grade<1||grade>6||![1,2].includes(term)||!Number.isInteger(unitOrder)||unitOrder<1||!Number.isInteger(order)||order<1||!lemma||!meaning||!unitName)throw new Error('第 '+row.line+' 行元信息不完整，未导入。')
  if(row.values.length!==9)audit.repairs.push({line:row.line,reason:row.values.length===8?'音标缺失，保留为空':'保留未转义的音标逗号，待人工核对'})
  const courseId='primary-community-e'+edition+'-g'+grade+'-s'+term,unitId='u'+String(unitOrder).padStart(2,'0'),level=Math.min(5,Math.max(1,grade-1))
  let pack=books.get(courseId)
  if(!pack){pack={schemaVersion:2,courseId,contentVersion:'1.0.0',title:'小学英语 · '+grade+'年级'+(term===1?'上册':'下册')+'（社区索引）',route:'textbook',publisher:'人教版社区索引（教材系列待核对）',edition:'社区 edition '+edition+'（年份待核对）',startGrade:null,editionYear:null,grade,semester:term===1?'上册':'下册',abilityLevels:['L'+level],sources:[{id:'community-index',type:'user-provided',rightsStatus:'private-use-declared',url:'https://github.com/billyjr/pep-english-vocabulary',revision,fileSha256:sha256(text),attribution:'社区小学词汇索引；教材版次和单元归属尚待核对，仅本机使用',textLicense:'README 声明 MIT，未提供 LICENSE 文件；教材编排没有明确再分发授权'}],vocabulary:[],units:[],assets:[]};books.set(courseId,pack)}
  const key=lexicalKey(lemma,meaning),candidates=known.get(key)||[],existing=candidates.length===1?candidates[0]:undefined,id=existing?.id||'en-primary-'+sha256(key).slice(0,20)
  let entry=pack.vocabulary.find(w=>w.id===id)
  if(!entry){entry={id,language:'en',lemma,meaning,pos:existing?.pos||'',sourceId:'community-index',sourceWordId:'e'+edition+'-g'+grade+'-s'+term+'-'+unitId+'-n'+order,senseId:id,order,learningLevel:level,ipa:phonetic.join(',').trim(),tags:['community-index',...(phonetic.length?['ipa-needs-review']:[])],...(existing?{example:existing.example,phonics:existing.phonics,phonemes:existing.phonemes,syllables:existing.syllables,audio:existing.audio,acceptedSpellings:existing.acceptedSpellings}: {})};pack.vocabulary.push(entry)}
  let unit=pack.units.find(u=>u.id===unitId);if(!unit){unit={id:unitId,title:'Unit '+unitOrder+' · '+clean(unitName),order:unitOrder,lessons:[]};pack.units.push(unit)}
  if(!unit.title.endsWith(clean(unitName)))throw new Error('第 '+row.line+' 行单元名称冲突。')
  audit.occurrences.push({line:row.line,courseId,unitId,order,wordId:id})
 }
 for(const pack of books.values()){
  pack.units.sort((a,b)=>a.order!-b.order!)
  for(const unit of pack.units){const ids=[...new Set(audit.occurrences.filter(o=>o.courseId===pack.courseId&&o.unitId===unit.id).sort((a,b)=>a.order-b.order||a.line-b.line).map(o=>o.wordId))];for(let offset=0;offset<ids.length;offset+=5){const n=offset/5+1;unit.lessons.push({id:unit.id+'-l'+String(n).padStart(2,'0'),title:unit.title+' · '+n,wordIds:ids.slice(offset,offset+5),activities:['flash','connect','listen','spell','dictation','letters','challenge','speed']})}}
  const issues=validateCourse(pack);if(issues.some(i=>i.severity==='error'))throw new Error(pack.courseId+' 校验失败：'+issues[0].message)
  audit.books.push({courseId:pack.courseId,rows:audit.occurrences.filter(o=>o.courseId===pack.courseId).length,uniqueWords:pack.vocabulary.length,units:pack.units.length,lessons:pack.units.reduce((n,u)=>n+u.lessons.length,0)})
 }
 return {courses:[...books.values()],audit}
}

