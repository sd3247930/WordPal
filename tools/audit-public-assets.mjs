import fs from 'node:fs/promises'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'

const names=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','src/static'],{encoding:'utf8'}).split('\0').filter(Boolean))]
const groups={},metadata=[],files=[]
for(const file of names){
 const bytes=await fs.readFile(file),group=file.split('/')[2]
 groups[group]??={files:0,bytes:0};groups[group].files++;groups[group].bytes+=bytes.length
 const tags=[]
 if(file.endsWith('.png'))for(let offset=8;offset+12<=bytes.length;){
  const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8)
  if(offset+12+length>bytes.length){tags.push('invalid-chunk');break}
  if(['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type))tags.push(type)
  offset+=length+12
 }
 if(/\.jpe?g$/i.test(file)&&bytes.includes(Buffer.from('Exif\0\0')))tags.push('EXIF')
 if(/\.jpe?g$/i.test(file)&&bytes.includes(Buffer.from('c2pa')))tags.push('C2PA-review')
 if(tags.length)metadata.push({file,tags:[...new Set(tags)]})
 files.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
}
const report={scope:'Public candidate static assets only; this inventory does not grant redistribution rights.',groups,metadata,files}
const output=process.argv[2]
if(output){await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2))}
console.log(JSON.stringify({groups,metadataFiles:metadata.length,totalFiles:files.length},null,2))
