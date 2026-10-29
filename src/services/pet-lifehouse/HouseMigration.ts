export const HOUSE_V6_BACKUP_KEY='wordpal.house-v6.pre-migration'
import {writeStorage} from '../storage'
import {inspectLifeHouse} from './HouseValidation'
import {sha256} from '../content/digest'
export const HOUSE_V5_BACKUP_KEY='wordpal.house-v5.pre-migration'
export const HOUSE_V4_BACKUP_KEY='wordpal.house-v4.pre-migration'
/** Browsing never writes. Call immediately before the first explicit house mutation. */
export function backupBeforeHouseMigration(database:{lifeHouse?:unknown},targetSchema:2|3|4=2):boolean{
 const state=inspectLifeHouse(database.lifeHouse)
 if(state!=='empty'&&(state!=='ready'||(database.lifeHouse as {schemaVersion:number}).schemaVersion>=targetSchema))return true
 try{
  const backupKey=targetSchema===4?HOUSE_V6_BACKUP_KEY:targetSchema===3?HOUSE_V5_BACKUP_KEY:HOUSE_V4_BACKUP_KEY
  const serialized=JSON.stringify(database),digest=sha256(serialized),key=backupKey+':'+digest,raw=uni.getStorageSync(key)
  if(raw){const b=JSON.parse(raw);return b?.backupVersion===1&&b.digest===digest&&sha256(JSON.stringify(b.database))===digest}
  const backup={backupVersion:1,reason:'house-schema-'+targetSchema,digest,database:JSON.parse(serialized)}
  writeStorage(key,backup)
  // The first backup remains addressable; later restored legacy archives get their own digest key.
  if(!uni.getStorageSync(backupKey))writeStorage(backupKey,backup)
  return true
 }catch{return false}
}
