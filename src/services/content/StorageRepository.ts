import {courseRegistry,archiveStatus,registerCourse,wordById,resourceStatus} from './ContentRegistry'
import {validateCourse,type CoursePack} from '../../../packages/content_schema/course'
import {readStorage,writeStorage} from '../storage'
import {sha256} from './digest'
import {saveMedia,readMedia,mediaUrl,saveManifest,readManifest,removeContentVersion} from './MediaRepository'
import {assertPublicMedia} from '../course-import/PublicMediaAudit'
interface CatalogEntry {courseId:string;key:string;previousKey?:string;previousAliases?:Record<string,string>;versions?:{key:string;aliases:Record<string,string>}[];archived:boolean;aliases:Record<string,string>}
export const CATALOG_KEY='wordpal.content.catalog.v2'
function validateConflicts(pack:CoursePack,aliases:Record<string,string>){for(const e of pack.vocabulary){const old=wordById[aliases[e.id]||e.id];if(aliases[e.id]&&!old)throw new Error('复用词条不存在。');if(old&&(old.word.toLowerCase()!==e.lemma.toLowerCase()||old.meaning!==e.meaning||old.pos!==(e.pos||'')))throw new Error('词条 ID 冲突，不能覆盖已有词义或词性。')}}
async function commitCourse(pack:CoursePack,aliases:Record<string,string>,mediaReady:boolean){
 if(validateCourse(pack).some(i=>i.severity==='error'))throw new Error('课程校验未通过，请重新预览。')
 if(pack.sources.some(s=>s.rightsStatus==='pending-review'))throw new Error('请先完成本机用途与来源声明。')
 if(pack.assets.length&&!mediaReady)throw new Error('媒体课程需通过 ZIP 导入并校验资源。')
 if(['starter','original-primary'].includes(pack.courseId))throw new Error('内置课程 ID 保留，请使用新的课程 ID。')
 validateConflicts(pack,aliases)
 const serialized=JSON.stringify(pack),key='wordpal.content.pack.'+pack.courseId+'.'+sha256(serialized).slice(0,16),catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]),old=catalog.find(entry=>entry.courseId===pack.courseId)
 if(old&&old.key!==key){const previous=readStorage<CoursePack|null>(old.key,null);if(previous?.contentVersion===pack.contentVersion){const stable=(value:CoursePack)=>JSON.stringify({...value,sources:value.sources.map(({declaredAt,...source})=>source)});if(stable(previous)===stable(pack)&&JSON.stringify(old.aliases)===JSON.stringify(aliases))return old.key;throw new Error('该内容版本已安装且内容不同，请增加 contentVersion 后重新导入。')}}
 await saveManifest(key,pack)
 writeStorage(key,pack);const readback=uni.getStorageSync(key);if(sha256(readback)!==sha256(serialized))throw new Error('候选课程读回校验失败。')
 if(old?.key===key&&JSON.stringify(old.aliases)===JSON.stringify(aliases))return key
 const versions=old?[...(old.versions||[]),{key:old.key,aliases:old.aliases}].filter((v,i,a)=>a.findIndex(other=>other.key===v.key)===i):[]
 const next=catalog.filter(entry=>entry.courseId!==pack.courseId);next.push({courseId:pack.courseId,key,previousKey:old?.key,previousAliases:old?.aliases,versions,archived:false,aliases})
 writeStorage(CATALOG_KEY,next);registerCourse(pack,()=>'',aliases);archiveStatus[pack.courseId]=false;return key
}
function candidateKey(pack:CoursePack){return 'wordpal.content.pack.'+pack.courseId+'.'+sha256(JSON.stringify(pack)).slice(0,16)}
async function discardUnreferencedCandidate(key:string,pack:CoursePack){
 const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[])
 if(catalog.some(entry=>entry.key===key||entry.previousKey===key||entry.versions?.some(version=>version.key===key)))return
 await removeContentVersion(key,pack)
}
export async function installTextCourse(pack:CoursePack,aliases:Record<string,string>={}){
 try{return await commitCourse(pack,aliases,false)}catch(error){try{await discardUnreferencedCandidate(candidateKey(pack),pack)}catch{}throw error}
}
export async function installMediaCourse(pack:CoursePack,files:Record<string,Uint8Array>,aliases:Record<string,string>={},progress?:(completed:number,total:number)=>void){
 const key='wordpal.content.pack.'+pack.courseId+'.'+sha256(JSON.stringify(pack)).slice(0,16)
 if(validateCourse(pack).some(i=>i.severity==='error'))throw new Error('课程校验未通过。');validateConflicts(pack,aliases)
 if(pack.sources.some(s=>s.rightsStatus==='pending-review')||['starter','original-primary'].includes(pack.courseId))throw new Error('先确认课程来源并使用非内置课程 ID。')
 try{
  await saveMedia(key,pack,files,progress);await readMedia(key,pack);const installedKey=await commitCourse(pack,aliases,true)
  if(installedKey!==key){await readMedia(installedKey,pack);await discardUnreferencedCandidate(key,pack)}
  registerCourse(pack,id=>mediaUrl(installedKey,id,pack),aliases);return installedKey
 }catch(error){try{await discardUnreferencedCandidate(key,pack)}catch{}throw error}
}
export async function hydrateMedia(){for(const entry of readStorage<CatalogEntry[]>(CATALOG_KEY,[])){
 for(const version of [...(entry.versions||[]),...(entry.previousKey?[{key:entry.previousKey,aliases:entry.previousAliases||{}}]:[]),{key:entry.key,aliases:entry.aliases}].filter((v,i,all)=>all.slice(i+1).every(other=>other.key!==v.key))){
  try{const durable=await readManifest(version.key),pack=durable||readStorage<CoursePack|null>(version.key,null);if(pack){if(validateCourse(pack).some(i=>i.severity==='error'))continue;if(pack.assets.length)await readMedia(version.key,pack);registerCourse(pack,id=>mediaUrl(version.key,id,pack),version.aliases);if(version.key===entry.key)resourceStatus[entry.courseId]=''}}
  catch{if(version.key===entry.key)resourceStatus[entry.courseId]='部分本机资源无法读取，文字练习仍可使用；请重新导入原课程包。'}
 }
}}
export function setArchived(courseId:string,archived:boolean){if(courseId==='starter')throw new Error('默认兼容课程需保留。');const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]);if(!catalog.some(e=>e.courseId===courseId)){if(courseRegistry[courseId]){writeStorage('wordpal.content.archive.'+courseId,archived);archiveStatus[courseId]=archived;return}throw new Error('课程不存在。')}writeStorage(CATALOG_KEY,catalog.map(e=>e.courseId===courseId?{...e,archived}:e));archiveStatus[courseId]=archived}
export async function rollbackCourse(courseId:string){const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]),entry=catalog.find(e=>e.courseId===courseId);if(!entry?.previousKey)throw new Error('没有可恢复的上一内容版本。');const pack=readStorage<CoursePack|null>(entry.previousKey,null);if(!pack||validateCourse(pack).some(i=>i.severity==='error'))throw new Error('上一内容版本无法读取。');const aliases=entry.previousAliases||{};validateConflicts(pack,aliases);if(pack.assets.length)await readMedia(entry.previousKey,pack);writeStorage(CATALOG_KEY,catalog.map(e=>e===entry?{...e,key:entry.previousKey!,previousKey:entry.key,aliases,previousAliases:entry.aliases}:e));registerCourse(pack,id=>mediaUrl(entry.previousKey!,id,pack),aliases)}
export async function exportCourse(courseId:string){const pack=courseRegistry[courseId];if(!pack||validateCourse(pack,{publicUse:true}).some(i=>i.severity==='error'))throw new Error('这份课程仅允许本机使用，不能公开导出。');const entry=readStorage<CatalogEntry[]>(CATALOG_KEY,[]).find(e=>e.courseId===courseId);const files=pack.assets.length&&entry?await readMedia(entry.key,pack):{};assertPublicMedia(pack,files);return {pack,files}}
export async function clearInstalledCourses(){const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]);for(const entry of catalog)for(const version of [{key:entry.key},...(entry.versions||[]),...(entry.previousKey?[{key:entry.previousKey}]:[])]){const pack=readStorage<CoursePack|null>(version.key,null);if(pack)await removeContentVersion(version.key,pack)}writeStorage(CATALOG_KEY,[]);uni.removeStorageSync('wordpal.content.archive.original-primary');for(const id of Object.keys(courseRegistry))if(!['starter','original-primary'].includes(id))delete courseRegistry[id];for(const id of Object.keys(archiveStatus))delete archiveStatus[id]}
