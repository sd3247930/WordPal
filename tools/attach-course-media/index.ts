/**
 * 把本机教材资源挂到已有课程上（本机私用，不入公开仓库）。
 *
 * 用法：npx tsx tools/attach-course-media/index.ts --course fltrp-3start-g5b \
 *        --audio private/单词库/.../complete-package --images private/单词库/.../complete-package
 *
 * 规则：
 * - 词表与资源包按位置逐条对齐，任一不匹配立即中止（不写入任何文件）。
 * - 图片统一压缩为 WebP 512px / ≤120 KB；音频原样拷贝。
 * - 只有全部校验通过后才改写 catalog.json，并输出审计报告。
 */
import {readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync,existsSync,statSync} from 'node:fs'
import {join,dirname} from 'node:path'
import sharp from 'sharp'
import {validateCourse,type CoursePack} from '../../packages/content_schema/course'
import {sha256} from '../../src/services/content/digest'

const args=process.argv.slice(2)
const value=(name:string)=>{const index=args.indexOf(name);return index<0?'':args[index+1]}
const courseId=value('--course')
const audioRoot=value('--audio')
const imageRoot=value('--images')
const catalogPath='src/content/local-courses/catalog.json'
const mediaRoot='src/static/local-course-media'
const reportPath='private/教材导入/g5b-attachment-report.md'
if(!courseId||!audioRoot||!imageRoot)throw new Error('缺少参数：--course / --audio / --images')

const slug=(name:string)=>name.replace(/\s+/g,'-').replace(/[^A-Za-z0-9._-]/g,'-').replace(/-+/g,'-').toLowerCase()
const bytesOf=(file:string)=>readFileSync(file)

const manifest=JSON.parse(readFileSync(join(audioRoot,'manifest.json'),'utf8')) as {entries:{id:string;unit:number;ordinal:number;word:string;audio:string}[]}
const catalog=JSON.parse(readFileSync(catalogPath,'utf8')) as CoursePack[]
const pack=catalog.find(item=>item.courseId===courseId)
if(!pack)throw new Error('课程不存在：'+courseId)
if(manifest.entries.length!==pack.vocabulary.length)throw new Error(`资源包 ${manifest.entries.length} 条与词表 ${pack.vocabulary.length} 条数量不一致`)

// 1) 逐条对齐校验（位置 + 词形），任何一条不符即中止
const mismatches:string[]=[]
manifest.entries.forEach((entry,index)=>{
 const word=pack.vocabulary[index]
 if(!word)return void mismatches.push(`${index}: 词表缺失`)
 if(word.lemma.trim().toLowerCase()!==String(entry.word).trim().toLowerCase())mismatches.push(`${index}: 词表=${word.lemma} 资源=${entry.word}`)
})
if(mismatches.length)throw new Error('词表与资源包未逐条对齐：\n'+mismatches.slice(0,10).join('\n'))

// 2) 图片路径：优先按音频名换扩展名，找不到再按 uXX_YY 前缀扫描
const imageFor=(unit:number,entryId:string,audioRel:string):string=>{
 const direct=join(imageRoot,audioRel.replace(/\.mp3$/i,'.png'))
 if(existsSync(direct))return direct
 const dir=join(imageRoot,'Unit'+String(unit).padStart(2,'0'))
 if(!existsSync(dir))return ''
 const hit=readdirSync(dir).find(name=>name.startsWith(entryId+'_')&&/\.png$/i.test(name))
 return hit?join(dir,hit):''
}

