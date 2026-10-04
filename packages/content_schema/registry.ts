import {reactive,computed} from 'vue'
import legacy from '../../src/content/starter.json'
import original from '../../src/content/courses/original-primary.json'
import type {Word} from '../core_learning'
import {entryWord,courseLessons,validateCourse,type CoursePack} from './course'
import {readStorage} from '../local_storage'
export const words=reactive([...(legacy.words as Word[])])
export const wordById=reactive(Object.fromEntries(words.map(word=>[word.id,word])) as Record<string,Word>)
export const starterPack:CoursePack={schemaVersion:2,courseId:'starter',contentVersion:'1.0.0',title:'原创启蒙课程',route:'theme',abilityLevels:['L1','L2'],sources:[{id:'wordpal-original',type:'author-created',rightsStatus:'redistribution-approved',textLicense:legacy.license,attribution:'WordPal 原创教学示例',revision:'starter-1'}],vocabulary:legacy.words.map(w=>({id:w.id,language:'en',lemma:w.word,meaning:w.meaning,pos:w.pos,ipa:w.ipa,phonics:w.phonics,phonemes:w.phonemes,syllables:w.syllables,audio:w.audio,image:w.image,example:w.example,sourceId:'wordpal-original',senseId:w.id})),units:[...new Set(legacy.lessons.map(l=>l.unit))].map((title,i)=>({id:'u0'+(i+1),title,lessons:legacy.lessons.filter(l=>l.unit===title).map(l=>({id:l.id,title:l.name,wordIds:l.wordIds,activities:['flash','connect','listen','spell','dictation']}))})),assets:[]}
export const courseRegistry=reactive<Record<string,CoursePack>>({starter:starterPack,'original-primary':original as CoursePack})
export const archiveStatus=reactive<Record<string,boolean>>({})
export const sourceMappings=reactive<Record<string,string>>({})
const assetUrls=reactive(new Map<string,string>()),versions=new Map<string,CoursePack>()
export const resourceStatus=reactive<Record<string,string>>({})
export function registerCourse(pack:CoursePack,resolver:(id:string)=>string=()=>'',aliases:Record<string,string>={}){
 const errors=validateCourse(pack).filter(i=>i.severity==='error');if(errors.length)throw new Error(errors[0].message)
 const copy=JSON.parse(JSON.stringify(pack)) as CoursePack
 const mappings:Record<string,string>={}
 for(const entry of copy.vocabulary){const mapped=aliases[entry.id]||entry.id;mappings[entry.sourceId+':'+(entry.sourceWordId||entry.id)]=mapped;entry.id=mapped}
 copy.vocabulary=copy.vocabulary.filter((entry,index,all)=>all.findIndex(e=>e.id===entry.id)===index)
 for(const u of copy.units)for(const l of u.lessons){l.wordIds=[...new Set(l.wordIds.map(id=>aliases[id]||id))];if(l.examples)l.examples=Object.fromEntries(Object.entries(l.examples).map(([id,text])=>[aliases[id]||id,text]))}
 for(const story of copy.stories||[])story.targetWordIds=story.targetWordIds.map(id=>aliases[id]||id)
 for(const rule of copy.phonicsRules||[])rule.exampleWordIds=rule.exampleWordIds.map(id=>aliases[id]||id)
 const firstLessons=new Map<string,ReturnType<typeof courseLessons>[number]>();for(const lesson of courseLessons(copy))for(const id of lesson.wordIds)if(!firstLessons.has(id))firstLessons.set(id,lesson)
 const prepared=copy.vocabulary.map(entry=>entryWord(entry,copy,resolver,firstLessons.get(entry.id)))
 for(const word of prepared){const old=wordById[word.id];if(old&&(old.word.toLowerCase()!==word.word.toLowerCase()||old.meaning!==word.meaning||old.pos!==word.pos))throw new Error('已有词条 ID 对应其他词义或词性，请保留旧词并使用新 ID。')}
 Object.assign(sourceMappings,mappings)
 for(const word of prepared){const old=wordById[word.id];if(!old){wordById[word.id]=word;words.push(word)}else if(copy.courseId!=='starter'){if(!old.audio&&word.audio)old.audio=word.audio;if(!old.ipa&&word.ipa)old.ipa=word.ipa;if(!old.phonics.length&&word.phonics.length){old.phonics=word.phonics;old.phonemes=word.phonemes}if(word.acceptedSpellings)old.acceptedSpellings=[...new Set([...(old.acceptedSpellings||[]),...word.acceptedSpellings])]}}
 versions.set(copy.courseId+'@'+copy.contentVersion,copy);courseRegistry[copy.courseId]=copy
 for(const a of copy.assets)assetUrls.set(copy.courseId+'@'+copy.contentVersion+':'+a.id,resolver(a.id))
}
export const getCourseLessons=(courseId:string)=>courseLessons(courseRegistry[courseId]||starterPack)
export const getCourseWordIds=(courseId:string)=>[...new Set((courseRegistry[courseId]||starterPack).vocabulary.map(w=>w.id))]
const membershipIndex=computed(()=>{const index:Record<string,{courseId:string;courseTitle:string;unitId:string;unitTitle:string;lessonId:string;lessonTitle:string;example?:string}[]>={};for(const c of Object.values(courseRegistry)){const entries=new Map(c.vocabulary.map(e=>[e.id,e]));for(const u of c.units)for(const l of u.lessons)for(const id of l.wordIds)(index[id]??=[]).push({courseId:c.courseId,courseTitle:c.title,unitId:u.id,unitTitle:u.title,lessonId:l.id,lessonTitle:l.title,example:l.examples?.[id]||entries.get(id)?.example})}return index})
export const courseMemberships=(wordId:string)=>membershipIndex.value[wordId]||[]
export const resolveCourseAsset=(courseId:string,id:string,version=courseRegistry[courseId]?.contentVersion)=>assetUrls.get(courseId+'@'+version+':'+id)||''
export function resolveFrozenWord(word:Word|undefined,courseId?:string,version?:string):Word|undefined{
 if(!word||!courseId||!version)return word
 const entry=versions.get(courseId+'@'+version)?.vocabulary.find(e=>e.id===word.id)
 if(!entry)return word
 // Resource handles expire across reloads; the frozen text and answers stay intact.
 return {...word,audio:entry.assetRefs?.audio?resolveCourseAsset(courseId,entry.assetRefs?.audio,version):word.audio,image:entry.assetRefs?.image?resolveCourseAsset(courseId,entry.assetRefs?.image,version):word.image}
}
export function getCourseWord(courseId:string,id:string){const c=courseRegistry[courseId],entry=c?.vocabulary.find(w=>w.id===id),canonical=wordById[id];if(!entry)return canonical;const word=entryWord(entry,c,assetId=>resolveCourseAsset(courseId,assetId));return {...canonical,...word,audio:word.audio||canonical?.audio||'',ipa:word.ipa||canonical?.ipa||'',phonics:word.phonics.length?word.phonics:canonical?.phonics||[],phonemes:word.phonemes.length?word.phonemes:canonical?.phonemes||[],syllables:word.syllables.length?word.syllables:canonical?.syllables||[],distractors:canonical?.distractors||[],acceptedSpellings:[...new Set([...(canonical?.acceptedSpellings||[]),...(word.acceptedSpellings||[])])]}}
export const courseSnapshot=(id:string,version:string)=>versions.get(id+'@'+version)||courseRegistry[id]
export function loadCourseRegistry(){
 // Rebuild a cold registry from durable catalogs, including archived versions.
 for(const id of Object.keys(wordById))delete wordById[id]
 Object.assign(wordById,Object.fromEntries((JSON.parse(JSON.stringify(legacy.words)) as Word[]).map(w=>[w.id,w])))
 words.splice(0,words.length,...Object.values(wordById))
 for(const id of Object.keys(courseRegistry))delete courseRegistry[id]
 for(const id of Object.keys(archiveStatus))delete archiveStatus[id]
 for(const id of Object.keys(sourceMappings))delete sourceMappings[id]
 versions.clear();assetUrls.clear()
 registerCourse(starterPack);registerCourse(original as CoursePack)
 archiveStatus['original-primary']=readStorage<boolean>('wordpal.content.archive.original-primary',false)
 const catalog=readStorage<{key:string;previousKey?:string;versions?:{key:string;aliases:Record<string,string>}[];archived:boolean;aliases?:Record<string,string>;previousAliases?:Record<string,string>}[]>('wordpal.content.catalog.v2',[])
 for(const record of catalog){try{for(const version of record.versions||[]){const older=readStorage<CoursePack|null>(version.key,null);if(older)registerCourse(older,()=>'',version.aliases)}if(record.previousKey){const previous=readStorage<CoursePack|null>(record.previousKey,null);if(previous)registerCourse(previous,()=>'',record.previousAliases)}const pack=readStorage<CoursePack|null>(record.key,null);if(pack){registerCourse(pack,()=>'',record.aliases);archiveStatus[pack.courseId]=record.archived}}catch{ /* Invalid local candidates do not replace usable built-in courses. */ }}
}
