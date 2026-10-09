import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Answer, LearningSession, MemoryCard } from '../../packages/core_learning'
import { readStorage, writeStorage } from '../services/storage'
import {createPet,elements,type PetState} from '../../packages/pet_engine'
import {loadCourseRegistry} from '../services/content/ContentRegistry'
import {loadDatabase,initialProgress,validateDatabase,convertV1,type CourseProgress,V1_KEY,V2_KEY,POINTER_KEY,MIGRATION_BACKUP_KEY,exportRecoverySnapshot} from '../services/storage/MigrationV1toV2'
import {sha256} from '../services/content/digest'
import {downloadLocalFile} from '../services/course-import/FilePicker'
import {restoreLearningBackup} from '../services/storage/LearningBackup'
import {migrateParentSettings,type DailyNewWordLimit,type AbilityLevelId} from '../../packages/parent_settings'
export interface AuxiliaryRecord {id:string;courseId:string;lessonId:string;kind:string;at:string;correct:number;total:number;objective?:boolean;hinted?:boolean;wordIds?:string[]}
export interface Database {
  version: 1|2; cards: Record<string,MemoryCard>; session: LearningSession | null
  history: Answer[]; rewardIds: string[]; gems: number; pets: Record<string,PetState>; companion: string
  dailyLimit: DailyNewWordLimit; lastLessonAccuracy: number | null; lessonIndex: number; streakDates: string[]
  currentCourseId?:string;pendingCourseId?:string;courseProgress?:Record<string,CourseProgress>;auxiliaryRecords?:AuxiliaryRecord[];abilityLevel?:AbilityLevelId
  parentSettingsVersion?:2;parentSettingsUpdatedAt?:number
}
export const DATABASE_KEY = 'wordpal.database.v1'
export function freshDatabase(): Database { return {version:1,cards:{},session:null,history:[],rewardIds:[],gems:0,pets:Object.fromEntries(elements.map(e=>[e,createPet(e)])),companion:'water',dailyLimit:10,abilityLevel:'L3',parentSettingsVersion:2,parentSettingsUpdatedAt:0,lastLessonAccuracy:null,lessonIndex:0,streakDates:[]} }
export const useProfileStore = defineStore('profile',()=>{
  loadCourseRegistry()
  const loaded=loadDatabase(freshDatabase),db=ref<Database>(loaded.database),storageError=ref(loaded.error),bootError=ref(loaded.readOnly?loaded.error:'')
  const readOnly=ref(loaded.readOnly)
  function adopt(next:{database:Database;key:string;error:string;readOnly:boolean}){
    loaded.key=next.key;loaded.error=next.error;loaded.readOnly=next.readOnly
    db.value=next.database;readOnly.value=next.readOnly
    storageError.value=next.error;bootError.value=next.readOnly?next.error:''
    return next.database.version===2&&!next.readOnly
  }
  /**
   * Re-run the v1 to v2 upgrade. Falls back to the pre-migration snapshot when the
   * active copy is unreadable, so a full device is not permanently stuck with a
   * v1 archive that silently refuses every textbook switch.
   */
  function retryMigration(){
    try{
      const direct=loadDatabase(freshDatabase)
      if(direct.database.version===2&&!direct.readOnly)return adopt(direct)
      const snapshot=uni.getStorageSync(MIGRATION_BACKUP_KEY)
      if(snapshot){
        const legacy=JSON.parse(snapshot) as Database
        if(legacy.version===1&&validateDatabase(legacy)){
          const rebuilt=convertV1(legacy),serialized=JSON.stringify(rebuilt)
          writeStorage(V2_KEY,rebuilt)
          const readback=uni.getStorageSync(V2_KEY)
          if(readback&&sha256(readback)===sha256(serialized)&&validateDatabase(JSON.parse(readback))){
            writeStorage(POINTER_KEY,'v2')
            return adopt({database:JSON.parse(readback) as Database,key:V2_KEY,error:'',readOnly:false})
          }
        }
      }
      adopt(direct)
      return false
    }catch{return false}
  }
  /** Export the raw pre-upgrade snapshot for a parent to keep. Never uploads anything. */
  async function faultSnapshot(){
    try{
      const text=exportRecoverySnapshot()
      if(await downloadLocalFile('wordpal-fault-snapshot.json',text))return 'file'
      uni.setClipboardData?.({data:text})
      return 'clipboard'
    }catch{return 'failed'}
  }
  function transact(change:(draft:Database)=>void) {
    if(loaded.readOnly){storageError.value=loaded.error;return false}
    const draft = JSON.parse(JSON.stringify(db.value)) as Database
    change(draft)
    try {writeStorage(loaded.key,draft); db.value=draft;storageError.value='';return true}
    catch {storageError.value='保存失败，请释放设备存储后重试。当前答案尚未记入。';return false}
  }
  function erase() { if(loaded.readOnly)throw new Error('需要先恢复档案。');const clean={...freshDatabase(),version:loaded.database.version,currentCourseId:'starter',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]};writeStorage(loaded.key,clean);db.value=clean as Database;for(const key of [V1_KEY,V2_KEY,MIGRATION_BACKUP_KEY,'wordpal.migration.backup.digest'])if(key!==loaded.key)uni.removeStorageSync?.(key);storageError.value='' }
  if(!loaded.readOnly&&db.value.parentSettingsVersion!==2)transact(d=>Object.assign(d,migrateParentSettings(d)))
  function restore(database:Database){try{const migrated=migrateParentSettings(database),key=restoreLearningBackup(migrated,uni.getStorageSync(loaded.key));loaded.key=key;loaded.readOnly=false;readOnly.value=false;db.value=JSON.parse(JSON.stringify(migrated));storageError.value='';bootError.value='';return true}catch(error){storageError.value=(error as Error).message;return false}}
  return {db,readOnly,transact,erase,restore,retryMigration,faultSnapshot,storageError,bootError}
})
