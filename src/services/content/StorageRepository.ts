import {courseRegistry,archiveStatus,registerCourse,wordById,resourceStatus,isBundledCourse,installationStatus,wordIdentityMatches,evictCourse,restoreBundledCourse,isUserDeleted,resolveCourseAsset} from './ContentRegistry'
import {directoryCache,DIRECTORY_KEY,type CourseDescriptor} from './CourseDirectory'
import {markCourseDeleted,restoreDeletedCourse,courseGeneration,assertCourseGeneration,deletedCourses,assertContentReadable,courseIdFromPackKey} from '../../../packages/content_schema/course-lifecycle'
import {courseRemovalScope} from './CourseRemovalData'
import {validateCourse,type CoursePack} from '../../../packages/content_schema/course'
import {readStorage,writeStorage} from '../storage'
import {sha256,sha256Async} from './digest'
import {saveMedia,readMedia,readBundledMedia,mediaUrl,saveManifest,readManifest,removeContentVersion,storedMediaVersions} from './MediaRepository'
import {assertPublicMedia} from '../course-import/PublicMediaAudit'
import {assertImportActive,reportImport,importScheduler,type ImportWork} from '../course-import/ImportTask'
interface CatalogEntry {courseId:string;key:string;previousKey?:string;previousAliases?:Record<string,string>;versions?:{key:string;aliases:Record<string,string>}[];archived:boolean;aliases:Record<string,string>}
export const CATALOG_KEY='wordpal.content.catalog.v2'
function validateConflicts(pack:CoursePack,aliases:Record<string,string>){for(const e of pack.vocabulary){const old=wordById[aliases[e.id]||e.id];if(aliases[e.id]&&!old)throw new Error('复用词条不存在。');if(old&&!wordIdentityMatches(old,{word:e.lemma,meaning:e.meaning,pos:e.pos||''}))throw new Error('词条 ID 冲突，不能覆盖已有词义或词性。')}}
async function commitCourse(pack:CoursePack,aliases:Record<string,string>,mediaReady:boolean,generation:number,work?:ImportWork){
 assertImportActive(work)
 if(validateCourse(pack).some(i=>i.severity==='error'))throw new Error('课程校验未通过，请重新预览。')
 if(pack.sources.some(s=>s.rightsStatus==='pending-review'))throw new Error('请先完成本机用途与来源声明。')
 if(pack.assets.length&&!mediaReady)throw new Error('媒体课程需通过 ZIP 导入并校验资源。')
 if(isBundledCourse(pack.courseId)&&!isUserDeleted(pack.courseId))throw new Error('内置课程 ID 保留，请使用新的课程 ID。')
 validateConflicts(pack,aliases)
 const serialized=JSON.stringify(pack),digest=await sha256Async(serialized,work),key='wordpal.content.pack.'+pack.courseId+'.'+digest.slice(0,16)
 await saveManifest(key,pack,work)
 assertImportActive(work)
 assertCourseGeneration(pack.courseId,generation)
 const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]),old=catalog.find(entry=>entry.courseId===pack.courseId)
 if(old&&old.key!==key){const previous=readStorage<CoursePack|null>(old.key,null);if(previous?.contentVersion===pack.contentVersion){const stable=(value:CoursePack)=>JSON.stringify({...value,sources:value.sources.map(({declaredAt,...source})=>source)});if(stable(previous)===stable(pack)&&JSON.stringify(old.aliases)===JSON.stringify(aliases))return old.key;throw new Error('该内容版本已安装且内容不同，请增加 contentVersion 后重新导入。')}}
 writeStorage(key,pack);const readback=uni.getStorageSync(key);if(await sha256Async(readback,work)!==digest)throw new Error('候选课程读回校验失败。')
 if(old?.key===key&&JSON.stringify(old.aliases)===JSON.stringify(aliases)&&!isUserDeleted(pack.courseId))return key
 const versions=old?[...(old.versions||[]),{key:old.key,aliases:old.aliases}].filter((v,i,a)=>a.findIndex(other=>other.key===v.key)===i):[]
 const next=catalog.filter(entry=>entry.courseId!==pack.courseId);next.push({courseId:pack.courseId,key,previousKey:old?.key,previousAliases:old?.aliases,versions,archived:false,aliases})
 assertCourseGeneration(pack.courseId,generation);assertImportActive(work);validateConflicts(pack,aliases)
 writeStorage(CATALOG_KEY,next)
 try{restoreDeletedCourse(pack.courseId)}catch(error){writeStorage(CATALOG_KEY,catalog);throw error}
 registerCourse(pack,()=>'',aliases);archiveStatus[pack.courseId]=false;installationStatus[pack.courseId]='installed';return key
}
function candidateKey(pack:CoursePack){return 'wordpal.content.pack.'+pack.courseId+'.'+sha256(JSON.stringify(pack)).slice(0,16)}
async function discardUnreferencedCandidate(key:string,pack:CoursePack){
 const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[])
 if(catalog.some(entry=>entry.key===key||entry.previousKey===key||entry.versions?.some(version=>version.key===key)))return
 await removeContentVersion(key,pack)
}
export async function installTextCourse(pack:CoursePack,aliases:Record<string,string>={},work?:ImportWork){
 if(isBundledCourse(pack.courseId)&&!isUserDeleted(pack.courseId))throw new Error('内置课程 ID 保留，请使用新的课程 ID。')
 const generation=courseGeneration(pack.courseId)
 installationStatus[pack.courseId]='installing'
 try{reportImport(work,'committing',0,1);await importScheduler(work)(true);const key=await commitCourse(pack,aliases,false,generation,work);assertContentReadable(pack.courseId);installationStatus[pack.courseId]='installed';work?.onProgress?.({phase:'done',completed:1,total:1,unit:'items'});return key}catch(error){installationStatus[pack.courseId]=isUserDeleted(pack.courseId)?'notInstalled':readStorage<CatalogEntry[]>(CATALOG_KEY,[]).some(e=>e.courseId===pack.courseId)?'installed':'failed';try{await discardUnreferencedCandidate(candidateKey(pack),pack)}catch{}throw error}
}
export async function installMediaCourse(pack:CoursePack,files:Record<string,Uint8Array>,aliases:Record<string,string>={},progress?:(completed:number,total:number)=>void,work?:ImportWork){
 assertImportActive(work)
 const generation=courseGeneration(pack.courseId)
 const key='wordpal.content.pack.'+pack.courseId+'.'+sha256(JSON.stringify(pack)).slice(0,16)
 if(validateCourse(pack).some(i=>i.severity==='error'))throw new Error('课程校验未通过。');validateConflicts(pack,aliases)
 if(pack.sources.some(s=>s.rightsStatus==='pending-review')||isBundledCourse(pack.courseId)&&!isUserDeleted(pack.courseId))throw new Error('先确认课程来源并使用非内置课程 ID。')
 installationStatus[pack.courseId]='installing'
 try{
  await saveMedia(key,pack,files,progress,work);assertCourseGeneration(pack.courseId,generation);await readMedia(key,pack,true,{...work,retainFiles:false});reportImport(work,'committing',0,1);await importScheduler(work)(true);const installedKey=await commitCourse(pack,aliases,true,generation,work)
  const committedGeneration=courseGeneration(pack.courseId)
  if(installedKey!==key){await readMedia(installedKey,pack);await discardUnreferencedCandidate(key,pack)}
  assertCourseGeneration(pack.courseId,committedGeneration);registerCourse(pack,id=>mediaUrl(installedKey,id,pack),aliases);installationStatus[pack.courseId]='installed';work?.onProgress?.({phase:'done',completed:1,total:1,unit:'items'});return installedKey
 }catch(error){installationStatus[pack.courseId]=isUserDeleted(pack.courseId)?'notInstalled':readStorage<CatalogEntry[]>(CATALOG_KEY,[]).some(e=>e.courseId===pack.courseId)?'installed':'failed';try{await discardUnreferencedCandidate(key,pack)}catch{}throw error}
}
export async function hydrateMedia(){for(const entry of readStorage<CatalogEntry[]>(CATALOG_KEY,[])){
 if(isUserDeleted(entry.courseId))continue
 const generation=courseGeneration(entry.courseId)
 for(const version of [...(entry.versions||[]),...(entry.previousKey?[{key:entry.previousKey,aliases:entry.previousAliases||{}}]:[]),{key:entry.key,aliases:entry.aliases}].filter((v,i,all)=>all.slice(i+1).every(other=>other.key!==v.key))){
  try{const durable=await readManifest(version.key),pack=durable||readStorage<CoursePack|null>(version.key,null);if(pack){if(validateCourse(pack).some(i=>i.severity==='error'))continue;if(pack.assets.length)await readMedia(version.key,pack);if(isUserDeleted(entry.courseId)||courseGeneration(entry.courseId)!==generation||!readStorage<CatalogEntry[]>(CATALOG_KEY,[]).some(current=>current.courseId===entry.courseId&&current.key===entry.key))continue;registerCourse(pack,id=>mediaUrl(version.key,id,pack),version.aliases);if(version.key===entry.key)resourceStatus[entry.courseId]=''}}
  catch{if(!isUserDeleted(entry.courseId)&&courseGeneration(entry.courseId)===generation&&version.key===entry.key)resourceStatus[entry.courseId]='部分本机资源无法读取，文字练习仍可使用；请重新导入原课程包。'}
 }
}}
export function setArchived(courseId:string,archived:boolean){assertContentReadable(courseId);if(courseId==='starter')throw new Error('默认兼容课程需保留。');const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]);if(!catalog.some(e=>e.courseId===courseId)){if(courseRegistry[courseId]){writeStorage('wordpal.content.archive.'+courseId,archived);archiveStatus[courseId]=archived;return}throw new Error('课程不存在。')}writeStorage(CATALOG_KEY,catalog.map(e=>e.courseId===courseId?{...e,archived}:e));archiveStatus[courseId]=archived}
export async function rollbackCourse(courseId:string){assertContentReadable(courseId);const generation=courseGeneration(courseId),catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]),entry=catalog.find(e=>e.courseId===courseId);if(!entry?.previousKey)throw new Error('没有可恢复的上一内容版本。');const pack=readStorage<CoursePack|null>(entry.previousKey,null);if(!pack||validateCourse(pack).some(i=>i.severity==='error'))throw new Error('上一内容版本无法读取。');const aliases=entry.previousAliases||{};validateConflicts(pack,aliases);if(pack.assets.length)await readMedia(entry.previousKey,pack);assertCourseGeneration(courseId,generation);writeStorage(CATALOG_KEY,readStorage<CatalogEntry[]>(CATALOG_KEY,[]).map(e=>e.courseId===courseId?{...e,key:entry.previousKey!,previousKey:entry.key,aliases,previousAliases:entry.aliases}:e));registerCourse(pack,id=>mediaUrl(entry.previousKey!,id,pack),aliases)}
/** Local backups retain all source restrictions; publishing still requires redistribution approval. */
export async function exportCourse(courseId:string,options:{purpose?:'public'|'local-backup'}={}){
 assertContentReadable(courseId)
 const generation=courseGeneration(courseId),current=courseRegistry[courseId],publicUse=options.purpose!=='local-backup'
 if(!current)throw new Error('课程不存在，请刷新课程管理。')
 const pack=JSON.parse(JSON.stringify(current)) as CoursePack
 const issue=validateCourse(pack,{publicUse}).find(i=>i.severity==='error')
 if(issue)throw new Error(publicUse?'这份课程仅允许本机使用，不能公开导出。':'课程内容校验未通过：'+issue.message)
 const entry=readStorage<CatalogEntry[]>(CATALOG_KEY,[]).find(e=>e.courseId===courseId)
 const files=pack.assets.length?(entry?await readMedia(entry.key,pack):await readBundledMedia(pack,id=>resolveCourseAsset(courseId,id,pack.contentVersion))):{}
 assertCourseGeneration(courseId,generation)
 if(publicUse)assertPublicMedia(pack,files)
 return {pack,files}
}
export async function clearInstalledCourses(){const catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[]);for(const entry of catalog)for(const version of [{key:entry.key},...(entry.versions||[]),...(entry.previousKey?[{key:entry.previousKey}]:[])]){const pack=readStorage<CoursePack|null>(version.key,null);if(pack)await removeContentVersion(version.key,pack)}writeStorage(CATALOG_KEY,[]);for(const id of Object.keys(courseRegistry))if(isBundledCourse(id))uni.removeStorageSync('wordpal.content.archive.'+id);for(const id of Object.keys(courseRegistry))if(!isBundledCourse(id))delete courseRegistry[id];for(const id of Object.keys(archiveStatus))delete archiveStatus[id]}