async function main(){
const audioSourceId='fltrp-audio-local',imageSourceId='fltrp-image-local'
for(const source of [
 {id:audioSourceId,type:'user-provided' as const,rightsStatus:'private-use-declared' as const,attribution:'词典站点音频（Oxford / Cambridge），仅本机学习使用，不再分发',revision:'fltrp-g5b-audio-1',textLicense:'无新增文本',audioLicense:'仅本机学习使用；未声明开放许可'},
 {id:imageSourceId,type:'author-created' as const,rightsStatus:'private-use-declared' as const,attribution:'作者为本册逐词生成的图片，仅本机使用',revision:'fltrp-g5b-image-1',textLicense:'无新增文本',imageLicense:'仅本机学习使用'}
])if(!pack.sources.some(existing=>existing.id===source.id))pack.sources.push(source)

const assets:CoursePack['assets']=[]
const rows:string[]=[]
let audioBytes=0,imageBytes=0,maxImage=0
for(const [index,entry] of manifest.entries.entries()){
 const word=pack.vocabulary[index]
 const unitDir='Unit'+String(entry.unit).padStart(2,'0')
 const base=slug(entry.id+'_'+entry.word)
 // 音频
 const audioSrc=join(audioRoot,entry.audio)
 const audioRel=`audio/${unitDir}/${base}.mp3`
 const audioDest=join(mediaRoot,audioRel)
 mkdirSync(dirname(audioDest),{recursive:true})
 copyFileSync(audioSrc,audioDest)
 const audioData=bytesOf(audioDest)
 assets.push({id:`audio-${entry.id.replace(/_/g,'-')}`,path:audioRel,mediaType:'audio/mpeg',bytes:audioData.length,sha256:sha256(audioData),sourceId:audioSourceId,license:'词典来源音频，仅本机学习使用'})
 audioBytes+=audioData.length
 // 图片
 const imageSrc=imageFor(entry.unit,entry.id,entry.audio)
 if(!imageSrc)throw new Error('缺少图片：'+entry.id)
 const imageRel=`images/${unitDir}/${base}.webp`
 const imageDest=join(mediaRoot,imageRel)
 mkdirSync(dirname(imageDest),{recursive:true})
 await sharp(imageSrc).resize(512,512,{fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(imageDest)
 const imageData=bytesOf(imageDest)
 if(imageData.length>120*1024)throw new Error(`图片压缩后仍超过 120 KB：${imageRel} (${Math.round(imageData.length/1024)} KB)`)
 assets.push({id:`image-${entry.id.replace(/_/g,'-')}`,path:imageRel,mediaType:'image/webp',bytes:imageData.length,sha256:sha256(imageData),sourceId:imageSourceId,license:'作者原创图片，仅本机学习使用'})
 imageBytes+=imageData.length
 maxImage=Math.max(maxImage,imageData.length)
 word.assetRefs={...word.assetRefs,audio:`audio-${entry.id.replace(/_/g,'-')}`,image:`image-${entry.id.replace(/_/g,'-')}`}
 rows.push(`| ${entry.unit} | ${entry.ordinal} | ${entry.word} | ${audioRel} | ${imageRel} |`)
}
pack.assets=assets

const issues=validateCourse(pack)
if(issues.length)throw new Error('课程校验未通过：'+issues.map(issue=>issue.field+':'+issue.message).join(' / '))

writeFileSync(catalogPath,JSON.stringify(catalog)+'\n')
mkdirSync(dirname(reportPath),{recursive:true})
writeFileSync(reportPath,[
'# g5b 资源挂载报告','',
`- 课程：${pack.courseId}（${pack.title}）`,
`- 词条：${pack.vocabulary.length}，单元：${pack.units.length}`,
`- 资源：音频 ${manifest.entries.length} 个（${(audioBytes/1048576).toFixed(2)} MB），图片 ${manifest.entries.length} 个（${(imageBytes/1048576).toFixed(2)} MB）`,
`- 单张图片最大：${(maxImage/1024).toFixed(1)} KB（限制 120 KB）`,
`- 媒体总量：${((audioBytes+imageBytes)/1048576).toFixed(2)} MB（课程包上限 50 MiB）`,
`- 图片压缩：WebP 512px（fit inside）/ quality 82`,
`- 资源来源：音频=${audioSourceId}（仅本机），图片=${imageSourceId}（作者原创，仅本机）`,
`- 未挂载：${pack.courseId === 'fltrp-3start-g5b' ? 'fltrp-3start-g5a 等待专用资源包' : '—'}`,
'','## 逐条映射','','| Unit | 序号 | 单词 | 音频 | 图片 |','| --- | --- | --- | --- | --- |',...rows,''
].join('\n'))
console.log(JSON.stringify({course:pack.courseId,words:pack.vocabulary.length,assets:assets.length,audioMB:+(audioBytes/1048576).toFixed(2),imageMB:+(imageBytes/1048576).toFixed(2),maxImageKB:+(maxImage/1024).toFixed(1),issues:issues.length}))
}
main().catch(error=>{console.error('FAIL',error instanceof Error?error.message:error);process.exit(1)})
