import type {Word,Lesson,LearningMode} from '../core_learning'
export type RightsStatus='pending-review'|'private-use-declared'|'redistribution-approved'
export interface SourceRecord {id:string;type:'author-created'|'authorized'|'user-provided';rightsStatus:RightsStatus;attribution:string;url?:string;revision?:string;textLicense?:string|null;imageLicense?:string|null;audioLicense?:string|null;declaredAt?:string;fileSha256?:string}
export interface VocabularyEntry {id:string;language:'en';lemma:string;meaning:string;pos?:string;ipa?:string;senseId?:string;sourceId:string;sourceWordId?:string;phonics?:string[];phonemes?:string[];syllables?:string[];example?:string;acceptedSpellings?:string[];assetRefs?:{audio?:string;image?:string};audio?:string;image?:string;phoneticUK?:string;phoneticUS?:string;audioUK?:string;audioUS?:string;examples?:{en:string;zh:string}[];tags?:string[];learningLevel?:number;order?:number}
export interface CourseLesson {id:string;title:string;wordIds:string[];objectives?:string[];activities?:string[];storyId?:string;examples?:Record<string,string>;phonicsRuleIds?:string[]}
export interface CourseUnit {id:string;title:string;lessons:CourseLesson[];order?:number}
export interface CourseAsset {id:string;path:string;mediaType:'audio/wav'|'audio/mpeg'|'image/png'|'image/jpeg';bytes:number;sha256:string;sourceId:string;license:string}
export interface CourseStory {id:string;title:string;sentences:string[];targetWordIds:string[];questions?:{question:string;options:string[];answer:number}[];audioRef?:string}
export interface PhonicsRule {id:string;graphemes:string[];phonemes:string[];explanation:string;exampleWordIds:string[];prerequisites?:string[]}
export interface CoursePack {schemaVersion:2;courseId:string;contentVersion:string;title:string;route:'theme'|'textbook'|'phonics';abilityLevels:string[];grade?:number|null;semester?:string|null;publisher?:string|null;editionYear?:number|null;edition?:string;startGrade?:1|3|null;sources:SourceRecord[];vocabulary:VocabularyEntry[];units:CourseUnit[];assets:CourseAsset[];stories?:CourseStory[];phonicsRules?:PhonicsRule[]}
export interface Issue {severity:'error'|'warning';line:number;field:string;message:string;fix:string}
const idPattern=/^[a-z][a-z0-9-]*$/
export const safeRelativePath=(value:string)=>!!value&&!value.startsWith('/')&&!value.includes('\\')&&!value.includes(':')&&!value.split('/').some(part=>!part||part==='.'||part==='..')&&!/[%?#\u0000-\u001f]/.test(value)
const unsafeText=(value:string)=>/<\s*(?:script|iframe|object|embed|img|svg)|javascript:|\bon\w+\s*=/i.test(value)
export function validateCourse(input:unknown,options:{publicUse?:boolean}={}):Issue[]{
 const issues:Issue[]=[],add=(field:string,message:string,fix:string,line=1,severity:Issue['severity']='error')=>issues.push({severity,line,field,message,fix})
 if(!input||typeof input!=='object'||Array.isArray(input)){add('course','课程必须是 JSON 对象。','使用课程模板。');return issues}
 const c=input as CoursePack
 const text=(value:unknown)=>typeof value==='string'&&!!value.trim()&&value.length<=10000
 const texts=(value:unknown)=>Array.isArray(value)&&value.every(v=>typeof v==='string')
 // Reject malformed container types before following any nested references.
 for(const field of ['sources','vocabulary','units','assets','stories','phonicsRules'] as const){if(c[field]!==undefined&&!Array.isArray(c[field]))add(field,'字段必须为数组。','按课程模板修正字段类型。')}
 for(const field of ['sources','vocabulary','units','assets'] as const)if(!Array.isArray(c[field]))add(field,'缺少必需列表。','按课程模板补齐字段，无媒体时使用空数组。')
 if(issues.length)return issues

 for(const source of c.sources||[])if(!source||typeof source!=='object'||!text(source.id)||!text(source.attribution))add('sources','来源格式不合法。','补充来源 ID 和文字说明。')
 for(const w of c.vocabulary||[]){if(!w||typeof w!=='object'){add('vocabulary','词条必须为对象。','使用词条模板。');continue}for(const field of ['phonics','phonemes','syllables','acceptedSpellings'] as const)if(w[field]!==undefined&&!texts(w[field]))add(field,'词条列表必须由文字组成。','移除无效值或补齐文字。');for(const field of ['id','lemma','meaning','sourceId'] as const)if(!text(w[field]))add(field,'词条必填字段不完整。','填写文字字段。');for(const field of ['pos','ipa','example','audio','image','senseId','sourceWordId'] as const)if(w[field]!==undefined&&typeof w[field]!=='string')add(field,'词条字段类型不合法。','使用文字或省略字段。');if(w.assetRefs&&(typeof w.assetRefs!=='object'||Array.isArray(w.assetRefs)||Object.values(w.assetRefs).some(v=>!text(v))))add('assetRefs','资源引用格式不合法。','使用文字资源 ID。')}
 for(const u of c.units||[]){if(!u||!text(u.id)||!text(u.title)||!Array.isArray(u.lessons)||!u.lessons.length){add('units','单元需要标题和至少一课。','补齐单元课节。');continue}for(const l of u.lessons){if(!l||!text(l.id)||!text(l.title)||!texts(l.wordIds)||!l.wordIds.length){add('lessons','课节需要文字 ID、标题和目标词。','补齐课节。');continue}for(const field of ['objectives','activities','phonicsRuleIds'] as const)if(l[field]!==undefined&&!texts(l[field]))add(field,'课节列表格式不合法。','使用文字列表。');if(l.examples&&(typeof l.examples!=='object'||Array.isArray(l.examples)||Object.values(l.examples).some(v=>!text(v))))add('examples','例句映射不合法。','使用词条 ID 到例句的映射。')}}
 for(const s of c.stories||[])if(!s||!text(s.id)||!text(s.title)||!texts(s.sentences)||!s.sentences.length||!texts(s.targetWordIds)||s.questions!==undefined&&(!Array.isArray(s.questions)||s.questions.some(q=>!q||!text(q.question)||!texts(q.options))))add('stories','故事字段类型不合法。','使用文本句子、目标词和理解题数组。')
 for(const r of c.phonicsRules||[])if(!r||!text(r.id)||!texts(r.graphemes)||!texts(r.phonemes)||!texts(r.exampleWordIds)||r.prerequisites!==undefined&&!texts(r.prerequisites))add('phonicsRules','拼读规则格式不合法。','使用文字片段和有效词条引用。')
 for(const a of c.assets||[])if(!a||!text(a.id)||!text(a.path))add('assets','媒体字段不合法。','使用资源清单模板。')
 if(issues.length)return issues
 const known=(value:object,fields:string,field:string)=>{const allowed=new Set(fields.split(' '));for(const key of Object.keys(value))if(!allowed.has(key))add(field+'.'+key,'字段未在课程契约中定义。','移除额外信息或通过字段映射转成标准课程字段。')}
 known(c,'schemaVersion courseId contentVersion title route abilityLevels grade semester publisher editionYear edition startGrade sources vocabulary units assets stories phonicsRules','course')
 for(const s of c.sources)known(s,'id type rightsStatus attribution url revision textLicense imageLicense audioLicense declaredAt fileSha256','source')
 for(const w of c.vocabulary){known(w,'id language lemma meaning pos ipa senseId sourceId sourceWordId phonics phonemes syllables example acceptedSpellings assetRefs audio image phoneticUK phoneticUS audioUK audioUS examples tags learningLevel order','word');if(w.assetRefs)known(w.assetRefs,'audio image','assetRefs')}
 for(const u of c.units){known(u,'id title lessons order','unit');for(const l of u.lessons)known(l,'id title wordIds objectives activities storyId examples phonicsRuleIds','lesson')}
 for(const a of c.assets)known(a,'id path mediaType bytes sha256 sourceId license','asset')
 for(const s of c.stories||[]){known(s,'id title sentences targetWordIds questions audioRef','story');for(const q of s.questions||[])known(q,'question options answer','question')}
 for(const r of c.phonicsRules||[])known(r,'id graphemes phonemes explanation exampleWordIds prerequisites','rule')
 if(issues.length)return issues
 if(c.schemaVersion!==2)add('schemaVersion','不支持课程格式版本。','使用 schemaVersion 2。')
 for(const field of ['courseId','contentVersion','title','route'] as const)if(typeof c[field]!=='string'||!c[field].trim())add(field,'缺少课程信息。','填写 '+field+'。')
 if(!idPattern.test(c.courseId||''))add('courseId','课程 ID 不合法。','使用小写字母、数字和连字符。')
 if(!['theme','phonics','textbook'].includes(c.route))add('route','路线不合法。','选择 theme、phonics 或 textbook。')
 if(!Array.isArray(c.abilityLevels)||!c.abilityLevels.length||c.abilityLevels.some(value=>!/^L[1-5]$/.test(value)))add('abilityLevels','能力等级不合法。','选择 L1–L5。')
 if(c.route==='textbook'&&(!text(c.publisher)||!(c.editionYear||text(c.edition))||!Number.isInteger(c.grade)||c.grade!<1||c.grade!>6||!text(c.semester)))add('textbook','教材信息不完整。','填写出版社、版本名称或年份、年级和册次，或改为主题词表。')
 if(c.editionYear!==undefined&&c.editionYear!==null&&(!Number.isInteger(c.editionYear)||c.editionYear<1900||c.editionYear>2200)||c.grade!==undefined&&c.grade!==null&&(!Number.isInteger(c.grade)||c.grade<1||c.grade>6)||c.startGrade===3&&c.grade!=null&&c.grade<3)add('textbook','年份、年级或起始年级冲突。','使用真实版本年份和对应起点的年级，不猜测缺失值。')
 if(c.edition!==undefined&&!text(c.edition)||c.startGrade!==undefined&&c.startGrade!==null&&![1,3].includes(c.startGrade))add('textbook','版次或起始年级不合法。','使用明确的版本文字；起始年级仅为 1、3 或尚未核对的 null。')
 for(const u of c.units)if(u.order!==undefined&&(!Number.isInteger(u.order)||u.order<1))add('unit.order','单元顺序不合法。','使用从 1 开始的整数。')
 for(const w of c.vocabulary){for(const field of ['phoneticUK','phoneticUS','audioUK','audioUS'] as const)if(w[field]!==undefined&&typeof w[field]!=='string')add(field,'字段需为文字。','使用已核对的音标或离线资源地址。');if(w.tags!==undefined&&!texts(w.tags)||w.examples!==undefined&&(!Array.isArray(w.examples)||w.examples.some(e=>!e||!text(e.en)||!text(e.zh)||Object.keys(e).some(k=>!['en','zh'].includes(k)))))add('word.metadata','例句或标签格式不合法。','使用 en/zh 例句及文字标签。');if(w.learningLevel!==undefined&&(!Number.isInteger(w.learningLevel)||w.learningLevel<1||w.learningLevel>5)||w.order!==undefined&&(!Number.isInteger(w.order)||w.order<1))add('word.level','词条等级或顺序不合法。','等级使用 1–5，顺序使用正整数。')}
 if(!Array.isArray(c.sources)||!c.sources.length)add('sources','缺少来源声明。','在导入向导填写来源及用途。')
 const sources=new Map<string,SourceRecord>()
 for(const source of Array.isArray(c.sources)?c.sources:[]){if(!source||!idPattern.test(source.id)||sources.has(source.id)){add('sources','来源 ID 缺失或重复。','使用唯一来源 ID。');continue}sources.set(source.id,source);if(!['pending-review','private-use-declared','redistribution-approved'].includes(source.rightsStatus)||!['author-created','authorized','user-provided'].includes(source.type)||!source.attribution)add('sources','来源与用途不完整。','补充来源类型、说明与许可状态。');if(options.publicUse&&(source.rightsStatus!=='redistribution-approved'||!source.textLicense||!source.revision))add('sources','来源尚不能公开发行。','审核许可并固定内容版本；本机声明不能作为再发布许可。')}
 if(!Array.isArray(c.vocabulary)||!c.vocabulary.length||c.vocabulary.length>2000)add('vocabulary','词条数量需为 1–2000。','拆分词表或添加词义条目。')
 const ids=new Set<string>()
 for(const [i,w]of (Array.isArray(c.vocabulary)?c.vocabulary:[]).entries()){
  const line=i+2
  if(!w||!idPattern.test(w.id||'')||ids.has(w.id)){add('vocabulary.id','词条 ID 不合法或重复。','为每个词义提供稳定且唯一的 ID。',line);continue}ids.add(w.id)
  if(w.language!=='en'||typeof w.lemma!=='string'||!w.lemma.trim()||typeof w.meaning!=='string'||!w.meaning.trim())add('vocabulary','缺少英文或中文词义。','填写 language、lemma 和 meaning。',line)
  if(!sources.has(w.sourceId))add('sourceId','词条来源不存在。','引用 sources 中的 ID。',line)
  if((w.phonics?.length||0)!==(w.phonemes?.length||0))add('phonics','拼读片段和音素数量不同。','补全已审核片段，或移除不完整拼读。',line)
  if([w.audio,w.audioUK,w.audioUS,w.image].some(path=>path&&(!path.startsWith('/static/')||!safeRelativePath(path.slice(1)))))add('media','媒体不是安全的离线资源。','用 assetRefs 引用已列入清单的资源。',line)
 }
 const unitIds=new Set<string>(),lessonIds=new Set<string>()
 if(!Array.isArray(c.units)||!c.units.length)add('units','缺少单元。','按模板填写单元与课节。')
 for(const u of Array.isArray(c.units)?c.units:[]){if(!u||!idPattern.test(u.id||'')||unitIds.has(u.id)||!u.title||!Array.isArray(u.lessons)){add('units','单元 ID、标题或课节不合法。','补充唯一单元 ID 和课节。');continue}unitIds.add(u.id);for(const l of u.lessons){if(!l||!idPattern.test(l.id||'')||lessonIds.has(l.id)||!l.title||!Array.isArray(l.wordIds)||!l.wordIds.length){add('lessons','课节结构或 ID 不合法。','同一课程内提供唯一课节 ID、标题和目标词。');continue}lessonIds.add(l.id);if(l.wordIds.some(id=>!ids.has(id)))add('wordIds','课节引用缺失词条。','在 vocabulary 补词或修正引用。');if(new Set(l.wordIds).size!==l.wordIds.length)add('wordIds','课节有重复词引用。','清洗时去重。')}}
 if(!Array.isArray(c.assets))add('assets','缺少资源清单。','无媒体时使用空数组。')
 const assetIds=new Set<string>(),assetPaths=new Set<string>()
 for(const a of Array.isArray(c.assets)?c.assets:[]){if(!a||assetIds.has(a.id)||assetPaths.has(a.path)||!idPattern.test(a.id)||!safeRelativePath(a.path)||!['audio/wav','audio/mpeg','image/png','image/jpeg'].includes(a.mediaType)||!Number.isInteger(a.bytes)||a.bytes<=0||a.bytes>5*1024*1024||!/^([a-f0-9]{64})$/.test(a.sha256)||!a.license||!sources.has(a.sourceId))add('assets','媒体清单不合法。','核对相对路径、类型、大小、SHA256 与独立许可。');assetIds.add(a?.id);assetPaths.add(a?.path)}
 if((c.assets||[]).reduce((n,a)=>n+(a.bytes||0),0)>50*1024*1024)add('assets','媒体总量超过 50 MiB。','拆分课程资源。')
 for(const w of Array.isArray(c.vocabulary)?c.vocabulary:[])for(const ref of Object.values(w?.assetRefs||{}))if(!assetIds.has(ref))add('assetRefs','媒体引用不存在。','补充清单或移除该引用。')
 const storyIds=new Set<string>()
 for(const story of c.stories||[]){if(!idPattern.test(story.id)||storyIds.has(story.id)||!story.title||!Array.isArray(story.sentences)||!story.sentences.length||story.targetWordIds.some(id=>!ids.has(id)))add('stories','故事结构或目标词不合法。','补齐文本和有效词条。');storyIds.add(story.id);if(story.questions?.some(q=>!q.question||q.options.length<2||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length))add('questions','理解题答案不合法。','提供至少两个选项和有效答案下标。')}
 for(const s of c.stories||[])if(s.audioRef&&!c.assets.some(a=>a.id===s.audioRef&&a.mediaType.startsWith('audio/')))add('audioRef','故事音频引用不存在或类型错误。','补齐音频清单。')
 for(const word of c.vocabulary)for(const type of ['audio','image'] as const)if(word.assetRefs?.[type]&&!c.assets.some(a=>a.id===word.assetRefs![type]&&a.mediaType.startsWith(type+'/')))add('assetRefs','词条资源的媒体类型不一致。','将音频与词图引用指向相应类型的资源。')
 const ruleIds=new Set((c.phonicsRules||[]).map(rule=>rule.id))
 if(ruleIds.size!==(c.phonicsRules||[]).length)add('phonicsRules','拼读规则 ID 重复。','使用唯一规则 ID。')
 for(const rule of c.phonicsRules||[])if(!idPattern.test(rule.id)||rule.graphemes.length!==rule.phonemes.length||!rule.graphemes.length||rule.exampleWordIds.some(id=>!ids.has(id))||rule.prerequisites?.some(id=>!ruleIds.has(id)))add('phonicsRules','拼读规则引用不合法。','使用已审核规则和有效前置规则。')
 for(const u of c.units||[])for(const l of u?.lessons||[]){if(l.storyId&&!storyIds.has(l.storyId))add('storyId','故事引用不存在。','补充故事或删除引用。');if(l.phonicsRuleIds?.some(id=>!ruleIds.has(id)))add('phonicsRuleIds','拼读规则不存在。','补充规则或删除引用。');if(Object.keys(l.examples||{}).some(id=>!l.wordIds.includes(id)))add('examples','例句引用不属于本课。','仅为本课目标词提供例句。')}
 const seen=new Set<object>();const inspect=(value:unknown,depth=0,location='course')=>{if(depth>20){add('safety','内容嵌套过深。','使用课程模板。');return}if(typeof value==='string'&&(unsafeText(value)||/^[a-z]:[\\/]$/i.test(value)||/\b[a-z]:[\\/][a-z0-9_.~\\-]|\bfile:\/\/|\/(?:Users|home)\//i.test(value)))add('safety','内容包含执行内容或本机路径（'+location+'）。','只保留课程文字及资源相对引用。');else if(value&&typeof value==='object'){if(seen.has(value)){add('safety','内容存在循环引用。','使用普通 JSON 数据。');return}seen.add(value);for(const [key,v]of Object.entries(value)){if(['__proto__','constructor','prototype','cards','history','rewardIds','pets','gems','token','password'].includes(key))add('safety','课程包含不允许的字段。','只导入内容，不导入个人记录、凭据或程序。');inspect(v,depth+1,location+'.'+key)}}};inspect(c)
 return issues
}
export function courseLessons(c:CoursePack):Lesson[]{return c.units.flatMap(u=>u.lessons.map(l=>({id:l.id,name:l.title,unit:u.title,unitId:u.id,courseId:c.courseId,wordIds:l.wordIds,activities:l.activities,storyId:l.storyId,phonicsRuleIds:l.phonicsRuleIds,examples:l.examples})))}
export function entryWord(entry:VocabularyEntry,c:CoursePack,resource:(id:string)=>string=()=> '',firstLesson?:Lesson):Word{
 const lesson=firstLesson||courseLessons(c).find(l=>l.wordIds.includes(entry.id))
 return {id:entry.id,word:entry.lemma.normalize('NFC').trim(),meaning:entry.meaning.trim(),pos:entry.pos||'',ipa:entry.ipa||entry.phoneticUS||entry.phoneticUK||'',phonics:entry.phonics||[],phonemes:entry.phonemes||[],syllables:entry.syllables||[],audio:entry.assetRefs?.audio?resource(entry.assetRefs.audio):entry.audio||entry.audioUS||entry.audioUK||'',image:entry.assetRefs?.image?resource(entry.assetRefs.image):entry.image||'',example:entry.example||entry.examples?.[0]?.en||'',unit:lesson?.unit||'',lesson:lesson?.id||'',difficulty:entry.learningLevel||1,distractors:[],acceptedSpellings:entry.acceptedSpellings,senseId:entry.senseId||entry.id,sourceId:entry.sourceId,phoneticUK:entry.phoneticUK,phoneticUS:entry.phoneticUS,audioUK:entry.audioUK,audioUS:entry.tags?.includes('offline-system-en-us')&&entry.assetRefs?.audio?resource(entry.assetRefs.audio):entry.audioUS,examples:entry.examples,tags:entry.tags,learningLevel:entry.learningLevel}
}
export function availableModes(word:Word,all:Word[],sound=true):LearningMode[]{const modes:LearningMode[]=['flash','spell'];const choices=all.filter(w=>w.id!==word.id&&w.meaning!==word.meaning&&w.word!==word.word);if(choices.length)modes.push('connect');if(sound&&word.audio){modes.push('dictation');if(choices.length)modes.push('listen')}return modes}
