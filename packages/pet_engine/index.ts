import type {Answer} from '../core_learning'
import {localDate} from '../core_learning'
export type Element='water'|'fire'|'earth'|'wind'
export interface PetState {petId:string;element:Element;level:number;exp:number;affection:number;mood:'calm'|'happy'|'excited'|'curious';evolutionStage:1|2|3;equippedCosmetics:string[];lastInteractionAt:number;lastFedDate?:string}
export interface PetRewardEvent {source:'review_due'|'new_word'|'pronunciation'|'spelling'|'dictation'|'streak';exp:number;affection:number}
export const elements:Element[]=['water','fire','earth','wind']
export const petInfo:Record<Element,{name:string;elementName:string;personality:string;message:string}>={
 water:{name:'玄冥',elementName:'水象',personality:'温柔 · 冷静 · 智慧',message:'慢一点没关系，我们再听一次。'},
 fire:{name:'祝融',elementName:'火象',personality:'勇气 · 行动 · 成长',message:'每一次尝试，都是新的勇气。'},
 earth:{name:'后土',elementName:'土象',personality:'稳定 · 坚持 · 守护',message:'小小的坚持，也会长成大树。'},
 wind:{name:'飞廉',elementName:'风象',personality:'探索 · 想象 · 自由',message:'还有好多新世界，我们一起发现。'}
}
export function createPet(element:Element):PetState{return {petId:`pet-${element}`,element,level:1,exp:0,affection:0,mood:'calm',evolutionStage:1,equippedCosmetics:[],lastInteractionAt:0}}
export function growPet(pet:PetState,event:PetRewardEvent,now:number):PetState {
 const exp=pet.exp+Math.max(0,event.exp),level=Math.floor(exp/100)+1
 return {...pet,exp,level,affection:Math.min(100,pet.affection+Math.max(0,event.affection)),mood:event.exp>=10?'excited':'happy',evolutionStage:level>=8?3:level>=4?2:1,lastInteractionAt:now}
}
interface RewardDatabase {pets:Record<string,PetState>;companion:string;rewardIds:string[];gems:number;history:Answer[]}
export function applyLearningReward(db:RewardDatabase,answer:Answer){
 if(answer.source==='practice'||db.rewardIds.includes(answer.id))return
 const element=(db.companion||'water') as Element
 const current=db.pets[element]??createPet(element)
 const source=answer.mode==='dictation'?'dictation':answer.mode==='spell'?'spelling':answer.source
 db.pets[element]=growPet(current,{source,exp:answer.correct?12:4,affection:answer.correct?2:1},+new Date(answer.at))
 db.gems=Math.max(0,db.gems+(answer.correct?2:0));db.rewardIds.push(answer.id)
 const date=localDate(new Date(answer.at)),taskId=`daily-task:${date}`
 if(db.history.filter(a=>localDate(new Date(a.at))===date).length>=5 && !db.rewardIds.includes(taskId)){
  db.pets[element]=growPet(db.pets[element],{source:'streak',exp:10,affection:3},+new Date(answer.at));db.gems+=1;db.rewardIds.push(taskId)
 }
}
export function feedPet(pet:PetState,gems:number,date=localDate()){
 if(gems<5 || pet.lastFedDate===date)return {pet,gems,success:false}
 return {pet:{...pet,affection:Math.min(100,pet.affection+5),mood:'happy' as const,lastFedDate:date,lastInteractionAt:Date.now()},gems:gems-5,success:true}
}
