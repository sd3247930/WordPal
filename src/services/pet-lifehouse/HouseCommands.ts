import {validateCurrentScene} from './CurrentSceneLayouts'
import {houseLevelName} from './HouseIdentity'
import {validateFixedScene} from './FixedSceneLayouts'
import {sceneAsset} from './SceneVisualPack'
import {elements,petInfo} from '../../../packages/pet_engine'
import {catalogForElement,compatibleSlots,furnitureRegistry,houseCatalogVersion,housePrices} from './HouseRegistry'
import {emptyLifeHouse,inspectLifeHouse,validLifeHouse} from './HouseValidation'
import type {ElementHouse,FurnitureDefinition,HouseAccount,HouseCommand,HouseContext,HouseError,HouseFailure,HouseLevel,HouseMemoryEvent,HouseReceipt,HouseResult,HouseSnapshot,LifeHouseDomain,SlotId} from './types'
import {sceneDefinition} from './SceneConfig'
import {isElementDressDesign} from './VisualInventory'
import {dressDefinition,validEquipment} from './DressCatalog'

const failure=(error:HouseError,needed?:number):HouseFailure=>({ok:false,error,...(needed===undefined?{}:{needed})})
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0
export function houseCommandSignature(c:HouseCommand){return JSON.stringify([c.kind,c.element,c.expectedRevision,c.catalogVersion,c.targetLevel??null,c.furnitureId??null,c.slotId??null,c.instanceId??null,c.replaceMode??'store'])}
function snapshot(house:ElementHouse,context:HouseContext,command:HouseCommand):HouseSnapshot{
 const result:HouseSnapshot={level:house.level,items:Object.entries(house.slots).map(([slotId,id])=>({slotId:slotId as SlotId,furnitureId:house.owned.find(o=>o.instanceId===id)!.furnitureId})),form:context.form??1,cosmetic:context.cosmetic??null,assetVersion:context.assetVersion??1}
 if(context.cosmetics)result.cosmetics=[...context.cosmetics]
 if(result.assetVersion===3){const scene=sceneDefinition(command.element,house.level,context.sceneRevision??1),slot=command.kind==='place'?scene.slots.find(s=>s.id===command.slotId):undefined,zone=scene.zones.find(z=>z.id===(slot?.zoneId??'room'))!;result.scene={revision:scene.revision,zoneId:zone.id,actorAnchor:slot?.approach??zone.spawn,cameraPresetId:'zone',actorAnchorId:slot?'slot:'+slot.id:'spawn',actorVariant:context.actorVariant??`original-${command.element}-f${result.form}`,fitRevision:context.fitRevision??0}}
 return result
}
function remember(domain:LifeHouseDomain,command:HouseCommand,context:HouseContext,definition?:FurnitureDefinition){
 const house=domain.housesByElement[command.element],name=petInfo[command.element].name
 const event:HouseMemoryEvent=definition?{id:`house-first-place:${command.element}:${definition.category}`,element:command.element,type:'first-place',category:definition.category,at:context.at,title:`第一次布置${{rest:'休息区',function:'生活角',activity:'活动区',decor:'小装饰'}[definition.category]}`,snapshot:snapshot(house,context,command)}:{id:`house-upgrade:${command.element}:${house.level}`,element:command.element,type:'upgrade',at:context.at,title:`${name}的${houseLevelName(command.element,house.level)}`,snapshot:snapshot(house,context,command)}
 if(!domain.memoryEvents.some(e=>e.id===event.id))domain.memoryEvents.push(event)
}
function grant(domain:LifeHouseDomain,command:HouseCommand,context:HouseContext,id:string,slot:SlotId){
 const house=domain.housesByElement[command.element],existing=house.owned.find(o=>o.furnitureId===id)
 if(existing)return
 const instanceId=`gift:${command.element}:${id}`;house.owned.push({instanceId,furnitureId:id,paidGems:0,origin:'level-gift',acquiredAt:context.at})
 if(!house.slots[slot]){house.slots[slot]=instanceId;remember(domain,{...command,kind:'place',slotId:slot},context,furnitureRegistry[id])}
}
/** Pure domain transaction: callers persist the returned domain and wallet in ONE snapshot. */
export function executeHouseCommand(account:HouseAccount,command:HouseCommand,context:HouseContext):HouseResult{
 if(context.sceneRevision!==undefined&&(![1,2,3].includes(context.sceneRevision)||context.assetVersion!==3))return failure('invalid-command')
 if(context.cosmetics!==undefined&&(!command||context.assetVersion!==3||!validEquipment(context.cosmetics,command.element)))return failure('invalid-command')
 if(!command||!elements.includes(command.element)||!['upgrade','place','store','return'].includes(command.kind)||!integer(command.expectedRevision)||typeof command.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,96}$/.test(command.requestId)||!Number.isFinite(Date.parse(context.at))||!integer(account.gems)||context.form!==undefined&&![1,2,3,4].includes(context.form)||context.assetVersion!==undefined&&![1,2,3].includes(context.assetVersion)||context.cosmetic!=null&&!['ribbon','scarf','star'].includes(context.cosmetic)&&!((context.assetVersion===2||context.assetVersion===3)&&isElementDressDesign(context.cosmetic,command.element))&&!(context.assetVersion===3&&dressDefinition(context.cosmetic,command.element)))return failure('invalid-command')
 const state=inspectLifeHouse(account.lifeHouse);if(state==='future'||state==='invalid')return failure('protected')
 const source=state==='empty'?emptyLifeHouse():account.lifeHouse as LifeHouseDomain,signature=houseCommandSignature(command)
 const previous=source.recentReceipts.find(r=>r.id===command.requestId)
 if(previous)return previous.signature===signature?{ok:true,gems:account.gems,domain:source,receipt:previous,replayed:true,response:''}:failure('replay-mismatch')
 if(command.catalogVersion!==houseCatalogVersion)return failure('catalog-changed')
 if(command.expectedRevision!==source.revision)return failure('stale')
 const domain=JSON.parse(JSON.stringify(source)) as LifeHouseDomain,house=domain.housesByElement[command.element]
 if(context.assetVersion===3)domain.schemaVersion=Math.max(domain.schemaVersion,context.sceneRevision===3?4:context.sceneRevision===2?3:2) as LifeHouseDomain['schemaVersion']
 let paid=0,refunded=0,response='';let firstPlaced:FurnitureDefinition|undefined
 if(command.kind==='upgrade'){
  if(house.level===5)return failure('max-level')
  if(command.targetLevel!==house.level+1)return failure('locked')
  if(context.sceneRevision===2&&validateFixedScene(sceneDefinition(command.element,command.targetLevel as HouseLevel,2),id=>!!sceneAsset(id)).length||context.sceneRevision===3&&validateCurrentScene(sceneDefinition(command.element,command.targetLevel as HouseLevel,3),id=>!!sceneAsset(id)).length)return failure('scene-unavailable')
  paid=housePrices[command.targetLevel];if(account.gems<paid)return failure('insufficient',paid-account.gems)
  house.level=command.targetLevel as HouseLevel;house.lastUpgradeAt=context.at
  if(house.level===1)grant(domain,command,context,'starter-bed','left')
  if(house.level===2){grant(domain,command,context,'starter-window','wall');grant(domain,command,context,'starter-shelf','right')}
  remember(domain,command,context);response='我们的家又长大了一点！'
 }else if(command.kind==='place'){
  const item=furnitureRegistry[command.furnitureId||''],slot=command.slotId
  if(!item||item.element!=='all'&&item.element!==command.element)return failure('missing-item')
  if(item.level>house.level)return failure('locked')
  if(!slot||!compatibleSlots(item,house.level).includes(slot))return failure('incompatible-slot')
  if(command.replaceMode!==undefined&&!['store','return'].includes(command.replaceMode))return failure('invalid-command')
  let owned=house.owned.find(o=>o.furnitureId===item.id)
  if(item.gift&&!owned)return failure('missing-item')
  if(owned&&house.slots[slot]===owned.instanceId)return failure('already-placed')
  const occupied=house.owned.find(o=>o.instanceId===house.slots[slot])
  if(occupied&&command.replaceMode==='return'){
   if(occupied.origin==='level-gift')return failure('gift-return')
   refunded=Math.floor(occupied.paidGems*.5);house.owned=house.owned.filter(o=>o.instanceId!==occupied.instanceId)
  }
  paid=owned?0:item.price
  if(account.gems+refunded<paid)return failure('insufficient',paid-account.gems-refunded)
  if(!owned){if(!catalogForElement(command.element).some(i=>i.id===item.id))return failure('missing-item');owned={instanceId:'item:'+command.requestId,furnitureId:item.id,paidGems:paid,origin:'purchase',acquiredAt:context.at};house.owned.push(owned)}
  for(const [oldSlot,id]of Object.entries(house.slots))if(id===owned.instanceId||occupied&&command.replaceMode==='return'&&id===occupied.instanceId)delete house.slots[oldSlot as SlotId]
  house.slots[slot]=owned.instanceId;firstPlaced=item;response=item.response
 }else{
  const owned=house.owned.find(o=>o.instanceId===command.instanceId);if(!owned)return failure('missing-item')
  if(command.kind==='return'){
   if(owned.origin==='level-gift')return failure('gift-return')
   refunded=Math.floor(owned.paidGems*.5);house.owned=house.owned.filter(o=>o.instanceId!==owned.instanceId)
  }else if(!Object.values(house.slots).includes(owned.instanceId))return failure('already-placed')
  for(const [slot,id]of Object.entries(house.slots))if(id===owned.instanceId)delete house.slots[slot as SlotId]
  response=command.kind==='return'?'已退回，灵石收好了。':'已收纳，下次摆放还是免费的。'
 }
 const gems=account.gems-paid+refunded
 if(!integer(gems)||!Number.isSafeInteger(domain.revision+1))return failure('overflow')
 domain.revision++
 if(firstPlaced)remember(domain,command,context,firstPlaced)
 const receipt:HouseReceipt={id:command.requestId,signature,revision:domain.revision,element:command.element,kind:command.kind,at:context.at,paid,refunded}
 domain.recentReceipts=[...domain.recentReceipts,receipt].slice(-50)
 if(!validLifeHouse(domain))return failure('invalid-command')
 return {ok:true,domain,gems,receipt,replayed:false,response}
}
export function houseErrorText(result:HouseFailure){
 if(result.error==='insufficient')return `还差 ${result.needed||0} 灵石，一起去学习吧。`
 return ({protected:'家园档案暂时无法安全修改，原数据已保留。',stale:'家园刚刚有了变化，请重新预览后确认。','catalog-changed':'家具信息已更新，请重新选择。','replay-mismatch':'这次操作已处理，请重新选择。',locked:'再把家升一级，就能使用这里啦。','max-level':'家园已经达到最高等级。','missing-item':'这件物品暂不可用，请重新打开家具目录。','incompatible-slot':'换一个亮起的位置，就可以放下它。','already-placed':'物品已经在这里，不需要重复操作。','gift-return':'这是升级礼物，可以收纳并免费再放置。','scene-unavailable':'新场景素材暂不可用，小屋和灵石已保留。',overflow:'当前数值暂不能安全保存，请先导出备份。','invalid-command':'这次操作未能完成，家园与灵石都没有改变。'} satisfies Record<Exclude<HouseError,'insufficient'>,string>)[result.error]
}
