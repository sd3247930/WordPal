import {readFileSync,writeFileSync} from 'node:fs'
import {previewImport,defaultImportMetadata,csvTemplate} from '../../src/services/course-import/ImportWizard'
import {validateCourse} from '../../packages/content_schema/course'
const args=process.argv.slice(2),value=(name:string)=>args[args.indexOf(name)+1]
if(args.includes('--help')||!args.length){console.log('课程转换：tsx tools/import-course/index.ts --file <JSON/CSV/MD> --course-id <id> --title <title> --local-use --output <JSON>\n审核公开课程：--public；输出 CSV 模板：--template <CSV>');process.exit(0)}
if(args.includes('--template')){writeFileSync(value('--template'),csvTemplate);process.exit(0)}
async function main(){
 const file=value('--file');if(!file||file.startsWith('--'))throw new Error('请提供 --file。')
 const meta=defaultImportMetadata();meta.courseId=args.includes('--course-id')?value('--course-id'):meta.courseId;meta.title=args.includes('--title')?value('--title'):meta.title;meta.declared=args.includes('--local-use')
 if(args.includes('--content-version'))meta.contentVersion=value('--content-version')
 if(args.includes('--route'))meta.route=value('--route') as typeof meta.route;if(args.includes('--level'))meta.level=value('--level')
 for(const field of ['publisher','semester','edition'] as const)if(args.includes('--'+field))meta[field]=value('--'+field)
 for(const [arg,field] of [['--edition-year','editionYear'],['--grade','grade']] as const)if(args.includes(arg))meta[field]=Number(value(arg))
 if(args.includes('--start-grade'))meta.startGrade=Number(value('--start-grade')) as 1|3
 const text=readFileSync(file,'utf8'),format=/\.md$/i.test(file)?'markdown':/\.csv$/i.test(file)?'csv':'json',preview=previewImport(text,format,meta,{})
 const issues=[...preview.issues,...(preview.pack&&args.includes('--public')?validateCourse(preview.pack,{publicUse:true}):[])]
 for(const issue of issues)console.log(`${issue.severity} 第 ${issue.line} 行 ${issue.field}：${issue.message} ${issue.fix}`)
 if(!preview.pack||issues.some(i=>i.severity==='error')){process.exitCode=1;return}
 console.log(`校验通过：${preview.pack.vocabulary.length} 词，${preview.pack.units.length} 单元；缺音频 ${preview.missingAudio}，缺拼读 ${preview.missingPhonics}，缺词图 ${preview.missingImages}。`)
 if(args.includes('--output'))writeFileSync(value('--output'),JSON.stringify(preview.pack,null,2)+'\n')
}
main().catch(()=>{console.error('转换失败，请检查参数、输入文件与输出权限。');process.exitCode=1})
