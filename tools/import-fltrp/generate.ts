import {createHash} from 'node:crypto'
import {validateCourse,type CoursePack,type VocabularyEntry} from '../../packages/content_schema/course'

export const BOOKS = [
 {key:'g3a',grade:3,semester:'上册',level:'L1'},
 {key:'g3b',grade:3,semester:'下册',level:'L2'},
 {key:'g4a',grade:4,semester:'上册',level:'L3'},
 {key:'g4b',grade:4,semester:'下册',level:'L4'},
 {key:'g5a',grade:5,semester:'上册',level:'L4'},
 {key:'g5b',grade:5,semester:'下册',level:'L5'}
] as const
export type BookKey=typeof BOOKS[number]['key']
export interface ExtractedRow {image:number;book:BookKey;unit:string;lemma:string;meaning:string;verified:boolean;note?:string}
export interface Extraction {schemaVersion:1;series:string;editionYear:null;entries:ExtractedRow[]}
export interface Occurrence {image:number;book:BookKey;unit:string;row:number;wordId:string;lemma:string}
export interface ImportAudit {visible:number;deferred:ExtractedRow[];occurrences:Occurrence[];books:{courseId:string;words:number;units:number;lessons:number;shortUnits:string[]}[]}
const digest=(value:string)=>createHash('sha256').update(value).digest('hex')
const key=(lemma:string,meaning:string)=>lemma.trim().toLowerCase()+'|'+meaning.trim()
const slug=(lemma:string)=>lemma.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'word'

/** Preserve page order; balance lessons so a 16-word unit becomes 8 + 8. */
export function splitLessons(ids:string[]):string[][] {
 if(!ids.length)return []
 const count=Math.ceil(ids.length/15),size=Math.floor(ids.length/count),extra=ids.length%count
 let offset=0
 return Array.from({length:count},(_,index)=>{const n=size+(index<extra?1:0),part=ids.slice(offset,offset+n);offset+=n;return part})
}

/** Pure text import. Reuse an existing ID only for an exact, unambiguous word meaning. */
export function generateCourses(raw:Extraction,trusted:VocabularyEntry[]=[]):{courses:CoursePack[];audit:ImportAudit} {
 if(raw.schemaVersion!==1||!Array.isArray(raw.entries)||!raw.entries.length)throw new Error('提取清单为空或版本错误。')
 const known=new Map<string,Map<string,VocabularyEntry>>()
 for(const word of trusted){const k=key(word.lemma,word.meaning);if(!known.has(k))known.set(k,new Map());known.get(k)!.set(word.id,word)}
 const audit:ImportAudit={visible:raw.entries.length,deferred:[],occurrences:[],books:[]}
 for(const row of raw.entries){if(!BOOKS.some(b=>b.key===row.book)||!Number.isInteger(row.image)||row.image<24||row.image>35||!(/^(welcome|[1-6])$/).test(row.unit)||!row.lemma.trim())throw new Error('提取行的图片、册次、单元或英文无效。');if(row.verified&&!row.meaning.trim())throw new Error('确认词条缺少中文释义。');if(!row.verified)audit.deferred.push(row)}
 const courses:CoursePack[]=[]
 for(const meta of BOOKS){
  const rows=raw.entries.filter(row=>row.book===meta.key&&row.verified)
  if(!rows.length)throw new Error(meta.key+' 没有可用词条，不能补造课程。')
  const courseId='fltrp-3start-'+meta.key,sourceId='fltrp-images-'+meta.key
  const pack:CoursePack={schemaVersion:2,courseId,contentVersion:'0.1.0',title:'外研版三起点 '+meta.grade+'年级'+meta.semester+'（待核对）',route:'textbook',abilityLevels:[meta.level],grade:meta.grade,semester:meta.semester,publisher:'外语教学与研究出版社',editionYear:null,edition:'三年级起点 · 版次待核对 · 仅收录可见词表',startGrade:3,sources:[{id:sourceId,type:'user-provided',rightsStatus:'pending-review',attribution:'用户提供的词表照片文字提取；册次依用户映射，封面、版次、单元完整性及再分发权利均待核对。未收录照片或出版社录音。',revision:'extraction-'+digest(JSON.stringify(rows)).slice(0,16),textLicense:null,audioLicense:null,imageLicense:null}],vocabulary:[],units:[],assets:[]}
  const perUnit=new Map<string,string[]>()
  for(const [index,row] of rows.entries()){
   const candidates=[...(known.get(key(row.lemma,row.meaning))?.values()||[])],existing=candidates.length===1?candidates[0]:undefined
   const id=existing?.id||'en-'+slug(row.lemma)+'-'+digest(key(row.lemma,row.meaning)).slice(0,12)
   if(!pack.vocabulary.some(word=>word.id===id))pack.vocabulary.push({id,language:'en',lemma:row.lemma.trim(),meaning:row.meaning.trim(),...(existing?.pos?{pos:existing.pos}:{}),senseId:existing?.senseId||id,sourceId,sourceWordId:'img-'+row.image+'-'+row.unit+'-'+String(index+1).padStart(3,'0'),order:index+1,learningLevel:Number(meta.level.slice(1)),tags:['fltrp-3start','source-needs-review',...(row.note?['transcription-note']:[])]})
   if(!perUnit.has(row.unit))perUnit.set(row.unit,[])
   const ids=perUnit.get(row.unit)!;if(!ids.includes(id))ids.push(id)
   audit.occurrences.push({image:row.image,book:row.book,unit:row.unit,row:index+1,wordId:id,lemma:row.lemma})
  }
  const units=[...perUnit].sort(([a],[b])=>(a==='welcome'?0:+a)-(b==='welcome'?0:+b))
  for(const [unit,ids] of units){
   const uid=unit==='welcome'?'welcome':'unit-'+unit,title=unit==='welcome'?'Welcome':'Unit '+unit+(meta.key==='g3b'&&unit==='4'?'（续页）':'')
   pack.units.push({id:uid,title,order:unit==='welcome'?1:+unit+1,lessons:splitLessons(ids).map((wordIds,index)=>({id:uid+'-lesson-'+(index+1),title:title+' · 第 '+(index+1)+' 课',wordIds,activities:['flash','connect','listen','spell','dictation']}))})
  }
  const errors=validateCourse(pack).filter(issue=>issue.severity==='error')
  if(errors.length)throw new Error(courseId+'：'+errors.map(e=>e.message).join('；'))
  audit.books.push({courseId,words:pack.vocabulary.length,units:pack.units.length,lessons:pack.units.reduce((n,u)=>n+u.lessons.length,0),shortUnits:units.filter(([,ids])=>ids.length<8).map(([u])=>u)})
  courses.push(pack)
 }
 return {courses,audit}
}
