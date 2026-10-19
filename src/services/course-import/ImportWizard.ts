import {strToU8} from 'fflate'
import {validateCourse,type CoursePack,type SourceRecord,type Issue,type VocabularyEntry} from '../../../packages/content_schema/course'
import type {Word} from '../../../packages/core_learning'
import {sha256} from '../content/digest'
import {cleanCourseLabel} from '../course/CourseSelection'
import {wordIdentityMatches} from '../content/ContentRegistry'
export interface ImportMetadata {courseId:string;title:string;contentVersion?:string;route:CoursePack['route'];level:string;publisher?:string;editionYear?:number;edition?:string;startGrade?:1|3|null;grade?:number;semester?:string;sourceType:SourceRecord['type'];sourceNote:string;declared:boolean}
export interface ImportPreview {pack:CoursePack|null;issues:Issue[];duplicates:number;reuse:Record<string,string>;newCount:number;missingAudio:number;missingPhonics:number;missingImages:number;digest:string}
export const defaultImportMetadata=():ImportMetadata=>({courseId:'my-course',title:'我的自编课程',contentVersion:'1.0.0',route:'theme',level:'L1',sourceType:'user-provided',sourceNote:'家长提供的本机私用词表',declared:false})
export function parseCsv(text:string){
 const rows:{values:string[];line:number}[]=[],values:string[]=[];let value='',quoted=false,line=1,rowLine=1
 const input=text.replace(/^\uFEFF/,'')
 for(let i=0;i<=input.length;i++){
  const c=input[i]
  if(quoted){if(c==='"'&&input[i+1]==='"'){value+='"';i++}else if(c==='"')quoted=false;else{if(c===undefined)throw new Error('CSV 引号未闭合，请检查第 '+rowLine+' 行。');value+=c;if(c==='\n')line++}}
  else if(c==='"'){if(value.trim())throw new Error('CSV 引号前有意外内容，第 '+line+' 行。');quoted=true}
  else if(c===','||c==='\n'||c===undefined){values.push(value.trim());value='';if(c!==','){if(values.some(v=>v))rows.push({values:[...values],line:rowLine});values.length=0;if(c==='\n')line++;rowLine=line}}
  else if(c!=='\r')value+=c
 }
 return rows
}
const aliases:Record<string,string>={lemma:'word',english:'word',meaningzh:'meaning',translation:'meaning',phonetic:'ipa',example_sentence:'example',audio:'audio_ref',image:'image_ref'}
const safeId=(value:string)=>value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
// Plain tables have no editable metadata form. Keep explicit IDs, otherwise derive
// a repeatable identity from the table rather than overwriting every import.
export function inferImportMetadata(text:string,format:'json'|'csv'|'markdown',filename='',mapping:Record<string,string>={}):ImportMetadata{
 const meta=defaultImportMetadata()
 if(format==='json')return meta // Structured packages retain their own metadata.
 const rows=parseCsv(format==='markdown'?markdownToCsv(text):text)
 const header=(rows.shift()?.values||[]).map(key=>mapping[key]||aliases[key.toLowerCase()]||key.toLowerCase())
 const idColumn=header.indexOf('course_id'),ids=[...new Set(rows.map(row=>idColumn<0?'':row.values[idColumn]).filter(Boolean))]
 if(ids.length>1)throw new Error('词表中包含多个课程 ID，请按课程分别导入。')
 const canonical=rows.map(row=>JSON.stringify(row.values)).sort().join('\n')
 meta.courseId=ids[0]||'import-'+sha256(JSON.stringify(header)+'\n'+canonical).slice(0,16)
 const name=filename.replace(/^.*[\\/]/,'').replace(/\.(csv|md)$/i,'').trim()
 if(name&&name!=='CSV 模板')meta.title=cleanCourseLabel(name)
 return meta
}
export function csvToCourse(text:string,meta:ImportMetadata,mapping:Record<string,string>={}){
 const rows=parseCsv(text),header=(rows.shift()?.values||[]).map(key=>mapping[key]||aliases[key.toLowerCase()]||key.toLowerCase())
 if(!header.includes('word')||!header.includes('meaning'))throw new Error('表头必须包含 word、meaning；可先映射英文字段与中文词义字段。')
 const sourceId=safeId(meta.courseId)+'-source',vocabulary:VocabularyEntry[]=[],units:CoursePack['units']=[],entries=new Map<string,VocabularyEntry>(),lines:number[]=[];let duplicates=0
 for(const row of rows){
  if(row.values.length!==header.length)throw new Error('CSV 第 '+row.line+' 行列数与表头不同，请把含逗号的内容用双引号包围。')
  const data=Object.fromEntries(header.map((key,i)=>[key,row.values[i]||''])),lemma=data.word.normalize('NFC').trim(),meaning=data.meaning.trim()
  const sourceWordId=data.word_id||data.id||safeId(lemma)+'-'+sha256(lemma.toLowerCase()+'|'+meaning+'|'+(data.pos||'')+'|'+(data.sense_id||'')).slice(0,8)
  const identity=[lemma.toLowerCase(),data.pos||'',meaning].join('|'),old=entries.get(identity)
  const id=old?.id||data.word_id||data.id||'en-'+safeId(meta.courseId)+'-'+sourceWordId
  const entry:VocabularyEntry={id,language:'en',lemma,meaning,pos:data.pos||'',ipa:data.ipa||'',example:data.example||'',sourceId,sourceWordId,senseId:data.sense_id||id,acceptedSpellings:data.accepted_spellings?data.accepted_spellings.split(';').map(v=>v.trim()).filter(Boolean):undefined,...(data.audio_ref||data.image_ref?{assetRefs:{...(data.audio_ref?{audio:data.audio_ref}:{}),...(data.image_ref?{image:data.image_ref}:{})}}:{})}
  if(old)duplicates++;else{entries.set(identity,entry);vocabulary.push(entry);lines.push(row.line)}
  const unitId=data.unit_id||'u01',lessonId=data.lesson_id||'l01';let unit=units.find(u=>u.id===unitId);if(!unit){unit={id:unitId,title:data.unit_title||'自编单元',lessons:[]};units.push(unit)}
  let lesson=unit.lessons.find(l=>l.id===lessonId);if(!lesson){lesson={id:lessonId,title:data.lesson_title||'自编课节',wordIds:[],activities:['flash','connect','spell']};unit.lessons.push(lesson)}if(!lesson.wordIds.includes(id))lesson.wordIds.push(id)
 }
 const pack:CoursePack={schemaVersion:2,courseId:meta.courseId,contentVersion:meta.contentVersion||'1.0.0',title:meta.title,route:meta.route,abilityLevels:[meta.level],publisher:meta.publisher||null,editionYear:meta.editionYear||null,...(meta.edition?{edition:meta.edition}:{}),...(meta.startGrade!==undefined?{startGrade:meta.startGrade}:{}),grade:meta.grade||null,semester:meta.semester||null,sources:[{id:sourceId,type:meta.sourceType,rightsStatus:meta.declared?'private-use-declared':'pending-review',attribution:meta.sourceNote,revision:sha256(text),declaredAt:meta.declared?new Date().toISOString():undefined}],vocabulary,units,assets:[]}
 return {pack,duplicates,lines}
}
export function markdownToCsv(text:string){
 if(/<\/?\w|javascript:/i.test(text))throw new Error('受控 Markdown 只接受元信息和文本词表，不接受 HTML。')
 const lines=text.split(/\r?\n/).filter(l=>/^\s*\|/.test(l)),table=lines.map(l=>l.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(v=>v.trim().replace(/\\\|/g,'|'))).filter(row=>!row.every(v=>/^:?-+:?$/.test(v)))
 if(table.length<2)throw new Error('Markdown 需要固定表头的词表。')
 return table.map(row=>row.map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\n')
}
function markdownRowLines(text:string){return text.split(/\r?\n/).map((line,index)=>({line,index:index+1})).filter(item=>/^\s*\|/.test(item.line)&&!item.line.trim().replace(/^\||\|$/g,'').split('|').every(cell=>/^:?-+:?$/.test(cell.trim()))).map(item=>item.index)}
export function previewImport(text:string,format:'json'|'csv'|'markdown',meta:ImportMetadata,existing:Record<string,Word>,mapping:Record<string,string>={}):ImportPreview{
 const preview:ImportPreview={pack:null,issues:[],duplicates:0,reuse:{},newCount:0,missingAudio:0,missingPhonics:0,missingImages:0,digest:sha256(text)}
 if(strToU8(text).length>2*1024*1024){preview.issues.push({severity:'error',line:1,field:'size',message:'文本超过 2 MiB。',fix:'拆分课程。'});return preview}
 try{
  let rowLines:number[]=[]
  if(format==='json')preview.pack=JSON.parse(text.replace(/^\uFEFF/,'')) as CoursePack
  else{const parsed=csvToCourse(format==='markdown'?markdownToCsv(text):text,meta,mapping);preview.pack=parsed.pack;preview.duplicates=parsed.duplicates;const markdownLines=format==='markdown'?markdownRowLines(text):[];rowLines=parsed.lines.map(line=>markdownLines[line-1]||line)}
  const pack=preview.pack
  if(!pack||typeof pack!=='object')throw new Error('课程 JSON 必须为对象。')
  if(typeof pack.title==='string')pack.title=cleanCourseLabel(pack.title)
  if(typeof pack.edition==='string')pack.edition=cleanCourseLabel(pack.edition)
  // The parent declaration authorizes local use; it never grants publication permission.
  if(meta.declared&&Array.isArray(pack.sources))pack.sources=pack.sources.map(source=>({...source,rightsStatus:source.rightsStatus==='redistribution-approved'?source.rightsStatus:'private-use-declared',declaredAt:new Date().toISOString(),fileSha256:preview.digest}))
  preview.issues=validateCourse(pack).map(issue=>({...issue,line:rowLines[issue.line-2]||issue.line}))
  if(!preview.issues.some(i=>i.severity==='error'))for(const [i,entry]of pack.vocabulary.entries()){
   const collision=existing[entry.id]
   if(collision&&!wordIdentityMatches(collision,{word:entry.lemma,meaning:entry.meaning,pos:entry.pos||''}))preview.issues.push({severity:'error',line:rowLines[i]||i+2,field:'id',message:'已有 ID 对应另一个词义或词性。',fix:'给新词义换一个稳定 ID。'})
   const candidate=Object.values(existing).find(w=>wordIdentityMatches(w,{word:entry.lemma,meaning:entry.meaning,pos:entry.pos||''}))
   if(candidate)preview.reuse[entry.id]=candidate.id;else preview.newCount++
   if(!entry.audio&&!entry.assetRefs?.audio&&!candidate?.audio)preview.missingAudio++
   if(!entry.image&&!entry.assetRefs?.image)preview.missingImages++
   if(!entry.phonics?.length)preview.missingPhonics++
  }
 }catch(error){preview.pack=null;preview.issues.push({severity:'error',line:1,field:'input',message:(error as Error).message,fix:'修正输入后重新预览。'})}
 return preview
}
export const csvTemplate='course_id,unit_id,unit_title,lesson_id,lesson_title,word,meaning,pos,ipa,example\nmy-course,u01,动物朋友,l01,认识动物,cat,猫,n.,/kæt/,The cat is on the mat.\nmy-course,u01,动物朋友,l01,认识动物,dog,狗,n.,/dɒɡ/,I see a dog.\n'
