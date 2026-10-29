import type {Element} from '../../../packages/pet_engine'
import {itemDesign,designsFor,itemDesignImage,designWearable} from './ItemVisualRegistry'
import {designDressRequirement} from './DesignWearables'
import {lifeHouseIcon} from './LifeHouseAssets'
import art from '../../static/pet-house/lifehouse/dress-v1/manifest.json'

export type DressSlot='head'|'neck'|'badge'
export interface DressItem {id:string;name:string;slot:DressSlot;level:number;description:string;icon?:string;kind:'legacy'|'design'|'new'}
export const legacyCosmetics=[{id:'ribbon',name:'探索丝带',level:2},{id:'scarf',name:'暖暖围巾',level:4},{id:'star',name:'星星徽章',level:8}] as const
const root='/static/pet-house/lifehouse/dress-v1/'
const entries:[string,string,DressSlot,string][]=[
 ['dew-wreath','晨露花环','head','花朵与露珠，陪你迎接清晨'],
 ['moon-crown','星月小冠','head','把星光，轻轻戴在头上'],
 ['cloud-clip','云朵发夹','head','软软云朵，萌趣可爱'],
 ['cloud-scarf','云朵软围巾','neck','像小云朵一样，轻柔温暖'],
 ['rainbow-cowl','彩虹小围脖','neck','戴一小圈，温柔的彩虹'],
 ['wish-bow','星愿领结','neck','系上领结，许一个小心愿'],
 ['courage-sun','勇气太阳章','badge','小小太阳，给你一点勇气'],
 ['growth-sprout','成长嫩芽章','badge','每一点成长，都值得纪念'],
 ['dream-moon','梦想月亮章','badge','带着月亮，做一个好梦']
]
export const newDressItems:readonly DressItem[]=Object.freeze(entries.map(([key,name,slot,description])=>Object.freeze({id:'dress-'+key+'-v1',name,slot,level:slot==='head'?2:slot==='neck'?4:8,description,icon:newDressAsset('dress-'+key+'-v1','icon-256')?.src,kind:'new' as const})))
export function dressArt(id:string){return art.schemaVersion===1&&art.designVersion===1&&art.items.length===9?art.items.find(item=>item.id===id):undefined}
export function newDressAsset(id:string,layer:'front'|'back'|'icon-256'|'icon-512'){
 const file=dressArt(id)?.files.find(file=>file.layer===layer)
 return file?{...file,src:root+file.path}:undefined
}
export function dressDefinition(id:string,element:Element):DressItem|undefined{
 const fresh=newDressItems.find(item=>item.id===id);if(fresh)return fresh
 const legacy=legacyCosmetics.find(item=>item.id===id)
 if(legacy)return{...legacy,slot:id==='star'?'badge':'neck',description:{ribbon:'多彩丝带，陪你探索',scarf:'柔软围巾，温暖陪伴',star:'闪亮星星，记录成长'}[id]!,icon:lifeHouseIcon(('dress-'+id) as 'dress-ribbon'),kind:'legacy'}
 const design=itemDesign(id)
 if(!design||design.module!=='dress'||design.element!==element)return
 const level=designDressRequirement(design)?.level
 if(level===undefined)return
 return{id,name:design.name,slot:design.designTier===5?'head':design.designTier===4?'badge':'neck',level,description:'为'+({water:'玄冥',fire:'祝融',earth:'后土',wind:'飞廉'}[element])+'准备的小心意',icon:itemDesignImage(id),kind:'design'}
}
export function dressCatalog(element:Element):DressItem[]{
 return [...legacyCosmetics.map(item=>dressDefinition(item.id,element)!),...newDressItems,...designsFor(element,'dress').map(item=>dressDefinition(item.id,element)).filter((item):item is DressItem=>!!item)]
}
/** Reading an old archive never rewrites it. Last known item in each slot wins visually. */
export function equipmentBySlot(ids:readonly string[],element:Element):Partial<Record<DressSlot,string>>{
 const slots:Partial<Record<DressSlot,string>>={}
 for(const id of ids){const item=dressDefinition(id,element);if(item)slots[item.slot]=id}
 return slots
}
export function equippedItems(ids:readonly string[],element:Element):string[]{const slots=equipmentBySlot(ids,element);return(['head','neck','badge'] as const).flatMap(slot=>slots[slot]?[slots[slot]!]:[])}
export function validEquipment(value:unknown,element:Element):value is string[]{return Array.isArray(value)&&value.length<=3&&value.every(id=>typeof id==='string'&&!!dressDefinition(id,element))&&equippedItems(value,element).length===value.length}
/** Unknown saved IDs are retained for a later compatible build. No inventory migration is needed. */
export function toggleEquipment(ids:readonly string[],id:string,element:Element):string[]|undefined{
 const item=dressDefinition(id,element);if(!item)return
 const wearing=equipmentBySlot(ids,element)[item.slot]===id
 const keep=ids.filter(existing=>existing!==id&&dressDefinition(existing,element)?.slot!==item.slot)
 return wearing?keep:[...keep,id]
}
export function hasDressAssets(item:DressItem,element:Element,form:1|2|3|4){
 if(!item.icon)return false
 if(item.kind==='new')return !!newDressAsset(item.id,'front')&&(item.slot!=='neck'||!!newDressAsset(item.id,'back'))
 if(item.kind==='design')return !!designWearable(item.id,element,form)
 return true
}
