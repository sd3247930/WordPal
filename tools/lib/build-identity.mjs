import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'

const excluded=new Set(['local-courses','local-master-audio','local-course-media','local-starter-media','local-spirit-stone'])
const textFiles=/\.(?:ts|vue|js|mjs|json|csv|scss|css|html|svg)$/i
export function createBuildIdentity(root=process.cwd()){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8'))
 if(pkg.version!==manifest.versionName)throw Error('Package and application versions differ.')
 const files=[]
 function walk(relative){for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
  if(excluded.has(entry.name)||entry.name==='build-info.json')continue
  const file=relative+'/'+entry.name
  if(entry.isDirectory())walk(file)
  else if(entry.isFile())files.push(file)
  else throw Error('Build identity does not accept linked production files.')
 }}
 for(const folder of ['src','packages'])walk(folder)
 for(const file of ['package.json','package-lock.json','vite.config.ts','tsconfig.json','tools/lib/build-identity.mjs'])if(fs.existsSync(path.join(root,file)))files.push(file)
 const hash=createHash('sha256')
 for(const file of files.sort()){
  const bytes=fs.readFileSync(path.join(root,file)),canonical=textFiles.test(file)?Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n')):bytes
  hash.update(file+'\0').update(canonical).update('\0')
 }
 let revision='unversioned'
 try{const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();if(path.resolve(gitRoot)===path.resolve(root))revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim()}catch{}
 return {schemaVersion:1,version:pkg.version,versionCode:String(manifest.versionCode),revision,sourceSha256:hash.digest('hex'),sourceFiles:files.length}
}

export function writeBuildIdentity(root,options){
 const identity={...createBuildIdentity(root),platform:options.platform,mode:options.mode,localContent:options.localContent===true},target=path.join(root,'src/static/build-info.json'),text=JSON.stringify(identity,null,2)+'\n'
 fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)fs.writeFileSync(target,text)
 return identity
}

export function verifyBuildIdentity(read,expected=createBuildIdentity()){
 const actual=JSON.parse(Buffer.from(read('static/build-info.json')).toString('utf8'))
 for(const key of ['schemaVersion','version','versionCode','revision','sourceSha256','sourceFiles'])if(actual[key]!==expected[key])throw Error('Packaged build identity differs from source: '+key)
 if(actual.mode!=='production'||actual.localContent!==false||!/^[a-f0-9]{40}$/.test(actual.revision))throw Error('Public release must identify a committed production build without local content.')
 return actual
}
