import type {LearningMode,Word} from '../../../packages/core_learning'
/** Clues guide recall without returning the meaning or the complete hidden answer. */
export function studyHint(word:Pick<Word,'word'|'pos'>,mode:LearningMode):string {
 const letters=Array.from(word.word).filter(char=>/[a-z]/i.test(char)),parts=word.word.trim().split(/\s+/).filter(Boolean).length
 if(mode==='spell'||mode==='dictation'){
  if(!letters.length)return '先想想单词的发音，再尝试输入；也可以再听一遍。'
  const length=parts>1?`这是一个 ${parts} 部分的短语，共 ${letters.length} 个英文字母。`:`这个单词有 ${letters.length} 个英文字母。`
  return length+(letters.length>1?`首字母是 ${letters[0].toLowerCase()}，其余部分请自己试一试。`:'可以再听一遍发音，再自己试一试。')
 }
 if(mode==='listen')return '再听一遍完整发音，留意开头和结尾的声音，再逐一比较选项。'
 if(mode==='connect'){
  const pos=word.pos?.trim(),kind=pos?.startsWith('n.')?'名词':pos?.startsWith('v.')?'动词':pos?.startsWith('adj.')?'形容词':''
  return (kind?`留意词性：这是一个${kind}。`:'先想想这个单词通常用在什么情景。')+'比较每个选项，找到最贴切的意思。'
 }
 return '先听一遍发音，试着联想画面，再用自己的话说一说词义。'
}
