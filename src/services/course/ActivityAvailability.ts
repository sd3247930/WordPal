import type {CoursePack,CourseLesson} from '../../../packages/content_schema/course'
import type {Word} from '../../../packages/core_learning'
import type {ActivityKind} from '../../stores/activities'

export const activityNames:Record<ActivityKind,string>={check:'整课检查',pair:'词义配对',letters:'字母拼装',sentence:'句子排序',cloze:'句子填空',story:'故事阅读',picture:'看图选词','listen-picture':'听音选图',phonics:'自然拼读与跟读',challenge:'连胜挑战',speed:'闪电判断'}
/** Menu locks and start guards share the existing activity prerequisites. No progress is changed here. */
export function activityAvailability(kind:ActivityKind,pack:CoursePack,lesson:Pick<CourseLesson,'id'|'wordIds'|'examples'|'storyId'>|undefined,pool:Word[],known:Readonly<Record<string,unknown>>,dueIds:readonly string[]){
 const reject=(reason:string,message:string)=>({available:false,reason,message,wordIds:[] as string[]})
 if(!lesson)return reject('暂无课程','请先选择可学习的课程。')
 if(kind==='check'&&(dueIds.length||lesson.wordIds.some(id=>!known[id])))return reject(dueIds.length?'先完成复习':'先学新词','先完成到期复习与本课未学词，再进行整课检查。')
 if(kind==='listen-picture'&&pool.filter(w=>!!w.image).length<2)return reject('词图不足','本课没有足够的不同词图，可选择文字练习。')
 if(['check','pair','challenge','speed'].includes(kind)&&new Set(pool.map(w=>w.meaning)).size<2)return reject('词量不足','词表不足以形成客观选择题，可先浏览或拼装单词。')
 const byId=new Map(pool.map(w=>[w.id,w])),wordIds=lesson.wordIds.filter(id=>{
  const w=byId.get(id);if(!w)return false
  const example=lesson.examples?.[id]||w.example
  return kind==='cloze'?example.toLowerCase().split(/[^a-z'-]+/).includes(w.word.toLowerCase()):kind==='sentence'?!!example:kind==='picture'||kind==='listen-picture'?!!w.image&&(kind!=='listen-picture'||!!w.audio):kind==='phonics'?!!w.phonics.length&&w.phonics.length===w.phonemes.length&&!!w.audio:true
 })
 if(!wordIds.length){
  const reason=kind==='sentence'||kind==='cloze'?'暂无例句':kind==='phonics'?'暂无规则':kind==='picture'||kind==='listen-picture'?(pack.vocabulary.some(w=>!!w.image||!!w.assetRefs?.image)?'暂无词图':'资源准备中'):'暂无单词'
  return reject(reason,'本课缺少该活动所需资源，请选择文字练习。')
 }
 if(kind==='story'&&!pack.stories?.some(story=>story.id===lesson.storyId))return reject('暂无故事','本课暂无已审核故事，请选择其他练习。')
 return {available:true,reason:'',message:'',wordIds}
}
