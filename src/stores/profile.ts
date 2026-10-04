import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Answer, LearningSession, MemoryCard } from '../../packages/core_learning'
import { readStorage, writeStorage } from '../services/storage'
import {createPet,elements,type PetState} from '../../packages/pet_engine'
export interface Database {
  version: 1; cards: Record<string,MemoryCard>; session: LearningSession | null
  history: Answer[]; rewardIds: string[]; gems: number; pets: Record<string,PetState>; companion: string
  dailyLimit: number; lastLessonAccuracy: number | null; lessonIndex: number; streakDates: string[]
}
export const DATABASE_KEY = 'wordpal.database.v1'
export function freshDatabase(): Database { return {version:1,cards:{},session:null,history:[],rewardIds:[],gems:0,pets:Object.fromEntries(elements.map(e=>[e,createPet(e)])),companion:'water',dailyLimit:5,lastLessonAccuracy:null,lessonIndex:0,streakDates:[]} }
export const useProfileStore = defineStore('profile',()=>{
  const loaded=readStorage<Database>(DATABASE_KEY,freshDatabase())
  const db = ref<Database>(loaded?.version===1 && loaded.cards && Array.isArray(loaded.history) ? {...freshDatabase(),...loaded} : freshDatabase())
  const storageError=ref('')
  function transact(change:(draft:Database)=>void) {
    const draft = JSON.parse(JSON.stringify(db.value)) as Database
    change(draft)
    try {writeStorage(DATABASE_KEY,draft); db.value=draft;storageError.value='';return true}
    catch {storageError.value='保存失败，请释放设备存储后重试。当前答案尚未记入。';return false}
  }
  function erase() { const clean=freshDatabase(); writeStorage(DATABASE_KEY,clean);db.value=clean; storageError.value='' }
  return {db,transact,erase,storageError}
})
