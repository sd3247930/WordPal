import {readStorage,writeStorage} from '../storage'
import {archiveStatus,courseRegistry,installationStatus,evictCourse} from '../content/ContentRegistry'
import {DIRECTORY_KEY,directoryCache,type CourseDescriptor} from '../content/CourseDirectory'
import {CATALOG_KEY} from '../content/StorageRepository'
import {removeContentVersion} from '../content/MediaRepository'
import {markCourseDeleted,isUserDeleted} from '../../../packages/content_schema/course-lifecycle'
import {courseRemovalScope} from '../content/CourseRemovalData'
import {useProfileStore} from '../../stores/profile'

const CLEANUP_KEY='wordpal.content.cleanup.v1'
const INSTALL_KEY='wordpal.content.installation.v1'
const ARCHIVE_PREFIX='wordpal.content.archive.'
const PACK_PREFIX='wordpal.content.pack.'
const RETAINED_KEY='wordpal.content.retained-lexemes.v1'
const TRIM_AUDIT_KEY='wordpal.content.trim-audit.v1'
const PACK_KEY_PATTERN=/^wordpal\.content\.pack\.[a-z][a-z0-9-]*\.[a-f0-9]{16}$/
export type TrimTarget='catalogEntry'|'directoryDescriptor'|'archiveKey'|'cleanupEntry'|'installationKey'|'packKey'|'mediaDirectory'
export interface TrimResult{ok:boolean;courseId:string;cleaned:Record<TrimTarget,boolean>;residues:string[];retainedWordCount:number;message:string}
export interface SourceResidue{courseId:string;residues:Record<TrimTarget,boolean>}
interface CleanupEntry{key:string;pack?:{courseId?:string}}

/** 裁剪审计持久化：面板重启后仍能看到逐册清理结果。 */
export function readTrimAudit():TrimResult[]{
 const stored=readStorage<Record<string,TrimResult>>(TRIM_AUDIT_KEY,{})
 return Object.values(stored)
}
function writeTrimAudit(result:TrimResult){
 const stored=readStorage<Record<string,TrimResult>>(TRIM_AUDIT_KEY,{})
 writeStorage(TRIM_AUDIT_KEY,{...stored,[result.courseId]:result})
}

/** 目标列表为空时（H5/测试环境）返回空数组，键级残留仍由 readStorage 判定。 */
function storageKeys():string[]{
 try{const api=(uni as unknown as {getStorageInfoSync?:()=>{keys?:string[]}}).getStorageInfoSync;const info=api?.();return Array.isArray(info?.keys)?info!.keys!:[]}catch{return []}
}
/** 包键形如 wordpal.content.pack.<courseId>.<16 位摘要>，从既有键里取回该册的包键。 */
function packKeysOf(id:string,keys:string[]){return keys.filter(key=>key.startsWith(PACK_PREFIX)&&key.slice(PACK_PREFIX.length).split('.').slice(0,-1).join('.')===id)}
function ownedDirectory(id:string,name:string){return new RegExp('^wordpal-content-pack-'+id+'-[a-f0-9]{16}$').test(name)}
async function packDirectoryNames():Promise<string[]>{
 if(typeof plus==='undefined')return []
 try{
  return await new Promise<string[]>(resolve=>plus.io.resolveLocalFileSystemURL('_doc/wordpal/packs/',(entry:any)=>{entry.createReader().readEntries((entries:any[])=>resolve(entries.map(item=>item.name)),()=>resolve([]))},()=>resolve([])))
 }catch{return []}
}
async function removePackKey(key:string){
 if(!PACK_KEY_PATTERN.test(key))return false
 await removeContentVersion(key,{assets:[]} as never)
 return true
}

/** 只读核查：返回该册在内容源各环节的残留情况。 */
export async function courseSourceResidue(id:string):Promise<SourceResidue>{
 const keys=storageKeys()
 const catalog=readStorage<{courseId:string}[]>(CATALOG_KEY,[])
 const directory=readStorage<Record<string,CourseDescriptor>>(DIRECTORY_KEY,{})
 const cleanup=readStorage<CleanupEntry[]>(CLEANUP_KEY,[])
 const installation=readStorage<Record<string,string>>(INSTALL_KEY,{})
 const directories=(await packDirectoryNames()).filter(name=>ownedDirectory(id,name))
 const packKeys=packKeysOf(id,keys)
 return {courseId:id,residues:{
  catalogEntry:catalog.some(entry=>entry.courseId===id),
  directoryDescriptor:!!directory[id],
  archiveKey:readStorage<boolean|null>(ARCHIVE_PREFIX+id,null)!==null,
  cleanupEntry:cleanup.some(item=>item?.pack?.courseId===id),
  installationKey:id in installation,
  packKey:packKeys.length>0||directories.length>0,
  mediaDirectory:directories.length>0
 }}
}

