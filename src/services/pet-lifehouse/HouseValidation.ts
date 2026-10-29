import {elements,type Element} from '../../../packages/pet_engine'
import {furnitureRegistry,slotDefinitions,compatibleSlots} from './HouseRegistry'
import type {ElementHouse,HouseSnapshot,LifeHouseDomain,SlotId} from './types'
import {sceneDefinition} from './SceneConfig'
import {isElementDressDesign} from './VisualInventory'
import {dressDefinition,validEquipment} from './DressCatalog'

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0
const text=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length>0&&v.length<=max
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&v.length<=40
const categories=['rest','function','activity','decor']
export function emptyLifeHouse():LifeHouseDomain{const empty=():ElementHouse=>({level:0,owned:[],slots:{},lastUpgradeAt:null});return {schemaVersion:1,revision:0,housesByElement:{water:empty(),fire:empty(),earth:empty(),wind:empty()},recentReceipts:[],memoryEvents:[]}}
function validSnapshot(s:unknown,element:Element){
 if(record(s)&&s.cosmetics!==undefined&&(s.assetVersion!==3||!validEquipment(s.cosmetics,element)))return false
 if(!record(s)||!integer(s.level)||Number(s.level)>5||!Array.isArray(s.items)||s.items.length>10||typeof s.form!=='number'||![1,2,3,4].includes(s.form)||![1,2,3].includes(s.assetVersion as number)||s.cosmetic!==null&&!['ribbon','scarf','star'].includes(s.cosmetic as string)&&!((s.assetVersion===2||s.assetVersion===3)&&isElementDressDesign(s.cosmetic,element))&&!(s.assetVersion===3&&typeof s.cosmetic==='string'&&dressDefinition(s.cosmetic,element)))return false
 if(s.assetVersion===3){
  const q=s.scene;if(!record(q)||![1,2,3].includes(q.revision as number)||!['room','garden','gallery','courtyard'].includes(q.zoneId as string)||q.cameraPresetId!=='zone'||!record(q.actorAnchor)||typeof q.actorAnchor.x!=='number'||typeof q.actorAnchor.y!=='number'||![q.actorAnchor.x,q.actorAnchor.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!text(q.actorVariant)||!integer(q.fitRevision)||Number(q.fitRevision)>1)return false
  const zoneLevel={room:0,garden:3,gallery:4,courtyard:5}[q.zoneId as 'room'|'garden'|'gallery'|'courtyard'];if(Number(s.level)<zoneLevel)return false
  const scene=sceneDefinition(element,Number(s.level) as HouseSnapshot['level'],q.revision as 1|2|3),zone=scene.zones.find(z=>z.id===q.zoneId),slot=q.actorAnchorId==='spawn'?undefined:scene.slots.find(a=>'slot:'+a.id===q.actorAnchorId&&a.zoneId===q.zoneId),anchor=q.actorAnchorId==='spawn'?zone?.spawn:slot?.approach;if(!anchor||anchor.x!==q.actorAnchor.x||anchor.y!==q.actorAnchor.y)return false
  if(q.actorVariant!==`original-${element}-f${s.form}`&&q.actorVariant!==`chibi-${element}-f${s.form}-r1`)return false
  if(q.actorVariant.startsWith('original-')?q.fitRevision!==0:q.fitRevision!==1)return false
 }
 const slots=new Set<string>(),items=new Set<string>()
 return s.items.every(value=>{if(!record(value)||!text(value.slotId)||!text(value.furnitureId))return false;const item=furnitureRegistry[value.furnitureId];if(!item||item.element!=='all'&&item.element!==element||!compatibleSlots(item,Number(s.level)).includes(value.slotId as SlotId)||slots.has(value.slotId)||items.has(value.furnitureId))return false;slots.add(value.slotId);items.add(value.furnitureId);return true})
}
export function validLifeHouse(value:unknown):value is LifeHouseDomain{
 if(!record(value)||![1,2,3,4].includes(value.schemaVersion as number)||!integer(value.revision)||!record(value.housesByElement)||!Array.isArray(value.recentReceipts)||value.recentReceipts.length>50||!Array.isArray(value.memoryEvents)||value.memoryEvents.length>64)return false
 const allInstances=new Set<string>()
 for(const element of elements){
  const house=value.housesByElement[element]
  if(!record(house)||!integer(house.level)||Number(house.level)>5||!Array.isArray(house.owned)||house.owned.length>40||!record(house.slots)||house.lastUpgradeAt!==null&&!date(house.lastUpgradeAt))return false
  const owned=new Map<string,Record<string,unknown>>(),items=new Set<string>()
  for(const o of house.owned){
   if(!record(o)||!text(o.instanceId)||!text(o.furnitureId)||!integer(o.paidGems)||!date(o.acquiredAt)||!['purchase','level-gift'].includes(o.origin as string))return false
   const definition=furnitureRegistry[o.furnitureId]
   if(!definition||definition.element!=='all'&&definition.element!==element||definition.level>Number(house.level)||items.has(o.furnitureId)||allInstances.has(o.instanceId)||!!definition.gift!==(o.origin==='level-gift')||o.origin==='level-gift'&&o.paidGems!==0)return false
   owned.set(o.instanceId,o);items.add(o.furnitureId);allInstances.add(o.instanceId)
  }
  const placed=new Set<string>()
  for(const [slot,instance]of Object.entries(house.slots)){
   if(!(slot in slotDefinitions)||!text(instance)||placed.has(instance))return false
   const item=owned.get(instance);if(!item||!compatibleSlots(furnitureRegistry[String(item.furnitureId)],Number(house.level)).includes(slot as SlotId))return false;placed.add(instance)
  }
  if(Number(house.level)===0&&(house.owned.length||Object.keys(house.slots).length))return false
 }
 const receipts=new Set<string>();let revision=0
 for(const receipt of value.recentReceipts){
  if(!record(receipt)||!text(receipt.id,96)||!text(receipt.signature,1024)||!integer(receipt.revision)||Number(receipt.revision)<=revision||Number(receipt.revision)>Number(value.revision)||!elements.includes(receipt.element as Element)||!['upgrade','place','store','return'].includes(receipt.kind as string)||!date(receipt.at)||!integer(receipt.paid)||!integer(receipt.refunded)||receipts.has(receipt.id))return false
  receipts.add(receipt.id);revision=Number(receipt.revision)
 }
 const events=new Set<string>()
 for(const event of value.memoryEvents){
  if(!record(event)||!text(event.id)||events.has(event.id)||!elements.includes(event.element as Element)||!['upgrade','first-place'].includes(event.type as string)||!date(event.at)||!text(event.title,80)||!validSnapshot(event.snapshot,event.element as Element))return false
  if(value.schemaVersion===1&&(event.snapshot as any).assetVersion===3||(event.snapshot as any).scene?.revision===2&&Number(value.schemaVersion)<3||(event.snapshot as any).scene?.revision===3&&value.schemaVersion!==4)return false
  const snapshot=event.snapshot as unknown as HouseSnapshot,house=value.housesByElement[event.element as Element] as unknown as ElementHouse
  if(snapshot.level>house.level)return false
  if(event.type==='upgrade'&&(snapshot.level<1||event.id!==`house-upgrade:${event.element}:${snapshot.level}`)||event.type==='first-place'&&(!categories.includes(event.category as string)||event.id!==`house-first-place:${event.element}:${event.category}`))return false
  events.add(event.id)
 }
 return true
}
export function inspectLifeHouse(value:unknown):'empty'|'ready'|'future'|'invalid'{if(value===undefined)return 'empty';if(record(value)&&integer(value.schemaVersion)&&Number(value.schemaVersion)>4)return 'future';return validLifeHouse(value)?'ready':'invalid'}
/** Opaque newer/invalid domains may pass through learning writes, never be reset by them. */
export function safeLifeHouseWrite(before:unknown,after:unknown){
 try{if(JSON.stringify(before)===JSON.stringify(after))return true;return ['empty','ready'].includes(inspectLifeHouse(before))&&validLifeHouse(after)&&(!record(before)||Number(after.schemaVersion)>=Number(before.schemaVersion))}catch{return false}
}
