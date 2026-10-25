import type {Word} from '../../packages/core_learning'

export const wordDetailIcons={heading:'heading',speaker:'speaker',example:'example',familiarity:'familiarity',nextReview:'next-review',lastStudy:'last-study',reviewDate:'review-date',sources:'sources',phonics:'phonics',favorite:'favorite',practice:'practice',more:'more',help:'help'} as const
export function wordDetailIcon(name:keyof typeof wordDetailIcons){return '/static/icons/word-detail/'+wordDetailIcons[name]+'.png'}

/** Preserve supplied sentences and pair translations only with their own English text. */
export function detailExamples(word:Word){
 const rows=(word.examples||[]).filter(row=>row.en?.trim()).map(row=>({en:row.en.trim(),zh:row.zh?.trim()||''}))
 const primary=word.example?.trim()
 if(primary&&!rows.some(row=>row.en===primary))rows.unshift({en:primary,zh:''})
 return [...new Map(rows.map(row=>[row.en,row])).values()]
}
/** The main audio and IPA already appear in the hero; only distinct alternatives remain. */
export function detailPronunciations(word:Word){
 const urls=new Set([word.audio]),ipas=new Set([word.ipa?.trim()].filter(Boolean))
 return ([{label:'英式发音',url:word.audioUK,ipa:word.phoneticUK},{label:'美式发音',url:word.audioUS,ipa:word.phoneticUS}]).flatMap(row=>{
  const url=row.url&&!urls.has(row.url)?row.url:'',ipa=row.ipa?.trim()&&!ipas.has(row.ipa.trim())?row.ipa.trim():''
  if(url)urls.add(url);if(ipa)ipas.add(ipa)
  return url||ipa?[{label:row.label,url,ipa}]:[]
 })
}
