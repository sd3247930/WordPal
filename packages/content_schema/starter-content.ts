import legacy from '../../src/content/starter.json'
import type {Word} from '../core_learning'
import {validateCourse,type CoursePack} from './course'

const base:CoursePack={schemaVersion:2,courseId:'starter',contentVersion:'1.0.0',title:'原创启蒙课程',route:'theme',abilityLevels:['L1','L2'],sources:[{id:'wordpal-original',type:'author-created',rightsStatus:'redistribution-approved',textLicense:legacy.license,attribution:'WordPal 原创教学示例',revision:'starter-1'}],vocabulary:legacy.words.map(w=>({id:w.id,language:'en',lemma:w.word,meaning:w.meaning,pos:w.pos,ipa:w.ipa,phonics:w.phonics,phonemes:w.phonemes,syllables:w.syllables,audio:w.audio,image:w.image,example:w.example,sourceId:'wordpal-original',senseId:w.id})),units:[...new Set(legacy.lessons.map(l=>l.unit))].map((title,i)=>({id:'u0'+(i+1),title,lessons:legacy.lessons.filter(l=>l.unit===title).map(l=>({id:l.id,title:l.name,wordIds:l.wordIds,activities:['flash','connect','listen','spell','dictation']}))})),assets:[]}
export const starterPack:CoursePack=JSON.parse(JSON.stringify(base))
const originals=new Map((legacy.words as Word[]).map(word=>[word.id,word]))
let replacement:CoursePack|null=null

/** A local replacement updates presentation/media without replacing any learning identity or lesson cursor. */
export function configureStarterCourse(pack:CoursePack|null){
 if(pack){
  if(validateCourse(pack).some(issue=>issue.severity==='error')||pack.courseId!=='starter'||pack.route!==base.route||pack.vocabulary.length!==base.vocabulary.length)throw new Error('原创启蒙课程替换包无效。')
  if(pack.vocabulary.some(entry=>{const old=originals.get(entry.id);return !old||entry.lemma!==old.word||(entry.pos||'')!==old.pos}))throw new Error('替换必须保留原创启蒙课程的单词 ID、英文和词性。')
  const structure=(course:CoursePack)=>course.units.map(unit=>({id:unit.id,lessons:unit.lessons.map(lesson=>({id:lesson.id,wordIds:lesson.wordIds}))}))
  if(JSON.stringify(structure(pack))!==JSON.stringify(structure(base)))throw new Error('替换必须保留原创启蒙课程的单元和课节归属。')
 }
 replacement=pack?JSON.parse(JSON.stringify(pack)):null
 for(const key of Object.keys(starterPack))delete (starterPack as unknown as Record<string,unknown>)[key]
 Object.assign(starterPack,JSON.parse(JSON.stringify(replacement||base)))
}
export const localStarterEntry=(id:string)=>replacement?.vocabulary.find(entry=>entry.id===id)
export const originalStarterWord=(id:string)=>originals.get(id)
export const starterAssetUrl=(id:string)=>{const asset=starterPack.assets.find(asset=>asset.id===id);return asset?'/static/local-starter-media/'+asset.path:''}

/** Only the configured starter translation and its previous spelling are equivalent; unrelated senses stay strict. */
export function wordIdentityMatches(old:Pick<Word,'id'|'word'|'meaning'|'pos'>,next:Pick<Word,'word'|'meaning'|'pos'>){
 if(old.word.toLowerCase()!==next.word.toLowerCase()||old.pos!==next.pos)return false
 if(old.meaning===next.meaning)return true
 const original=originals.get(old.id),entry=localStarterEntry(old.id)
 if(!original||!entry||old.word!==original.word||old.pos!==original.pos)return false
 const meanings=[original.meaning,entry.meaning]
 return meanings.includes(old.meaning)&&meanings.includes(next.meaning)
}
