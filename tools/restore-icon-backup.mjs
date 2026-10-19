import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'

const args=process.argv.slice(2),backup=args[args.indexOf('--backup')+1]
if(!args.includes('--backup')||!backup||backup.startsWith('--'))throw Error('Provide --backup followed by the backup directory. Dry run is the default; --apply restores original icon files only.')
const apply=args.includes('--apply'),root=process.cwd(),manifest=JSON.parse(await fs.readFile(path.join(backup,'manifest-before.json'),'utf8')),changed=[]
for(const entry of manifest.filter(item=>item.file.startsWith('src/static/icons/'))){
 const target=path.resolve(root,entry.file),relative=path.relative(path.join(root,'src/static/icons'),target)
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Icon target is outside the icon directory.')
 const bytes=await fs.readFile(path.join(backup,'workspace-before',entry.file)),hash=data=>createHash('sha256').update(data).digest('hex')
 if(hash(bytes)!==entry.sha256)throw Error('Backup verification failed: '+entry.file)
 let same=false;try{same=hash(await fs.readFile(target))===entry.sha256}catch{}
 if(!same){changed.push(entry.file);if(apply){await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes)}}
}
console.log(JSON.stringify({mode:apply?'restore':'dry-run',changed,restoresLearningData:false,removesNewIcons:false},null,2))
