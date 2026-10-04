import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'

const generatedDirs = new Set(['node_modules','.git','dist','build','unpackage','.hbuilderx','coverage','.nyc_output','.cache','.idea','.vscode','test-results','playwright-report','blob-report','test-output','test-artifacts','screenshots','tmp','temp','.tmp','.temp','__pycache__'])
const localDirs = new Set(['docs','private'])
const localTestOutputs = ['test-results','playwright-report','coverage','blob-report','test-output','test-artifacts']
const junk = /(?:\.(?:log|tmp|temp|bak|old|orig|swp|swo|pyc|pyo|tsbuildinfo|har)$|\.trace\.zip$|~$|^(?:\.DS_Store|Thumbs\.db|ehthumbs\.db|desktop\.ini)$)/i
const privateNames = /^(?:\.env(?:\..+)?|\.git-credentials|\.netrc|\.npmrc|\.pypirc|id_rsa|id_ed25519)$/i
const forbiddenBinary = /\.(?:pem|key|p12|pfx|jks|keystore|mobileprovision|crt|cer|apk|aab|ipa|exe|msi|dmg|sqlite3?|db|zip|7z|rar)$/i
const media = new Set(['.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg','.ico','.woff','.woff2','.ttf'])
// Reviewed public DCloud release IDs; only exempt version values in manifests.
const compilerBuildIds = new Set([['50204','20260813003'].join(''),['50206','20260917001'].join('')])
const rules = [
 ['credential assignment', /["']?\b(?:api[_-]?key|access[_-]?key|secret[_-]?key|app[_-]?secret|client[_-]?secret|private[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|_authToken|password|passwd|pwd|pin)\b["']?\s*[:=]\s*(["'])([^"'\r\n]+)\1/gi],
 ['numeric credential', /["']?\b(?:password|passwd|pwd|pin)\b["']?\s*[:=]\s*(\d+)/gi],
 ['unquoted configuration credential', /^\s*(?:export\s+)?(?:api[_-]?key|secret|app[_-]?secret|client[_-]?secret|private[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|_authToken|password|passwd|pwd|pin|token)\s*[:=]\s*([^#'"\s]+)/gim],
 ['token assignment', /["']?\b(?:token|bearer)\b["']?\s*[:=]\s*(["'])([A-Za-z0-9_./+\-=]{16,})\1/gi],
 ['service credential', /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|(?:AKIA|ASIA)[0-9A-Z]{16}|AIza[\w-]{35}|glpat-[\w-]{16,})\b/g],
 ['bearer credential', /\bBearer\s+[A-Za-z0-9_.\-/+=]{16,}/gi],
 ['JWT', /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g],
 ['private key', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/g],
 ['credential connection string', /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp|mssql):\/\/[^/\s:@]+:[^/\s@]+@/gi],
 ['local absolute path', /(?<![A-Za-z0-9_])[A-Za-z]:[\\/]+[A-Za-z0-9_.\-\u4e00-\u9fff]/g],
 ['local user directory', /\/(?:Users|home|root)\/[A-Za-z0-9_.-]+\//g],
 ['UNC path', /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/g],
 ['local file URI', /\bfile:\/{2,3}/gi],
 ['email address', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
 ['phone number', /(?<!\d)1[3-9]\d{9}(?!\d)/g],
 ['identity/account digits', /(?<!\d)\d{16,19}[Xx]?(?!\d)/g]
]

export function forbiddenPath(name) {
 const parts = name.replaceAll('\\','/').split('/')
 return localDirs.has(parts[0]) || parts.some(p=>generatedDirs.has(p) || p==='private') || junk.test(parts.at(-1)) || (privateNames.test(parts.at(-1)) && parts.at(-1)!=='.env.example') || forbiddenBinary.test(parts.at(-1))
}

function exempt(label,match,name) {
 if(label==='email address')return /@(?:example\.(?:com|org)|[^@]*\.invalid|users\.noreply\.github\.com)$/i.test(match[0])
 if(label==='identity/account digits' && /(?:^|\/)package(?:-lock)?\.json$/.test(name))return compilerBuildIds.has(match[0]) && match.input.slice(match.index-6,match.index)==='3.0.0-'
 if(label==='credential assignment')return /^(?:YOUR_[A-Z_]+|<[^>]+>|\$\{[^}]+\})$/.test(match[2])
 if(label==='unquoted configuration credential')return /^(?:YOUR_[A-Z_]+|<[^>]+>|\$\{[^}]+\}|string|number|boolean|null|undefined|process\.env\.[A-Z_]+|import\.meta\.env\.[A-Z_]+)$/.test(match[1])
 return false
}

function decodeText(data) {
 if(data[0]===0xff && data[1]===0xfe)return data.subarray(2).toString('utf16le')
 if(data[0]===0xfe && data[1]===0xff){const swapped=Buffer.from(data.subarray(2));if(swapped.length%2)return null;return swapped.swap16().toString('utf16le')}
 if(data.subarray(0,4096).includes(0))return null
 return data.toString('utf8')
}

export function imageMetadata(data,extension) {
 const found=[]
 if(extension==='.png' && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
  for(let offset=8;offset+12<=data.length;){const size=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);if(offset+12+size>data.length){found.push('invalid PNG chunks');break}if(['caBX','eXIf','iTXt','tEXt','zTXt'].includes(kind))found.push('image metadata '+kind);offset+=12+size}
 }else if(['.jpg','.jpeg'].includes(extension) && data[0]===0xff && data[1]===0xd8){
  let offset=2
  while(offset+4<=data.length){if(data[offset]!==0xff)break;while(data[offset]===0xff)offset++;const marker=data[offset++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;const size=data.readUInt16BE(offset);if(size<2||offset+size>data.length)break;if([0xe1,0xeb,0xed].includes(marker))found.push('image metadata APP'+(marker-0xe0));offset+=size}
 }else if(extension==='.webp' && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP'){
  for(let offset=12;offset+8<=data.length;){const kind=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4);if(['EXIF','XMP ','C2PA'].includes(kind))found.push('image metadata '+kind.trim());if(offset+8+size>data.length)break;offset+=8+size+(size%2)}
 }
 return [...new Set(found)]
}

function recognizedMedia(data,extension) {
 const header=data.toString('ascii',0,12)
 if(extension==='.png')return data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
 if(['.jpg','.jpeg'].includes(extension))return data[0]===255&&data[1]===216
 if(extension==='.webp')return header.startsWith('RIFF')&&header.slice(8)==='WEBP'
 if(extension==='.wav')return header.startsWith('RIFF')&&header.slice(8)==='WAVE'
 if(extension==='.mp3')return header.startsWith('ID3')||data[0]===255&&(data[1]&224)===224
 if(extension==='.ogg')return header.startsWith('OggS')
 if(extension==='.ico')return data.subarray(0,4).equals(Buffer.from([0,0,1,0]))
 if(extension==='.woff')return header.startsWith('wOFF')
 if(extension==='.woff2')return header.startsWith('wOF2')
 if(extension==='.ttf')return header.startsWith('OTTO')||data.subarray(0,4).equals(Buffer.from([0,1,0,0]))
 return false
}

function audioMetadata(data,extension) {
 const found=[]
 if(extension==='.wav' && recognizedMedia(data,extension))for(let offset=12;offset+8<=data.length;){const kind=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4);if(['LIST','bext','iXML','axml','ID3 '].includes(kind))found.push('audio metadata '+kind.trim());if(offset+8+size>data.length)break;offset+=8+size+(size%2)}
 if(extension==='.mp3'&&(data.toString('ascii',0,3)==='ID3'||data.toString('ascii',Math.max(0,data.length-128),Math.max(0,data.length-125))==='TAG'))found.push('audio metadata ID3')
 return found
}

export function scanBytes(name,data,{maxBytes=5*1024*1024,localOnly=false}={}) {
 const hits=[],add=(category,line)=>hits.push({path:name,category,...(line?{line}:{}),localOnly})
 if(!localOnly && forbiddenPath(name))add('forbidden archive path')
 if(!localOnly && data.length>maxBytes)add('file exceeds reviewed size limit')
 const extension=path.extname(name).toLowerCase()
 for(const category of imageMetadata(data,extension))add(category)
 for(const category of audioMetadata(data,extension))add(category)
 if(media.has(extension)){if(recognizedMedia(data,extension))return hits;add('asset signature mismatch')}
 const text=decodeText(data)
 if(text===null){if(!localOnly)add('unreviewed binary content');return hits}
 for(const [label,pattern]of rules){pattern.lastIndex=0;for(const match of text.matchAll(pattern)){if(exempt(label,match,name))continue;add(label,text.slice(0,match.index).split('\n').length)}}
 if(extension==='.svg' && /<(?:script|foreignObject)\b|(?:href|src)\s*=\s*["']https?:/i.test(text))add('active or remote SVG content')
 return hits
}

function git(root,args,{optional=false,input}={}) {
 const result=spawnSync('git',args,{cwd:root,input,maxBuffer:128*1024*1024,windowsHide:true})
 if(result.status!==0){if(optional)return null;throw new Error('Git read failed: '+args[0])}
 return result.stdout
}
function walk(root,relative='',onlyLocal=false) {
 const list=[]
 for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
  const name=relative?relative+'/'+entry.name:entry.name
  if(entry.isDirectory()){if(generatedDirs.has(entry.name))continue;if(!relative&&localDirs.has(entry.name)!==onlyLocal)continue;list.push(...walk(root,name,false))}
  else if(!onlyLocal)list.push(name)
 }
 return list
}
function indexEntries(root,revision) {
 const args=revision?['ls-tree','-r','-z','--full-tree',revision]:['ls-files','--stage','-z']
 return git(root,args).toString('utf8').split('\0').filter(Boolean).map(row=>{const [head,name]=row.split('\t'),parts=head.split(' ');return {name,mode:parts[0],oid:revision?parts[2]:parts[1],stage:revision?0:Number(parts[2])}})
}
function ignorePolicy(data,findings) {
 const text=data?.toString('utf8')||''
 for(const name of localDirs)if(!new RegExp('^/?'+name+'/\\s*$','m').test(text))findings.push({path:'.gitignore',category:'missing '+name+' exclusion'})
}
function auditSnapshot(root,revision,maxBytes) {
 const findings=[],entries=indexEntries(root,revision);let bytes=0
 const blobs=new Map()
 const valid=entries.filter(e=>e.stage===0&&['100644','100755'].includes(e.mode))
 for(let offset=0;offset<valid.length;offset+=32){
  const batch=valid.slice(offset,offset+32),buffer=git(root,['cat-file','--batch'],{input:batch.map(e=>e.oid).join('\n')+'\n'});let position=0
  for(const entry of batch){const end=buffer.indexOf(10,position);if(end<0)throw new Error('Incomplete Git blob header');const [oid,kind,sizeText]=buffer.toString('ascii',position,end).split(' '),size=Number(sizeText);if(oid!==entry.oid||kind!=='blob'||!Number.isSafeInteger(size)||size<0||end+size+2>buffer.length)throw new Error('Invalid Git blob');blobs.set(entry.oid,buffer.subarray(end+1,end+1+size));position=end+size+2}
 }
 for(const entry of entries){
  if(entry.stage!==0){findings.push({path:entry.name,category:'unmerged index entry'});continue}
  if(!['100644','100755'].includes(entry.mode)){findings.push({path:entry.name,category:'symlink or embedded repository'});continue}
  const data=blobs.get(entry.oid);bytes+=data.length
  findings.push(...scanBytes(entry.name,data,{maxBytes}))
  if(entry.name==='.gitignore')ignorePolicy(data,findings)
 }
 if(!entries.some(e=>e.name==='.gitignore'))ignorePolicy(null,findings)
 return {files:entries.length,bytes,findings}
}

export function runAudit({root,staged=false,history=false,includeLocalOnly=false,messageFile,maxBytes=5*1024*1024}) {
 const findings=[],localFindings=[],counts={publicFiles:0,publicBytes:0,localFiles:0,localBytes:0,commits:0}
 if(messageFile){findings.push(...scanBytes('<commit-message>',fs.readFileSync(messageFile),{maxBytes}));return {mode:'commit-message',counts,findings,localFindings}}
 const inGit=git(root,['rev-parse','--is-inside-work-tree'],{optional:true})?.toString().trim()==='true'
 if(staged || history){
  if(!inGit)throw new Error('Git repository is required for snapshot auditing')
  const revisions=history?git(root,['rev-list','--all']).toString().trim().split('\n').filter(Boolean):[undefined]
  for(const revision of revisions){const audit=auditSnapshot(root,revision,maxBytes);counts.publicFiles+=audit.files;counts.publicBytes+=audit.bytes;if(revision)counts.commits++;findings.push(...audit.findings.map(hit=>revision?{...hit,commit:revision.slice(0,12)}:hit));if(revision)findings.push(...scanBytes('<commit-metadata>',git(root,['show','-s','--format=%B%n%an%n%ae%n%cn%n%ce',revision]),{maxBytes}))}
 }else{
  const names=inGit?[...new Set(git(root,['ls-files','--cached','--others','--exclude-standard','-z']).toString('utf8').split('\0').filter(Boolean))]:walk(root)
  for(const name of names){const file=path.join(root,name);if(!fs.existsSync(file)){findings.push({path:name,category:'tracked file missing from working tree'});continue}const stat=fs.lstatSync(file);if(!stat.isFile()){findings.push({path:name,category:'symlink or unsupported archive entry'});continue}const data=fs.readFileSync(file);counts.publicFiles++;counts.publicBytes+=data.length;findings.push(...scanBytes(name,data,{maxBytes}))}
  const ignoreFile=path.join(root,'.gitignore');ignorePolicy(fs.existsSync(ignoreFile)?fs.readFileSync(ignoreFile):null,findings)
 }
 if(includeLocalOnly){
  const publicNames=new Set(inGit?git(root,['ls-files','--cached','--others','--exclude-standard','-z']).toString('utf8').split('\0'):walk(root))
  const outputNames=localTestOutputs.filter(name=>fs.existsSync(path.join(root,name))&&fs.lstatSync(path.join(root,name)).isDirectory()).flatMap(name=>walk(root,name))
  const localNames=[...new Set([...walk(root,'',true),...walk(root).filter(name=>!publicNames.has(name)),...outputNames])]
  for(const name of localNames){const file=path.join(root,name);if(!fs.lstatSync(file).isFile()){localFindings.push({path:name,category:'local link requires review',localOnly:true});continue}const data=fs.readFileSync(file);counts.localFiles++;counts.localBytes+=data.length;localFindings.push(...scanBytes(name,data,{maxBytes,localOnly:true}));if(junk.test(path.basename(name)))localFindings.push({path:name,category:'ignored local junk file',localOnly:true});if(localTestOutputs.includes(name.split('/')[0]))localFindings.push({path:name,category:'excluded generated test artifact',localOnly:true})}
 }
 return {mode:history?'history':staged?'staged':'workspace',counts,findings,localFindings}
}

function main(argv) {
 const options={root:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')};let report
 for(let i=0;i<argv.length;i++){const arg=argv[i];if(arg==='--root')options.root=path.resolve(argv[++i]);else if(arg==='--staged')options.staged=true;else if(arg==='--history')options.history=true;else if(arg==='--include-local-only')options.includeLocalOnly=true;else if(arg==='--message')options.messageFile=argv[++i];else if(arg==='--large-file-mb')options.maxBytes=Number(argv[++i])*1024*1024;else if(arg==='--report')report=argv[++i];else throw new Error('Unknown scan option')}
 const result=runAudit(options)
 if(report){const reportFile=path.resolve(options.root,report),privateRoot=path.resolve(options.root,'private')+path.sep;if(!reportFile.startsWith(privateRoot))throw new Error('Audit reports must remain inside private');fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify({at:new Date().toISOString(),...result},null,2)+'\n')}
 console.log('Purity audit: '+result.mode+'; public files='+result.counts.publicFiles+'; commits='+result.counts.commits)
 for(const hit of result.findings.slice(0,80))console.log('BLOCK '+hit.category+' | '+hit.path+(hit.line?':'+hit.line:'')+(hit.commit?' | commit '+hit.commit:''))
 if(result.findings.length>80)console.log('Additional findings: '+(result.findings.length-80))
 if(options.includeLocalOnly){console.log('Local-only documents/assets/test outputs: files='+result.counts.localFiles+'; findings='+result.localFindings.length+' (values withheld; excluded from archive)');for(const hit of result.localFindings.slice(0,20))console.log('LOCAL '+hit.category+' | '+hit.path+(hit.line?':'+hit.line:''))}
 console.log(result.findings.length?'FAIL '+result.findings.length+' public finding(s); archiving blocked.':'PASS no public findings; docs/private remain excluded.')
 process.exitCode=result.findings.length?1:0
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main(process.argv.slice(2))}catch{console.error('ERROR audit did not complete; archiving blocked.');process.exitCode=2}}
