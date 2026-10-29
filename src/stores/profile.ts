import { defineStore } from 'pinia'
import { ref,toRaw,shallowRef } from 'vue'
import type { Answer, LearningSession, MemoryCard } from '../../packages/core_learning'
import type {CustomPracticeSession,CustomPracticeCursor} from '../../packages/core_learning/custom-practice'
import { readStorage, writeStorage } from '../services/storage'
import {createPet,elements,type PetState} from '../../packages/pet_engine'
import {loadCourseRegistry} from '../services/content/ContentRegistry'
import {loadDatabase,initialProgress,validateDatabase,convertV1,type CourseProgress,V1_KEY,V2_KEY,POINTER_KEY,MIGRATION_BACKUP_KEY,CUSTOM_RECOVERY_KEY,exportRecoverySnapshot} from '../services/storage/MigrationV1toV2'
import {sha256} from '../services/content/digest'
import {downloadLocalFile} from '../services/course-import/FilePicker'
import {restoreLearningBackup} from '../services/storage/LearningBackup'
import {ensureIdentitySnapshot,IDENTITY_BACKUP_KEY} from '../services/storage/IdentityUpgrade'
import {migrateParentSettings,type DailyNewWordLimit,type AbilityLevelId} from '../../packages/parent_settings'
import {pruneCourseProgress,pruneCourseUiMemory} from '../services/learning/CourseProgressMemory'
import {removedCourseScopes,backupCourseRemoval,pruneRemovedCourseRecords,pruneRemovedPreferences,type CourseRemovalScope} from '../services/content/CourseRemovalData'
import {safeLifeHouseWrite} from '../services/pet-lifehouse/HouseValidation'
import {validMoney} from '../../packages/pet_engine/wallet'
import {questionKey} from '../services/learning/StudyCapability'
interface LearningDraft {key:string;owner:string;daily:boolean;sessionId:string;index:number;fields:Partial<Pick<LearningSession,'input'|'letterDraft'|'inputAssistance'>>}
export interface AuxiliaryRecord {id:string;courseId:string;lessonId:string;kind:string;at:string;correct:number;total:number;objective?:boolean;hinted?:boolean;wordIds?:string[]}
export interface Database {
  version: 1|2; cards: Record<string,MemoryCard>; session: LearningSession | null
  history: Answer[]; practiceAnswers?:Answer[]; rewardIds: string[]; gems: number; pets: Record<string,PetState>; companion: string
  /** Read only during legacy migration; never controls new assignments. */
  dailyLimit?: DailyNewWordLimit; lastLessonAccuracy: number | null; lessonIndex: number; streakDates: string[]
  currentCourseId?:string;pendingCourseId?:string;courseProgress?:Record<string,CourseProgress>;auxiliaryRecords?:AuxiliaryRecord[];abilityLevel?:AbilityLevelId
  courseSessions?:Record<string,LearningSession>
  customPractice?:CustomPracticeSession|null
  customPracticeCursors?:CustomPracticeCursor[]
  parentSettingsVersion?:2|3;parentSettingsUpdatedAt?:number
  /** Versioned house domain. Unknown versions pass through learning saves unchanged. */
  lifeHouse?:unknown
}
export const DATABASE_KEY = 'wordpal.database.v1'
export function freshDatabase(): Database { return {version:1,cards:{},session:null,history:[],rewardIds:[],gems:0,pets:Object.fromEntries(elements.map(e=>[e,createPet(e)])),companion:'water',abilityLevel:'L3',parentSettingsVersion:3,parentSettingsUpdatedAt:0,lastLessonAccuracy:null,lessonIndex:0,streakDates:[]} }
export const useProfileStore = defineStore('profile',()=>{
  loadCourseRegistry()
  const loaded=loadDatabase(freshDatabase),db=ref<Database>(loaded.database),storageError=ref(loaded.error),bootError=ref(loaded.readOnly?loaded.error:'')
  const readOnly=ref(loaded.readOnly)
  const courseMemoryRevision=ref(0)
  const learningDraft=shallowRef<LearningDraft|null>(null)
  let transacting=false
  function stageLearningDraft(session:LearningSession,fields:LearningDraft['fields']){
    const key=questionKey(session)
    if(readOnly.value||session.completedAt||session.answers[session.index])return false
    if(learningDraft.value&&learningDraft.value.key!==key&&!flushLearningDraft())return false
    learningDraft.value={key,owner:session.courseId||'starter',daily:!!session.flow,sessionId:session.id,index:session.index,fields:{...learningDraft.value?.fields,...fields}}
    return true
  }
  function applyLearningDraft(draft:Database){
    const pending=learningDraft.value
    if(!pending)return
    const target=pending.daily?draft.courseProgress?.[pending.owner]?.dailyPlan:draft.session
    if(target&&questionKey(target)===pending.key&&!target.completedAt&&!target.answers[target.index])Object.assign(target,pending.fields)
  }
  function flushLearningDraft(){return !learningDraft.value||transact(()=>{})}
  if(!readOnly.value)try{ensureIdentitySnapshot(db.value)}catch{storageError.value='升级备份暂未保存，请释放存储空间后重启；原学习档案保留。'}
  function adopt(next:{database:Database;key:string;error:string;readOnly:boolean}){
    loaded.key=next.key;loaded.error=next.error;loaded.readOnly=next.readOnly
    db.value=next.database;readOnly.value=next.readOnly
    storageError.value=next.error;bootError.value=next.readOnly?next.error:''
    if(next.database.version===2&&!next.readOnly){removeCourseRecords();reconcileCourseMemory()}
    return next.database.version===2&&!next.readOnly
  }
  /**
   * Re-run the v1 to v2 upgrade. Falls back to the pre-migration snapshot when the
   * active copy is unreadable, so a full device is not permanently stuck with a
   * v1 archive that silently refuses every textbook switch.
   */
  function retryMigration(){
    if(!flushLearningDraft())return false
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
    if(transacting){storageError.value='正在保存这次学习，请稍后再试。';return false}
    transacting=true
    try {
      if(!validMoney(db.value.gems))throw new RangeError('invalid-wallet')
      // Only explicit flush/commit clones the archive; keystrokes stay in a small overlay.
      const draft = JSON.parse(JSON.stringify(toRaw(db.value))) as Database
      applyLearningDraft(draft)
      change(draft)
      if(!validMoney(draft.gems))throw new RangeError('invalid-wallet')
      if(!safeLifeHouseWrite(db.value.lifeHouse,draft.lifeHouse)){storageError.value='家园档案版本暂不支持修改，原数据已保留。';return false}
      writeStorage(loaded.key,draft);db.value=draft;learningDraft.value=null;storageError.value='';return true
    }catch(error){storageError.value=error instanceof RangeError?'灵石数值无法安全保存，本次操作未生效，原档案已保留。':'保存失败，请释放设备存储后重试。当前答案尚未记入。';return false}
    finally{transacting=false}
  }
  function reconcileCourseMemory(removedId?:string){
    if(loaded.readOnly||db.value.version!==2)return false
    const candidate=JSON.parse(JSON.stringify(db.value)) as Database,changed=pruneCourseProgress(candidate,removedId)
    if(changed&&!transact(draft=>{pruneCourseProgress(draft,removedId)}))return false
    try{const uiChanged=pruneCourseUiMemory(db.value,removedId);if(changed||uiChanged)courseMemoryRevision.value++;return true}
    catch{storageError.value='教材进度清理尚未完成，请释放设备存储后重新打开应用。';return false}
  }
  function erase() { if(loaded.readOnly)throw new Error('需要先恢复档案。');const clean={...freshDatabase(),version:loaded.database.version,currentCourseId:'starter',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]};writeStorage(loaded.key,clean);learningDraft.value=null;db.value=clean as Database;for(const key of [V1_KEY,V2_KEY,MIGRATION_BACKUP_KEY,CUSTOM_RECOVERY_KEY,IDENTITY_BACKUP_KEY,'wordpal.migration.backup.digest'])if(key!==loaded.key)uni.removeStorageSync?.(key);storageError.value='' }
  if(!loaded.readOnly&&(db.value.parentSettingsVersion!==3||db.value.dailyLimit!==undefined))transact(d=>{const migrated=migrateParentSettings(d);delete d.dailyLimit;Object.assign(d,migrated)})
  function removeCourseRecords(scopes:CourseRemovalScope[]=removedCourseScopes(db.value)){
    if(loaded.readOnly)return false
    if(!scopes.length)return true
    try{
      for(const scope of scopes)backupCourseRemoval(db.value,scope)
      const candidate=JSON.parse(JSON.stringify(db.value)) as Database
      for(const scope of scopes)pruneRemovedCourseRecords(candidate,scope)
      if(JSON.stringify(candidate)!==JSON.stringify(db.value)&&!transact(draft=>{for(const scope of scopes)pruneRemovedCourseRecords(draft,scope)}))return false
      const preferencesChanged=pruneRemovedPreferences(scopes)
      let uiChanged=false
      for(const scope of scopes)uiChanged=pruneCourseUiMemory(db.value,scope.courseId)||uiChanged
      if(preferencesChanged||uiChanged||scopes.length)courseMemoryRevision.value++
      return true
    }catch{storageError.value='已删除教材的记录清理尚未完成，备份保留，请释放设备存储后重试。';return false}
  }
  removeCourseRecords()
  reconcileCourseMemory()
  function restore(database:Database){if(!flushLearningDraft())return false;try{const migrated=migrateParentSettings(database),key=restoreLearningBackup(migrated,uni.getStorageSync(loaded.key));loaded.key=key;loaded.readOnly=false;readOnly.value=false;learningDraft.value=null;db.value=JSON.parse(JSON.stringify(migrated));storageError.value='';bootError.value='';return removeCourseRecords()&&reconcileCourseMemory()}catch(error){storageError.value=(error as Error).message;return false}}
  return {db,readOnly,transact,erase,restore,retryMigration,faultSnapshot,storageError,bootError,reconcileCourseMemory,courseMemoryRevision,removeCourseRecords,learningDraft,stageLearningDraft,flushLearningDraft}
})
