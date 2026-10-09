import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve,relative,isAbsolute} from 'node:path'
import {generateCourses,type Extraction} from './generate'
import type {CoursePack} from '../../packages/content_schema/course'
import {starterPack} from '../../packages/content_schema/registry'
import original from '../../src/content/courses/original-primary.json'
import {validateBundles} from './validate'

const args=process.argv.slice(2)
if(!args.includes('--local-use'))throw new Error('词表权利待核对；必须用 --local-use 明确仅供本机学习。')
const input=args.includes('--file')?args[args.indexOf('--file')+1]:'private/course-import/fltrp/raw.json'
const inputRelative=input?relative(resolve('private'),resolve(input)):''
if(!input||isAbsolute(inputRelative)||inputRelative.startsWith('..')||inputRelative==='')throw new Error('提取文件必须位于 private 的子目录。')
const raw=JSON.parse(readFileSync(input,'utf8').replace(/^\uFEFF/,'')) as Extraction
const catalogFile='src/content/local-courses/catalog.json'
const previous=JSON.parse(readFileSync(catalogFile,'utf8')) as CoursePack[]
const retained=previous.filter(pack=>!pack.courseId.startsWith('fltrp-3start-'))
const {courses,audit}=generateCourses(raw,[starterPack,original as CoursePack,...retained].flatMap(pack=>pack.vocabulary))
const issues=validateBundles(courses)
if(issues.length)throw new Error(issues.join('；'))
mkdirSync('private/course-import/fltrp/courses',{recursive:true})
for(const pack of courses)writeFileSync('private/course-import/fltrp/courses/'+pack.courseId+'.json',JSON.stringify(pack,null,2)+'\n')
writeFileSync(catalogFile,JSON.stringify([...retained,...courses])+'\n')
writeFileSync('private/course-import/fltrp/import-audit.json',JSON.stringify(audit,null,2)+'\n')
console.log(JSON.stringify({visible:audit.visible,deferred:audit.deferred.length,books:audit.books}))
