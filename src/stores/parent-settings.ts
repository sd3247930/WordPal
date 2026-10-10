import {defineStore} from 'pinia'
import {computed,ref} from 'vue'
import {useProfileStore} from './profile'
import {useParentGateStore} from './parent-gate'
import {assignParentSettings,readParentSettings,DAILY_NEW_WORD_LIMITS,type ParentSettings,type SettingApplyState} from '../../packages/parent_settings'
import type {SessionPlannerConfig} from '../services/learning/SessionPlanner'
export const useParentSettingsStore=defineStore('parent-settings',()=>{
 const profile=useProfileStore(),saveState=ref<SettingApplyState>('saved'),error=ref('')
 const settings=computed(()=>readParentSettings(profile.db))
 // These views are consumed by the planner and recommendation engine; neither is separately persisted.
 const plannerConfig=computed<SessionPlannerConfig>(()=>({dailyNewWordLimit:settings.value.dailyNewWordLimit,entryLevel:settings.value.entryLevel}))
 const recommendationConfig=computed(()=>({entryLevel:settings.value.entryLevel}))
 const persisted=computed(()=>profile.db.parentSettingsVersion===2&&profile.db.dailyLimit===settings.value.dailyNewWordLimit&&profile.db.abilityLevel==='L'+settings.value.entryLevel)
 const sessionPending=computed(()=>!!profile.db.session&&!profile.db.session.completedAt)
 const dailyState=computed<SettingApplyState>(()=>{
  if(saveState.value==='error'||!persisted.value)return 'error'
  if(saveState.value==='applying')return 'applying'
  return sessionPending.value&&profile.db.session?.plannerConfig?.dailyNewWordLimit!==settings.value.dailyNewWordLimit?'pending':'applied'
 })
 const levelState=computed<SettingApplyState>(()=>saveState.value==='error'||!persisted.value?'error':saveState.value==='applying'?'applying':recommendationConfig.value.entryLevel===settings.value.entryLevel?'applied':'pending')
 const difficultyPending=computed(()=>sessionPending.value&&profile.db.session?.plannerConfig?.entryLevel!==settings.value.entryLevel)
 function save(change:Partial<Pick<ParentSettings,'dailyNewWordLimit'|'entryLevel'>>){
  if(!useParentGateStore().canAccess()){error.value='请先完成家长验证。';return false}
  const next={...settings.value,...change,updatedAt:Date.now()}
  if(!DAILY_NEW_WORD_LIMITS.includes(next.dailyNewWordLimit)||![1,2,3,4,5].includes(next.entryLevel)){error.value='设置值无效，请重新选择。';saveState.value='error';return false}
  saveState.value='applying';error.value=''
  if(!profile.transact(d=>assignParentSettings(d,next))){saveState.value='error';error.value='设置未保存，请检查设备存储后重试。';return false}
  saveState.value='saved'
  if(!persisted.value||plannerConfig.value.dailyNewWordLimit!==next.dailyNewWordLimit||recommendationConfig.value.entryLevel!==next.entryLevel){saveState.value='error';error.value='设置已保存，但应用失败，请重试。';return false}
  saveState.value='applied';return true
 }
 return {settings,plannerConfig,recommendationConfig,persisted,sessionPending,dailyState,levelState,difficultyPending,saveState,error,save}
})
