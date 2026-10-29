import {readFileSync,mkdirSync,writeFileSync,existsSync,realpathSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep} from 'node:path'
import {prepareDataset,evaluateCandidate} from './domain'

const args=process.argv.slice(2)
const help='离线儿童FSRS研究流程（不会更改应用参数）：\n  npm run srs:calibration -- prepare --input <去标识JSON> --output docs/<新目录>\n  npm run srs:calibration -- evaluate --input <去标识JSON> --candidate <候选JSON> --output docs/<新目录>\n  npm run srs:calibration -- locked-test --input <去标识JSON> --candidate <候选JSON> --validation <已冻结验证报告> --output docs/<新目录>\n仅写入被忽略的 docs 或 private 新目录。没有真实授权数据时不进行拟合。'
function value(name:string){const i=args.indexOf(name);if(i<0||!args[i+1]||args[i+1].startsWith('--'))throw new Error('缺少命令参数');return args[i+1]}
const loadJson=(path:string)=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))
function main(){
 if(!args.length||args.includes('--help')){console.log(help);return}
 const command=args[0];if(!['prepare','evaluate','locked-test'].includes(command))throw new Error('未知命令')
 const root=resolve('.'),target=resolve(value('--output')),rel=relative(root,target)
 if(isAbsolute(rel)||!['docs','private'].includes(rel.split(sep)[0])||rel.split(sep).length<2||existsSync(target))throw new Error('输出必须是本项目docs或private内尚不存在的目录')
 // Refuse links that could redirect sensitive research exports into public source folders.
 let parent=resolve(target,'..');while(!existsSync(parent))parent=resolve(parent,'..')
 const actual=relative(root,realpathSync(parent))
 if(actual!==''&&(isAbsolute(actual)||!['docs','private'].includes(actual.split(sep)[0])))throw new Error('输出父目录必须实际位于本机文档或私有目录')
 const prepared=prepareDataset(loadJson(value('--input')))
 let report:unknown=prepared.manifest
 if(command!=='prepare'){
  const candidate=loadJson(value('--candidate'))
  const validation=evaluateCandidate(prepared,candidate)
  if(command==='locked-test'){
   const frozen=loadJson(value('--validation'))
   if(frozen.fold!=='validation'||frozen.eligibleForIndependentReview!==true||frozen.candidateHash!==validation.candidateHash||frozen.trainingHash!==validation.trainingHash||frozen.datasetHash!==validation.datasetHash||!validation.eligibleForIndependentReview)throw new Error('锁定测试需要同一已冻结候选的合格验证报告')
   report=evaluateCandidate(prepared,candidate,'test')
  }else report=validation
 }
 mkdirSync(target,{recursive:true})
 writeFileSync(resolve(target,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'})
 if(command==='prepare')writeFileSync(resolve(target,'train.csv'),prepared.trainingCsv,{flag:'wx'})
 console.log('本机研究输出完成。应用继续使用原FSRS参数；未上传数据，未启用候选。')
}
try{main()}catch{console.error('处理失败：请检查数据授权、白名单结构、版本、冻结报告及本机输出目录。');process.exitCode=1}
