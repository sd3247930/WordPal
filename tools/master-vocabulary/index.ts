import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {normalizePrimaryCsv} from './normalize'
import {loadCourseRegistry,words} from '../../packages/content_schema/registry'
import {validateCourse} from '../../packages/content_schema/course'
import {sha256} from '../../src/services/content/digest'
import {makeZip,readZip} from '../../src/services/course-import/ZipImporter'
const revision='5dd252c7df0e69876442492814428c5fc6d63880'
const pinnedDigest='deba68b478ce32cd36d61c450e0021c15d61d4a60374020ee38db081d88b20db'
const args=process.argv.slice(2),value=(name:string)=>args[args.indexOf(name)+1]
if(args.includes('--help')){console.log('主词库本机导入：npm run vocabulary:import -- --local-use [--file <CSV>] [--revision <commit>] [--qa-directory <directory>]\n需要已安装的离线英语系统语音；输出位于被忽略的本机内容与 private 目录。');process.exit(0)}
if(!args.includes('--local-use'))throw new Error('此来源的教材再分发许可未确认。请用 --local-use 声明只供本机学习。')
let text:string
if(args.includes('--file'))text=readFileSync(value('--file'),'utf8')
else{
 const scratch=mkdtempSync(join(tmpdir(),'wordpal-vocabulary-'))
 const payload=execFileSync('gh',['api','repos/billyjr/pep-english-vocabulary/contents/public/data/pep_english_vocabulary_full.csv?ref='+revision],{encoding:'utf8',maxBuffer:8*1024*1024})
 text=Buffer.from(JSON.parse(payload).content,'base64').toString('utf8');writeFileSync(join(scratch,'source.csv'),text)
}
loadCourseRegistry()
const sourceRevision=args.includes('--revision')?value('--revision'):sha256(text)===pinnedDigest?revision:'local-csv-'+sha256(text).slice(0,16)
const {courses,audit}=normalizePrimaryCsv(text,sourceRevision,words)
if(sourceRevision.startsWith('local-csv-'))for(const pack of courses){delete pack.sources[0].url;pack.sources[0].attribution='用户提供的同格式小学词汇索引；教材版次与外部仓库归属均未核对'}
const privateDirectory='private/master-vocabulary',audioDirectory='src/static/local-master-audio'
for(const dir of [privateDirectory,privateDirectory+'/courses','src/content/local-courses',audioDirectory])mkdirSync(dir,{recursive:true})
const jobs=[...new Map(courses.flatMap(c=>c.vocabulary).filter(w=>!w.audio).map(w=>{const lemma=w.lemma.toLowerCase();return [lemma,{id:sha256(lemma).slice(0,20),text:w.lemma}]})).values()]
writeFileSync(privateDirectory+'/audio-jobs.json',JSON.stringify(jobs,null,2)+'\n')
console.log('已规范化 '+audit.sourceRows+' 行，正在生成或复用 '+jobs.length+' 个离线英语片段。')
execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File','tools/master-vocabulary/generate-audio.ps1'],{stdio:'inherit'})
let mediaBytes=0
const clips=new Map(jobs.map(job=>{const bytes=new Uint8Array(readFileSync(audioDirectory+'/'+job.id+'.wav'));if(Buffer.from(bytes.subarray(0,4)).toString()!=='RIFF'||Buffer.from(bytes.subarray(8,12)).toString()!=='WAVE'||bytes.length<44)throw new Error('离线音频无效：'+job.id);mediaBytes+=bytes.length;return [job.id,{bytes,hash:sha256(bytes)}]}))
for(const pack of courses){
 const files:Record<string,Uint8Array>={}
 if(pack.vocabulary.some(w=>w.audio||w.example||w.phonics?.length))pack.sources.push({id:'wordpal-original-audio',type:'author-created',rightsStatus:'redistribution-approved',attribution:'复用 WordPal 原创启蒙与小学教学示例中的例句、审核拼读和音频',revision:'starter-1',textLicense:'原创教学示例；非特定出版社教材，可在本项目中使用。',audioLicense:'随项目原创启蒙音频使用声明'})
 pack.sources.push({id:'offline-system-audio',type:'author-created',rightsStatus:'private-use-declared',attribution:'本机离线英语系统语音生成；en-US，未声明为真人录音',revision:'system-en-us-rate-minus-one-v1',textLicense:'无新增文本',audioLicense:'仅本机学习；系统语音再分发权利未审核'})
 for(const entry of pack.vocabulary){
  if(entry.audio){const name=entry.audio.split('/').pop()!,bytes=new Uint8Array(readFileSync('src'+entry.audio)),assetId='original-'+name.replace(/\.wav$/,'');pack.assets.push({id:assetId,path:'audio/'+name,mediaType:'audio/wav',bytes:bytes.length,sha256:sha256(bytes),sourceId:'wordpal-original-audio',license:'随项目原创启蒙音频使用声明'});files['audio/'+name]=bytes;entry.assetRefs={...entry.assetRefs,audio:assetId};continue}
  const id=sha256(entry.lemma.toLowerCase()).slice(0,20),clip=clips.get(id)!,assetId='voice-'+id,path='audio/'+id+'.wav'
  if(!pack.assets.some(a=>a.id===assetId))pack.assets.push({id:assetId,path,mediaType:'audio/wav',bytes:clip.bytes.length,sha256:clip.hash,sourceId:'offline-system-audio',license:'离线 en-US 系统语音，仅本机使用'})
  entry.assetRefs={...entry.assetRefs,audio:assetId};entry.audioUS='/static/local-master-audio/'+id+'.wav';entry.tags=[...(entry.tags||[]),'offline-system-en-us'];files[path]=clip.bytes
 }
 const issues=validateCourse(pack);if(issues.length)throw new Error(pack.courseId+'：'+issues[0].message)
 writeFileSync(privateDirectory+'/courses/'+pack.courseId+'.json',JSON.stringify(pack,null,2)+'\n')
 // Local portable packs are never eligible for the public export route.
 const zip=makeZip(pack,files);readZip(zip);writeFileSync(privateDirectory+'/courses/'+pack.courseId+'.zip',zip)
}
const qa:unknown[]=[]
if(args.includes('--qa-directory'))for(const pack of courses.filter(c=>c.grade!>=3)){
 const path=join(value('--qa-directory'),'pep-primary-g'+pack.grade+'-s'+(pack.semester==='上册'?1:2)+'.json')
 if(!existsSync(path))continue
 const comparison=JSON.parse(readFileSync(path,'utf8')),reference=new Set<string>(comparison.units.flatMap((u:any)=>u.words.map((w:any)=>w.en.trim().toLowerCase())))
 qa.push({courseId:pack.courseId,reference:'cyforkk/pep-english-words · PEP 三年级起点，仅核对',referenceUnique:reference.size,referenceSha256:sha256(readFileSync(path,'utf8')),matching:pack.vocabulary.filter(w=>reference.has(w.lemma.toLowerCase())).length,warning:'仅按英文重合核对，不证明版次、中文释义或单元归属一致'})
 const mdPath=join(value('--qa-directory'),'jinronga-g'+pack.grade+'-s'+(pack.semester==='上册'?1:2)+'.md')
 if(existsSync(mdPath)){
  const rows=readFileSync(mdPath,'utf8').split(/\r?\n/).filter(line=>/^\|\s*\d+\s*\|/.test(line)).map(line=>line.split('|').slice(1,-1).map(cell=>cell.trim())),lemmas=new Set(rows.map(row=>row[1].toLowerCase()))
  qa.push({courseId:pack.courseId,reference:'jinronga/english-words · 仅交叉校验',referenceUnique:lemmas.size,referenceSha256:sha256(readFileSync(mdPath,'utf8')),exampleRows:rows.length,matching:pack.vocabulary.filter(w=>lemmas.has(w.lemma.toLowerCase())).length,missingReferenceUK:rows.filter(row=>!row[2]||row[2]==='-').length,missingReferenceUS:rows.filter(row=>!row[3]||row[3]==='-').length,warning:'未从该参考源复制音标、释义或例句；许可待核对'})
 }
}
const entries=courses.flatMap(c=>c.vocabulary),report={revision:sourceRevision,sourceSha256:sha256(text),...audit,uniqueSenseIds:new Set(entries.map(w=>w.id)).size,uniqueEnglish:new Set(entries.map(w=>w.lemma.toLowerCase())).size,offlineClips:jobs.length,offlineBytes:mediaBytes,resourceGaps:{ipa:entries.filter(w=>!w.ipa).length,phonics:entries.filter(w=>!w.phonics?.length).length,examples:entries.filter(w=>!w.example&&!w.examples?.length).length,wordImages:entries.filter(w=>!w.image&&!w.assetRefs?.image).length,ukAudio:entries.filter(w=>!w.audioUK).length},qa,rights:'来源和生成音频仅本机使用；教材系列、起始年级、年份与再分发许可待核对；不宣称 PEP 三年级起点官方词库。'}
// Activate only after every course, media digest and portable package has passed.
writeFileSync('src/content/local-courses/catalog.json',JSON.stringify(courses)+'\n')
writeFileSync(privateDirectory+'/import-audit.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({rows:audit.sourceRows,courses:courses.length,units:courses.reduce((n,c)=>n+c.units.length,0),lessons:audit.books.reduce((n,b)=>n+b.lessons,0),uniqueSenseIds:report.uniqueSenseIds,uniqueEnglish:report.uniqueEnglish,clips:jobs.length,repairs:audit.repairs.length,resourceGaps:report.resourceGaps},null,2))
