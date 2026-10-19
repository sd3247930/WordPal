import type {Element} from '../../packages/pet_engine'
import {themePacks,type ThemeId,type WordPalTokens} from './themes'
export {petStages,stageUnlocked} from '../services/pet-growth'

export interface PetHouseTheme {
 id:Element;title:string;subtitle:string;primary:string;secondary:string;surface:string;deep:string;sceneAsset:string
 radius:{card:number;button:number};motion:{type:string;intensity:number};icon:string
}
export const petHouseThemes:Record<Element,PetHouseTheme>={
 water:{id:'water',title:'水之主题',subtitle:'清澈 · 梦幻',primary:'#4FA8E8',secondary:'#8FD6F5',surface:'#EAF6FC',deep:'#286796',sceneAsset:'/static/pet-house/water-scene.jpg',radius:{card:24,button:18},motion:{type:'ripple',intensity:1},icon:'◉'},
 fire:{id:'fire',title:'火之主题',subtitle:'热情 · 活力',primary:'#EF743A',secondary:'#F5A04D',surface:'#FFF0E5',deep:'#AD401C',sceneAsset:'/static/pet-house/fire-scene.jpg',radius:{card:20,button:18},motion:{type:'flame',intensity:1},icon:'♨'},
 earth:{id:'earth',title:'土之主题',subtitle:'自然 · 温馨',primary:'#7FA95A',secondary:'#B4C986',surface:'#EEF5E7',deep:'#486A31',sceneAsset:'/static/pet-house/earth-scene.jpg',radius:{card:28,button:20},motion:{type:'leaf',intensity:1},icon:'♧'},
 wind:{id:'wind',title:'风之主题',subtitle:'经验 · 想象',primary:'#9278D8',secondary:'#B9A5EE',surface:'#F2EEFC',deep:'#6953B4',sceneAsset:'/static/pet-house/wind-scene.jpg',radius:{card:22,button:18},motion:{type:'breeze',intensity:1},icon:'✧'}
}
export const petMoods={calm:'平静',happy:'开心',excited:'兴奋',curious:'好奇'}
export function petHouseStyle(id:Element,dark:boolean,highContrast=false,appearanceTheme:ThemeId='swiss',appearanceTokens?:WordPalTokens){
 const t=petHouseThemes[id],fg=dark?'#F1EDE7':'#353B46',muted=highContrast?fg:dark?'#CCC5BB':'#626975',surface=dark?'#24272D':'#FFFDF9',bg=dark?'#191D24':'#FBF5EC',soft=dark?'#303640':'#F8EFE4',accent=dark?t.secondary:t.deep,border=highContrast?fg:dark?'#68717E':'#CCC1B3'
 const tokens:Record<string,string>={'pet-bg':bg,'pet-surface':surface,'pet-soft':soft,'pet-text':fg,'pet-muted':muted,'pet-border':border,'pet-accent':accent,'pet-bright':t.primary,'pet-tonal':dark?'#303640':t.surface,'pet-radius':t.radius.card+'px','pet-button-radius':t.radius.button+'px','pet-shadow':dark?'none':id==='fire'?'0 8px 26px rgba(94,67,39,.08)':id==='earth'?'0 8px 26px rgba(94,67,39,.06)':'0 6px 22px rgba(94,67,39,.04)',
 'wp-primary':dark?t.secondary:t.deep,'wp-on-primary':dark?'#191D24':'#FFFFFF','wp-foreground':fg,'wp-surface-foreground':fg,'wp-muted-foreground':muted,'wp-surface':surface,'wp-surface-tonal':soft,'wp-secondary':soft,'wp-border':border,'wp-divider':border,'wp-radius':t.radius.card+'px','wp-radius-sm':t.radius.button+'px','wp-focus-ring':accent,'wp-success':dark?'#B4D997':'#486A31'}
 if(appearanceTheme==='clay'){
  const clay=appearanceTokens||themePacks.clay[dark?'buildDark':'buildLight']().tokens
  Object.assign(tokens,{'pet-bg':clay.background,'pet-surface':clay.surface,'pet-soft':clay['surface-soft'],'pet-text':clay.foreground,'pet-muted':highContrast?clay.foreground:clay['muted-foreground'],'pet-border':highContrast?clay.foreground:clay.border,'pet-tonal':clay[id+'-soft'],'pet-radius':clay.radius,'pet-button-radius':clay['radius-sm'],'pet-shadow':highContrast?'none':clay.elevation})
  for(const key of ['primary','on-primary','foreground','surface-foreground','muted-foreground','surface','surface-tonal','secondary','border','divider','radius','radius-sm','focus-ring','success'])tokens['wp-'+key]=clay[key]
  if(highContrast){tokens['wp-border']=clay.foreground;tokens['wp-muted-foreground']=clay.foreground}
 }
 return Object.fromEntries(Object.entries(tokens).map(([key,value])=>['--'+key,value]))
}
