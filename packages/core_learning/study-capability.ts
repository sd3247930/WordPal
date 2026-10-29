import type {LearningMode,Word,StudyCapability} from './index'
const normalized=(text:string)=>text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
export function validStudyAudio(url:string){
 return typeof url==='string'&&!!url.trim()&&!/(?:placeholder|about:blank|example\.(?:com|org)|javascript:)/i.test(url)&&(/^(?:_doc\/\S+|_www\/\S+|blob:\S+|data:audio\/[^,]+,\S+|https?:\/\/[^/\s]+\S*|content:\/\/[^/\s]+\/\S+|file:\/\/\/\S+)$/i.test(url)||!url.includes('..')&&/^\/?[a-z0-9_./%-]+\.(?:wav|mp3|ogg|m4a)(?:[?#].*)?$/i.test(url))
}
/** Resource capability is separate from the independent-practice level permission. */
export function studyCapability(word:Word|undefined,mode:LearningMode,choices:Word[],sound=true):StudyCapability{
 const missing=(reason:string):StudyCapability=>({status:'unavailable',reason})
 if(!word||!word.word.trim()||!word.meaning.trim())return missing('这道题还缺少单词或释义素材，暂时不能完成。')
 if(['spell','dictation'].includes(mode)&&!/[a-z]/i.test(word.word))return missing('这个词条暂不支持当前拼写输入，请在教材工具中检查词形。')
 if(['connect','listen'].includes(mode)){
  const meanings=new Set([normalized(word.meaning)]),spellings=new Set([normalized(word.word)]),ids=new Set([word.id]);let count=0
  for(const other of choices){const meaning=normalized(other.meaning),spelling=normalized(other.word);if(!meaning||!spelling||ids.has(other.id)||meanings.has(meaning)||spellings.has(spelling))continue;ids.add(other.id);meanings.add(meaning);spellings.add(spelling);count++}
  if(count<2)return missing('这道题还缺少至少两个不同的配对选项，暂时不能完成；可以先练其他内容。')
 }
 if(['listen','dictation'].includes(mode)){
  if(!sound)return missing('学习声音已关闭，开启声音后可继续这道听力题。')
  if(!validStudyAudio(word.audio))return missing('这道题还缺少可用发音，暂时不能完成；可以先练其他内容。')
 }
 return {status:'ready'}
}
