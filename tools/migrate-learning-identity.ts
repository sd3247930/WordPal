import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {resolve,relative,dirname,isAbsolute} from 'node:path'
import {createIdentitySnapshot,validateIdentitySnapshot} from '../src/services/storage/IdentityUpgrade'
import {registerCourse} from '../src/services/content/ContentRegistry'
import {validateCourse} from '../packages/content_schema/course'
import {validateDatabase} from '../src/services/storage/MigrationV1toV2'
const args=process.argv.slice(2),option=(name:string)=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined}
try{
 const input=option('--input'),output=option('--output')
 if(!input||!output)throw Error('Usage: tsx tools/migrate-learning-identity.ts --input <local-backup> --output private/<snapshot> [--course <local-pack>] [--rollback]')
 const target=resolve(output),local=relative(resolve('private'),target)
 if(!local||isAbsolute(local)||local.startsWith('..')||resolve(input)===target||existsSync(target))throw Error('Output must be a new local-only file inside private/. Existing files are never overwritten.')
 const parsed=JSON.parse(readFileSync(input,'utf8').replace(/^\uFEFF/,''))
 const course=option('--course')
 if(course){const pack=JSON.parse(readFileSync(course,'utf8').replace(/^\uFEFF/,''));if(validateCourse(pack).some(i=>i.severity==='error'))throw Error('Course validation failed.');registerCourse(pack)}
 let result:unknown
 if(args.includes('--rollback')){if(!validateIdentitySnapshot(parsed))throw Error('Snapshot integrity check failed.');result={database:parsed.database,preferences:parsed.preferences}}
 else{const db=parsed.database||parsed;if(!validateDatabase(db))throw Error('Database validation failed.');result=createIdentitySnapshot(db,parsed.preferences||{favorites:[],later:[]})}
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(result,null,2),{flag:'wx'});console.log('Verified identity snapshot written locally; no live database or scheduler was changed.')
}catch(error){console.error((error as Error).message);process.exitCode=1}
