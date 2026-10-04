import type {Database} from '../../stores/profile'
import {sha256} from '../content/digest'
import {wordById,courseRegistry} from '../content/ContentRegistry'
import {validateDatabase,convertV1,POINTER_KEY} from './MigrationV1toV2'
import {writeStorage} from './index'
export function makeLearningBackup(database:Database){const data=JSON.stringify(database);return JSON.stringify({format:'wordpal-private-learning-backup',version:2,createdAt:new Date().toISOString(),sha256:sha256(data),database},null,2)}
export function previewLearningBackup(text:string):Database{
 if(text.length>16*1024*1024)throw new Error('学习备份过大。')
 const envelope=JSON.parse(text.replace(/^\uFEFF/,''))
 if(envelope.format!=='wordpal-private-learning-backup'||envelope.version!==2||!validateDatabase(envelope.database)||sha256(JSON.stringify(envelope.database))!==envelope.sha256)throw new Error('备份格式或完整性校验未通过。课程文件不能作为学习备份恢复。')
 const database=envelope.database.version===1?convertV1(envelope.database):envelope.database as Database
 if(Object.keys(database.cards).some(id=>!wordById[id])||Object.keys(database.courseProgress||{}).some(id=>!courseRegistry[id]))throw new Error('备份引用了尚未安装的课程，请先安装对应课程及版本，再恢复。')
 return JSON.parse(JSON.stringify(database))
}
export function restoreLearningBackup(database:Database,currentRaw:string){
 if(!validateDatabase(database)||database.version!==2)throw new Error('备份校验未通过。')
 // A new immutable candidate keeps the current archive usable until the pointer switches.
 writeStorage('wordpal.recovery.before-restore',currentRaw)
 const text=JSON.stringify(database),key='wordpal.database.restore.'+sha256(text).slice(0,16)
 writeStorage(key,database);if(sha256(uni.getStorageSync(key))!==sha256(text))throw new Error('备份候选读回校验失败，当前档案保留。')
 writeStorage(POINTER_KEY,{version:2,key});return key
}
