import type {Element} from '../../../packages/pet_engine'
import {catalogForElement,compatibleSlots,furnitureRegistry} from './HouseRegistry'
import {sceneDefinition} from './SceneConfig'
import type {ElementHouse,FurnitureCategory,FurnitureDefinition,HouseLevel,SlotId} from './types'

export type HouseBuilderSection='room'|'furniture'|'decor'|'garden'|'owned'
export const houseBuilderSections=[{id:'room',label:'房屋'},{id:'furniture',label:'家具'},{id:'decor',label:'装饰'},{id:'garden',label:'庭院'},{id:'owned',label:'收纳箱'}] as const
export const furnitureFilters=[{id:'all',label:'全部'},{id:'rest',label:'休息'},{id:'function',label:'功能'},{id:'activity',label:'活动'},{id:'decor',label:'装饰'}] as const
export const builderTitles:Record<HouseBuilderSection,string>={room:'从一间小屋开始',furniture:'给家添一点喜欢',decor:'把小屋装点得更美',garden:'一起布置小庭院',owned:'收藏每一份小喜欢'}
const outdoor=(id:string)=>id==='garden'||id==='courtyard'
export function outdoorUnlockLevel(element:Element):HouseLevel{return [0,1,2,3,4,5].find(level=>sceneDefinition(element,level as HouseLevel).zones.some(zone=>outdoor(zone.id))) as HouseLevel}
export function builderSlots(item:FurnitureDefinition,element:Element,level:HouseLevel,section:HouseBuilderSection):SlotId[]{
 const allowed=compatibleSlots(item,level)
 return section==='garden'?allowed.filter(id=>sceneDefinition(element,level).slots.some(slot=>slot.id===id&&outdoor(slot.zoneId))):allowed
}
export function builderItems(element:Element,house:ElementHouse,section:HouseBuilderSection,category:FurnitureCategory|'all'='all'):FurnitureDefinition[]{
 if(section==='room')return[]
 if(section==='owned')return house.owned.map(owned=>furnitureRegistry[owned.furnitureId]).filter((item):item is FurnitureDefinition=>!!item)
 const catalog=catalogForElement(element)
 if(section==='decor')return catalog.filter(item=>item.category==='decor')
 if(section==='garden')return house.level<outdoorUnlockLevel(element)?[]:catalog.filter(item=>builderSlots(item,element,house.level,section).length>0)
 return catalog.filter(item=>category==='all'||item.category===category)
}
export function furnitureState(item:FurnitureDefinition,house:ElementHouse,gems:number,available=true){
 const owned=house.owned.find(owned=>owned.furnitureId===item.id)
 if(!available)return{kind:'unavailable',label:'图片暂不可用',owned}
 if(owned)return{kind:Object.values(house.slots).includes(owned.instanceId)?'placed':'owned',label:Object.values(house.slots).includes(owned.instanceId)?'已放置 · 点击调整':'已拥有 · 免费放置',owned}
 if(item.level>house.level)return{kind:'locked',label:'房屋 Lv.'+item.level+' 解锁'}
 if(gems<item.price)return{kind:'insufficient',label:'还差 '+(item.price-gems)+' 灵石'}
 return{kind:'purchase',label:item.price+' 灵石'}
}
