import {defineStore} from 'pinia'
import {computed,ref} from 'vue'
import {useProfileStore} from './profile'
import {useParentGateStore} from './parent-gate'
import {assignParentSettings,readParentSettings,type ParentSettings,type SettingApplyState} from '../../packages/parent_settings'
import {refreshUnstartedPlans} from '../services/learning/DailyLearningPlan'
export const useParentSettingsStore=defineStore('parent-settings',()=>{
 const profile=useProfileStore(),saveState=ref<SettingApplyState>('saved'),error=ref('')
 const settings=computed(()=>readParentSettings(profile.db))
 const plannerConfig=computed(()=>({dailyNewWordLimit:settings.value.dailyNewWordLimit,entryLevel:settings.value.entryLevel}))
 const recommendationConfig=computed(()=>({entryLevel:settings.value.entryLevel}))
 const persisted=computed(()=>profile.db.parentSettingsVersion===3&&profile.db.dailyLimit===undefined&&profile.db.abilityLevel==='L'+settings.value.entryLevel)
 const plan=computed(()=>profile.db.courseProgress?.[profile.db.currentCourseId||'starter']?.dailyPlan)
 const sessionPending=computed(()=>!!plan.value?.flow?.begunAt)
 const difficultyPending=computed(()=>sessionPending.value&&plan.value?.flow?.entryLevel!==settings.value.entryLevel)
 const levelState=computed<SettingApplyState>(()=>saveState.value==='error'||!persisted.value?'error':saveState.value==='applying'?'applying':difficultyPending.value?'pending':'applied')
 function save(change:Partial<Pick<ParentSettings,'entryLevel'>>){
  if(!useParentGateStore().canAccess()){error.value='请先完成家长验证。';return false}
  const next={...settings.value,...change,updatedAt:Date.now()}
  if(![1,2,3,4,5].includes(next.entryLevel)){error.value='设置值无效，请重新选择。';saveState.value='error';return false}
  saveState.value='applying';error.value=''
  if(!profile.transact(d=>{assignParentSettings(d,next);refreshUnstartedPlans(d)})){saveState.value='error';error.value='设置未保存，请检查设备存储后重试。';return false}
  saveState.value='applied';return true
 }
 return {settings,plannerConfig,recommendationConfig,persisted,sessionPending,dailyState:levelState,levelState,difficultyPending,saveState,error,save}
})
