import type {Database} from '../../stores/profile'
import {courseRegistry} from '../content/ContentRegistry'
import {identityMapping} from '../content/IdentityModel'
import {sha256} from '../content/digest'
import {readStorage,writeStorage} from './index'
import {validateDatabase,POINTER_KEY} from './MigrationV1toV2'
export const IDENTITY_BACKUP_KEY='wordpal.identity.upgrade.v1'
interface IdentitySnapshot {version:1;database:Database;preferences:unknown;mapping:ReturnType<typeof identityMapping>;digest:string}
export function createIdentitySnapshot(database:Database,preferences:unknown):IdentitySnapshot{
 const copy=JSON.parse(JSON.stringify(database)) as Database
 if(!validateDatabase(copy))throw new Error('学习档案无法校验，已保留原数据。')
 const prefs=preferences as {favorites?:string[];later?:string[]}|null
 const ids=[...Object.keys(copy.cards),...copy.history.map(a=>a.wordId),...(Array.isArray(prefs?.favorites)?prefs.favorites:[]),...(Array.isArray(prefs?.later)?prefs.later:[])]
 const mapping=identityMapping(ids,Object.values(courseRegistry))
 return {version:1,database:copy,preferences,mapping,digest:sha256(JSON.stringify({database:copy,preferences,mapping}))}
}
/** This upgrade only records the identity map; the live database is never rewritten. */
export function ensureIdentitySnapshot(database:Database){
 if(uni.getStorageSync(IDENTITY_BACKUP_KEY)){if(!validateIdentitySnapshot(readStorage(IDENTITY_BACKUP_KEY,null)))throw new Error('已有升级备份无法校验，原学习数据已保留。');return false}
 const snapshot=createIdentitySnapshot(database,readStorage('wordpal.wordbook.preferences.v1',{favorites:[],later:[]}))
 writeStorage(IDENTITY_BACKUP_KEY,snapshot)
 if(uni.getStorageSync(IDENTITY_BACKUP_KEY)!==JSON.stringify(snapshot))throw new Error('升级备份读回失败，学习记录仍保留。')
 return true
}
export function validateIdentitySnapshot(value:unknown):value is IdentitySnapshot{
 const s=value as IdentitySnapshot
 return s?.version===1&&validateDatabase(s.database)&&Array.isArray(s.mapping)&&s.mapping.every(row=>row&&typeof row.oldWordId==='string'&&row.oldWordId===row.lexemeId&&Array.isArray(row.occurrenceIds))&&sha256(JSON.stringify({database:s.database,preferences:s.preferences,mapping:s.mapping}))===s.digest
}
/** Explicit recovery only: verify an immutable candidate before moving the active pointer. */
export function restoreIdentitySnapshot(snapshot:unknown){
 if(!validateIdentitySnapshot(snapshot)||snapshot.database.version!==2)throw new Error('升级快照校验未通过。')
 const key='wordpal.database.restore.'+snapshot.digest.slice(0,16)
 writeStorage(key,snapshot.database)
 if(uni.getStorageSync(key)!==JSON.stringify(snapshot.database))throw new Error('恢复候选读回失败，原档案保留。')
 const previous=uni.getStorageSync('wordpal.wordbook.preferences.v1')
 try{writeStorage('wordpal.wordbook.preferences.v1',snapshot.preferences);writeStorage(POINTER_KEY,{version:2,key})}
 catch(error){if(previous)uni.setStorageSync('wordpal.wordbook.preferences.v1',previous);else uni.removeStorageSync('wordpal.wordbook.preferences.v1');throw error}
 return key
}
