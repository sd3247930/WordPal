import type {LearningMode} from '../core_learning'
export type DailyNewWordLimit=5|10|15|20
export type EntryLevel=1|2|3|4|5
export type AbilityLevelId=`L${EntryLevel}`
export type SettingApplyState='saved'|'pending'|'applying'|'applied'|'error'
export interface ParentSettings {dailyNewWordLimit:DailyNewWordLimit;entryLevel:EntryLevel;version:2;updatedAt:number}
export interface ParentSettingsSource {dailyLimit:number;abilityLevel?:string;parentSettingsVersion?:number;parentSettingsUpdatedAt?:number}
export interface AbilityLevelMeta {level:EntryLevel;title:string;description:string;recommendedSkills:readonly string[];modes:readonly LearningMode[]}
export const DAILY_NEW_WORD_LIMITS=[5,10,15,20] as const
export const ABILITY_LEVELS:readonly AbilityLevelMeta[]=[
 {level:1,title:'启蒙识词',description:'刚开始接触英语，以图片、声音和基础识词为主。',recommendedSkills:['看图','听音','识词'],modes:['flash','connect']},
 {level:2,title:'基础拼读',description:'认识一些常见词，开始建立自然拼读意识，并尝试基础拼写。',recommendedSkills:['自然拼读','配对','基础拼写'],modes:['flash','connect','listen']},
 {level:3,title:'基础阅读',description:'能识别常见词，进行自然拼读、听音和简单拼写，理解简单例句。',recommendedSkills:['词义','拼读','听音','拼写','简单例句'],modes:['flash','connect','listen','spell']},
 {level:4,title:'熟练运用',description:'已有较稳定词汇量，强化听写、拼写和短句理解。',recommendedSkills:['听写','拼写','短句理解','综合复习'],modes:['spell','listen','dictation','flash','connect']},
 {level:5,title:'进阶表达',description:'基础词汇与拼写较稳定，向短句和综合运用过渡，提升语境理解。',recommendedSkills:['综合词汇','听写','短句','语境理解'],modes:['dictation','spell','listen','connect','flash']}
]
export const abilityMeta=(level:EntryLevel)=>ABILITY_LEVELS[level-1]
/** Modes a learner at this level may use, in recommended rotation order. */
export const levelModes=(level:EntryLevel):readonly LearningMode[]=>abilityMeta(level).modes
export const abilityId=(level:EntryLevel):AbilityLevelId=>`L${level}`
export function normalizeDailyLimit(value:number):DailyNewWordLimit {return !Number.isFinite(value)?10:value<=5?5:value<=10?10:value<=15?15:20}
export function entryLevel(value?:string):EntryLevel {return /^L[1-5]$/.test(value||'')?Number(value!.slice(1)) as EntryLevel:1}
export function readParentSettings(source:ParentSettingsSource):ParentSettings {return {dailyNewWordLimit:normalizeDailyLimit(source.dailyLimit),entryLevel:entryLevel(source.abilityLevel),version:2,updatedAt:source.parentSettingsUpdatedAt||0}}
export function assignParentSettings(source:ParentSettingsSource,settings:ParentSettings){source.dailyLimit=settings.dailyNewWordLimit;source.abilityLevel=abilityId(settings.entryLevel);source.parentSettingsVersion=2;source.parentSettingsUpdatedAt=settings.updatedAt}
export function migrateParentSettings<T extends ParentSettingsSource>(source:T,now=Date.now()):T {
 if(source.parentSettingsVersion===2)return source
 const migrated=JSON.parse(JSON.stringify(source)) as T
 assignParentSettings(migrated,{...readParentSettings(source),updatedAt:now});return migrated
}
export function validParentSettings(source:ParentSettingsSource){
 if(source.parentSettingsVersion===undefined)return Number.isFinite(source.dailyLimit)
 return source.parentSettingsVersion===2&&DAILY_NEW_WORD_LIMITS.includes(source.dailyLimit as DailyNewWordLimit)&&/^L[1-5]$/.test(source.abilityLevel||'')&&Number.isFinite(source.parentSettingsUpdatedAt)&&source.parentSettingsUpdatedAt!>=0
}