function setInstallationState(id:string,state:'installed'|'notInstalled'){
 const next={...readStorage<Record<string,string>>('wordpal.content.installation.v1',{}),[id]:state};writeStorage('wordpal.content.installation.v1',next);installationStatus[id]=state
}
export function enableBundledCourse(id:string){
 if(!isBundledCourse(id))throw new Error('请重新导入原课程包。')
 const previous=readStorage<Record<string,string>>('wordpal.content.installation.v1',{}),state=installationStatus[id]
 try{setInstallationState(id,'installed');if(isUserDeleted(id))restoreBundledCourse(id);if(archiveStatus[id])setArchived(id,false)}
 catch(error){writeStorage('wordpal.content.installation.v1',previous);if(state)installationStatus[id]=state;else delete installationStatus[id];throw error}
}
interface Cleanup {key:string;pack:Pick<CoursePack,'courseId'|'assets'>}
const cleanupKey='wordpal.content.cleanup.v1'
const removalPendingKey='wordpal.content.removal.pending.v1'
const retainedKey='wordpal.content.retained-lexemes.v1'
function saveIfChanged(key:string,value:unknown){if(uni.getStorageSync(key)!==JSON.stringify(value))writeStorage(key,value)}
function storedVersionKeys(id:string){
 const entries=readStorage<CatalogEntry[]>(CATALOG_KEY,[]).filter(entry=>entry.courseId===id)
 let keys:string[]=[];try{keys=uni.getStorageInfoSync?.().keys||[]}catch{}
 return [...new Set([...entries.flatMap(entry=>[entry.key,...(entry.versions||[]).map(version=>version.key),...(entry.previousKey?[entry.previousKey]:[])]),...keys.filter(key=>courseIdFromPackKey(key)===id)])]
}
function purgeDeletedArtifacts(id:string){
 const scope=courseRemovalScope(id),versions=storedVersionKeys(id)
 if(!deletedCourses[id]?.deletedAt)markCourseDeleted(id,deletedCourses[id]?.versions||[])
 const pending=readStorage<Cleanup[]>(cleanupKey,[])
 for(const key of versions){const pack=readStorage<CoursePack|null>(key,null);if(pack&&!pending.some(item=>item.key===key))pending.push({key,pack:{courseId:id,assets:pack.assets||[]} as CoursePack})}
 saveIfChanged(cleanupKey,pending)
 const directory=readStorage<Record<string,CourseDescriptor>>(DIRECTORY_KEY,{})
 if(directory[id]){delete directory[id];writeStorage(DIRECTORY_KEY,directory)}
 delete directoryCache[id]
 const installation=readStorage<Record<string,string>>('wordpal.content.installation.v1',{})
 if(id in installation){delete installation[id];writeStorage('wordpal.content.installation.v1',installation)}
 const affected=new Set(scope.wordIds),retained=readStorage<typeof wordById[string][]>(retainedKey,[])
 saveIfChanged(retainedKey,retained.filter(word=>!affected.has(word.id)))
 saveIfChanged(CATALOG_KEY,readStorage<CatalogEntry[]>(CATALOG_KEY,[]).filter(entry=>entry.courseId!==id))
 if(uni.getStorageSync('wordpal.content.archive.'+id))uni.removeStorageSync('wordpal.content.archive.'+id)
 evictCourse(id,scope.wordIds)
}
/** A durable removal journal allows a failed file deletion to be retried after restart. */
export function pendingCleanupCount(){return readStorage<Cleanup[]>(cleanupKey,[]).length+readStorage<string[]>(removalPendingKey,[]).filter(isUserDeleted).length}
export async function retryCourseCleanup(){
 const failed:string[]=[]
 for(const id of Object.keys(deletedCourses)){try{purgeDeletedArtifacts(id);const pending=readStorage<Cleanup[]>(cleanupKey,[]);for(const key of await storedMediaVersions(id))if(!pending.some(item=>item.key===key))pending.push({key,pack:{courseId:id,assets:[]}});saveIfChanged(cleanupKey,pending)}catch{failed.push(id)}}
 saveIfChanged(removalPendingKey,failed)
 const pending=readStorage<Cleanup[]>(cleanupKey,[]),remaining:Cleanup[]=[],catalog=readStorage<CatalogEntry[]>(CATALOG_KEY,[])
 for(const item of pending){if(catalog.some(e=>e.key===item.key||e.previousKey===item.key||e.versions?.some(v=>v.key===item.key)))continue;try{await removeContentVersion(item.key,item.pack)}catch{remaining.push(item)}}
 saveIfChanged(cleanupKey,remaining);return remaining.length+failed.length
}
export async function uninstallCourseContent(id:string,retainedIds:string[]=[]){
 if(id==='starter')throw new Error('默认启蒙课程需保留。')
 const pack=courseRegistry[id]
 if(!pack&&!isUserDeleted(id))throw new Error('教材不存在。')
 const scope=courseRemovalScope(id),exclusive=new Set(scope.exclusiveWordIds),ids=new Set(retainedIds)
 const retainedWordCount=scope.wordIds.filter(wordId=>ids.has(wordId)&&!exclusive.has(wordId)).length
 const bundled=isBundledCourse(id)
 if(!isUserDeleted(id)){
  writeStorage('wordpal.content.removal.scope.'+id,{wordIds:scope.wordIds})
  const pending=[...new Set([...readStorage<string[]>(removalPendingKey,[]),id])]
  writeStorage(removalPendingKey,pending)
  // This tombstone is the commit point. Cleanup failures stay hidden and are retried after restart.
  markCourseDeleted(id,[...(pack?[pack.contentVersion]:[]),...storedVersionKeys(id).flatMap(key=>{const old=readStorage<CoursePack|null>(key,null);return old?[old.contentVersion]:[]})])
 }
 evictCourse(id,scope.wordIds)
 installationStatus[id]='notInstalled'
 try{return {bundled,pendingCleanup:await retryCourseCleanup(),retainedWordCount}}
 catch{return {bundled,pendingCleanup:Math.max(1,pendingCleanupCount()),retainedWordCount}}
}
/**
 * 内容源裁剪前的一次性安全网：把已学词条从仍然可用的课程里复制到保留词条。
 * 仅供仍可用教材备份共享词；删除教材的专属词不会进入可查询的保留词库。
 */
export function retainLearnedLexemes(retainedIds:string[]){
 const retained=readStorage<typeof wordById[string][]>('wordpal.content.retained-lexemes.v1',[]),ids=new Set(retainedIds),seen=new Set(retained.map(word=>word.id))
 let added=0
 for(const pack of Object.values(courseRegistry))for(const word of pack.vocabulary){
  if(!ids.has(word.id)||seen.has(word.id))continue
  const canonical=wordById[word.id]
  if(!canonical)continue
  retained.push({...canonical,audio:canonical.audio.startsWith('/static/')?canonical.audio:'',audioUS:'',audioUK:'',image:''})
  seen.add(word.id);added++
 }
 if(added)writeStorage('wordpal.content.retained-lexemes.v1',retained)
 return added
}