/**
 * 内容源裁剪：仅对该册已卸载（不在注册表、不在安装目录）时生效。
 * 先备份并移除本册专属记录，共享词卡和其他教材记录保持不变。
 */
export async function trimCourseSource(id:string):Promise<TrimResult>{
 const cleaned:Record<TrimTarget,boolean>={catalogEntry:false,directoryDescriptor:false,archiveKey:false,cleanupEntry:false,installationKey:false,packKey:false,mediaDirectory:false}
 const directory=readStorage<Record<string,CourseDescriptor>>(DIRECTORY_KEY,{})
 const descriptor=directory[id]
 const retainedIds=new Set(readStorage<{id:string}[]>(RETAINED_KEY,[]).map(word=>word.id))
 const previous=readStorage<Record<string,TrimResult>>(TRIM_AUDIT_KEY,{})[id]
 let retainedWordCount=descriptor?descriptor.positions.filter(position=>retainedIds.has(position.lexemeId)).length:previous?.retainedWordCount||0
 if(courseRegistry[id])return {ok:false,courseId:id,cleaned,residues:['该册仍在注册表中，请先卸载该册'],retainedWordCount,message:'该册尚未卸载，请先逐册卸载再裁剪内容源。'}
 const catalog=readStorage<{courseId:string}[]>(CATALOG_KEY,[])
 if(catalog.some(entry=>entry.courseId===id))return {ok:false,courseId:id,cleaned,residues:['该册仍在安装目录中，请先卸载该册'],retainedWordCount,message:'该册尚未卸载，请先逐册卸载再裁剪内容源。'}
 const profile=useProfileStore(),scope=courseRemovalScope(id,profile.db)
 if(descriptor)retainedWordCount=scope.wordIds.filter(wordId=>retainedIds.has(wordId)&&!scope.exclusiveWordIds.includes(wordId)).length
 if(!profile.removeCourseRecords([scope]))return {ok:false,courseId:id,cleaned,residues:['本册记录备份或清理未完成'],retainedWordCount,message:'请释放存储空间后重试，原内容仍保留。'}
 if(!isUserDeleted(id))markCourseDeleted(id,descriptor?.contentVersion?[descriptor.contentVersion]:[])
 const affected=new Set(scope.wordIds),retained=readStorage<{id:string}[]>(RETAINED_KEY,[])
 writeStorage(RETAINED_KEY,retained.filter(word=>!affected.has(word.id)))
 evictCourse(id,scope.wordIds)
 if(directory[id]){const next={...directory};delete next[id];writeStorage(DIRECTORY_KEY,next);delete directoryCache[id];cleaned.directoryDescriptor=true}
 if(readStorage<boolean|null>(ARCHIVE_PREFIX+id,null)!==null){writeStorage(ARCHIVE_PREFIX+id,null);delete archiveStatus[id];cleaned.archiveKey=true}
 const cleanup=readStorage<CleanupEntry[]>(CLEANUP_KEY,[])
 const remaining=cleanup.filter(item=>item?.pack?.courseId!==id)
 if(remaining.length!==cleanup.length){writeStorage(CLEANUP_KEY,remaining);cleaned.cleanupEntry=true}
 const installation=readStorage<Record<string,string>>(INSTALL_KEY,{})
 if(id in installation){const next={...installation};delete next[id];writeStorage(INSTALL_KEY,next);delete installationStatus[id];cleaned.installationKey=true}
 for(const key of packKeysOf(id,storageKeys()))if(await removePackKey(key)){cleaned.packKey=true;cleaned.mediaDirectory=true}
 for(const name of (await packDirectoryNames()).filter(item=>ownedDirectory(id,item))){
  const hash=name.slice(-16)
  if(await removePackKey(PACK_PREFIX+id+'.'+hash)){cleaned.packKey=true;cleaned.mediaDirectory=true}
 }
 // 提交点：安装目录写回与该册无关的剩余条目（卸载时已写过一次，此处保证幂等）。
 if(catalog.length)writeStorage(CATALOG_KEY,catalog.filter(entry=>entry.courseId!==id))
 cleaned.catalogEntry=true
 const residue=await courseSourceResidue(id)
 const residues=Object.entries(residue.residues).filter(([,present])=>present).map(([field])=>field)
 const result:TrimResult={ok:residues.length===0,courseId:id,cleaned,residues,retainedWordCount,message:residues.length===0?'内容源已裁剪，该册不再显示。':'仍有残留：'+residues.join('、')}
 writeTrimAudit(result)
 return result
}
