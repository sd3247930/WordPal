import type {PetState} from '../../packages/pet_engine'
import {petGrowthMetrics} from './pet-growth-dashboard'

export const petStatusNames=['excitement','happiness','experience','affection'] as const
export type PetStatusName=typeof petStatusNames[number]
export interface PetStatusMetric {id:PetStatusName;label:string;value:number|null;max:number;display:string;note:string;explanation:string}

/** Unknown is distinct from zero; this projection never changes stored pet data. */
export function safePetPercent(value:number|null|undefined,max:number):number|null{
 if(value==null||!Number.isFinite(value)||!Number.isFinite(max)||max<=0)return null
 return Math.min(100,Math.max(0,value/max*100))
}
export function petStatusMetrics(pet:PetState,unavailable=false):PetStatusMetric[]{
 const m=petGrowthMetrics(pet,[],unavailable)
 return [
  {id:'excitement',label:'兴奋',value:null,max:100,display:!unavailable&&pet.mood==='excited'?'兴奋中':'暂无数值',note:'短时活跃情绪',explanation:'兴奋表示伙伴此刻的活跃情绪。目前只保存情绪状态，还没有独立的兴奋数值，因此进度条留空。认真学习后，伙伴会按已有规则更新心情；查看卡片不会获得奖励。'},
  {id:'happiness',label:'开心',value:null,max:100,display:!unavailable&&pet.mood==='happy'?'开心中':'暂无数值',note:'日常愉快心情',explanation:'开心表示伙伴的愉快心情。目前只保存情绪状态，还没有独立的开心数值，因此进度条留空。学习和每天分享小点心会按已有规则更新心情，休息不会扣除经验或亲密度。'},
  {id:'experience',label:'经验',value:m.levelXp,max:m.requiredXp,display:m.levelXp===null?'暂无数值':m.levelXp+' / '+m.requiredXp,note:m.remainingXp===null?'成长数据暂不可用':'距下一级 '+m.remainingXp+' 经验',explanation:m.lifetimeXp===null?'成长数据暂不可用，请先恢复本机档案。':'这是当前等级经验，每累计 100 经验升一级；已保存的累计经验为 '+m.lifetimeXp+'，升级不会清零。正式答题和每日任务按原规则发放经验，喂食或查看卡片不会增加经验。'},
  {id:'affection',label:'亲密度',value:m.bond,max:m.bondMax,display:m.bond===null?'暂无数值':m.bond+' / '+m.bondMax,note:'与当前伙伴的陪伴积累',explanation:'显示当前伙伴已保存的亲密度，上限 100。正式答题会增加亲密度；每个伙伴每天可分享一次小点心，消耗 5 灵石，最多增加 5 亲密度。只打开页面或查看说明不会增加数值。'}
 ]
}
