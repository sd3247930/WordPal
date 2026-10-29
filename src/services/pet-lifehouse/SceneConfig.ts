import {currentSceneDefinition} from './CurrentSceneLayouts'
import {currentSceneReady} from './CurrentScenePack'
import {fixedSceneDefinition} from './FixedSceneLayouts'
import {elements,type Element} from '../../../packages/pet_engine'
import {furnitureRegistry,slotDefinitions} from './HouseRegistry'
import type {ElementHouse,HouseLevel,SlotId} from './types'
import {rectanglePolygon,type ScenePoint,type ScenePolygon,type SceneRect} from './SceneGeometry'
import type {SceneFx,SceneMotion} from './SceneActionController'

/** Revision 1 is replayed by saved memories. Future layout changes require a new revision. */
export const sceneRevision:1|2|3=currentSceneReady?3:2
export type SceneZoneId='room'|'garden'|'gallery'|'courtyard'
export type SceneLayer='ambient'|'architecture'|'floor'|'back-props'|'actor'|'foreground'|'effects'|'hit'
export interface SceneNode {id:string;assetId:string;layer:SceneLayer;rect:SceneRect;depth:number;fixture?:boolean}
export interface SceneSlot {id:SlotId;zoneId:SceneZoneId;rect:SceneRect;support:ScenePoint;approach:ScenePoint;collision:ScenePolygon;depth:number;capacity?:1;allowedKinds?:import('./types').FurnitureKind[];poseKey?:string;hitRegion?:SceneRect;parentAnchor?:{nodeId:string;surface:ScenePoint}}
export interface SceneInteraction {id:string;element:Element;level:HouseLevel;name:string;motion:SceneMotion;fx:SceneFx;targetKind:string;slotId?:SlotId;fixtureId?:string;message:string;zoneId:SceneZoneId;pose?:'sit'|'sleep'}
export interface SceneZone {id:SceneZoneId;name:string;spawn:ScenePoint;walkable:ScenePolygon[];nodes:SceneNode[];entrances:{zoneId:SceneZoneId;point:ScenePoint}[];anchors?:ScenePoint[];cameraPresetId?:string;backgroundAsset?:string}
export interface SceneDefinition {element:Element;level:HouseLevel;revision:1|2|3;key?:string;baseSize?:{width:number;height:number};actorWidth?:number;growth?:{newSlots:SlotId[];newZones:SceneZoneId[];label:string};zones:SceneZone[];slots:SceneSlot[];interactions:SceneInteraction[]}
export const sceneZoneNames:Record<Element,Record<SceneZoneId,string>>={water:{room:'珍珠小屋',garden:'泡泡花园',gallery:'月光小池',courtyard:'水畔露台'},earth:{room:'森芽小屋',garden:'种植花园',gallery:'植物廊道',courtyard:'森林庭院'},fire:{room:'暖光小屋',garden:'阳光花园',gallery:'暖光圆台',courtyard:'追光庭院'},wind:{room:'轻云小屋',garden:'观景阳台',gallery:'风铃廊道',courtyard:'云端露台'}}
const p=(x:number,y:number):ScenePoint=>({x,y})
const slots:Record<SlotId,[SceneZoneId,number,number,number,number,number,number]>={
 left:['room',.06,.48,.28,.35,.27,.81],right:['room',.75,.28,.20,.42,.73,.77],center:['room',.32,.65,.38,.20,.51,.78],wall:['room',.35,.21,.27,.35,.52,.68],light:['room',.05,.40,.14,.24,.25,.72],plant:['room',.83,.65,.15,.25,.77,.80],garden:['garden',.69,.55,.28,.34,.63,.80],activity:['room',.61,.67,.25,.28,.54,.84],extra:['gallery',.69,.35,.20,.35,.61,.73],balcony:['courtyard',.08,.38,.20,.33,.33,.75]
}
const node=(id:string,assetId:string,layer:SceneLayer,rect:SceneRect,depth=0,fixture=false):SceneNode=>({id,assetId,layer,rect,depth,fixture})
const r=(x:number,y:number,width:number,height:number):SceneRect=>({x,y,width,height})
function zoneNodes(e:Element,level:HouseLevel,id:SceneZoneId):SceneNode[]{
 const result=[node(id+'-floor',`scene-${e}-floor`,'floor',r(.02,.39,.96,.56))]
 if(id==='room'&&level>0){result.push(node('rear-wall',`scene-${e}-wall`,'architecture',r(.06,.08,.88,.66)),node('canopy',`scene-${e}-roof`,'architecture',r(.05,-.02,.90,.31)));if(level>=2)result.push(node('side-window',`shared-${e}-window`,'architecture',r(.69,.17,.22,.30)));if(level>=3)result.push(node('garden-entry',`scene-${e}-wall`,'architecture',r(.78,.22,.21,.43)))}
 if(id==='room')result.push(node('initial-marker',`${e}-courtyard-l0-v1`,'back-props',r(.03,.52,.16,.23),3,true))
 if(id==='garden'||id==='courtyard'){
  result.push(node('garden-plants-a',`${e}-courtyard-l0-v1`,'back-props',r(.04,.36,.27,.34),3,true),node('garden-plants-b',`${e}-courtyard-l1-v1`,'back-props',r(.73,.35,.25,.33),3,true))
  if(level===5)result.push(node('garden-canopy',`scene-${e}-roof`,'architecture',r(.10,.08,.80,.28)),node('near-garden',`${e}-courtyard-l2-v1`,'foreground',r(.02,.75,.22,.23),70,true))
 }
 if(id==='gallery')result.push(node('gallery-wall',`scene-${e}-wall`,'architecture',r(.05,.09,.90,.63)),node('stairs','fixture-stairs','architecture',r(.72,.53,.27,.28)))
 if(e==='fire'&&id==='room'&&level>=2)result.push(node('slide','fixture-slide','back-props',r(.32,.43,.24,.30),3,true))
 if(e==='fire'&&id==='garden')result.push(node('display','fixture-display','back-props',r(.36,.39,.25,.33),3,true))
 if(e==='wind'&&id==='room'&&level>=2)result.push(node('artwall','fixture-artwall','back-props',r(.12,.33,.21,.29),3,true))
 if(e==='water'&&id==='room'&&level>=2)result.push(node('toyrack','fixture-toyrack','back-props',r(.61,.40,.19,.28),3,true))
 if(e==='water'&&id==='garden')result.push(node('curtain','fixture-curtain','foreground',r(.31,.20,.34,.62),70,true))
 if(id==='gallery'){result.push(node('element-lamp',`${e}-decor-l2-v1`,'back-props',r(.11,.37,.20,.30),3,true));if(e==='earth')result.push(node('sort-cabinet','fixture-cabinet','back-props',r(.61,.35,.25,.35),3,true));if(e==='water')result.push(node('moon-pool','water-courtyard-l4-v1','back-props',r(.31,.48,.38,.31),3,true))}
 if(id==='courtyard')result.push(node('element-pavilion',`${e}-courtyard-l5-v1`,'back-props',r(.07,.12,.40,.48),3,true))
 return result
}
const names:Record<Element,string[]>={fire:['星火招呼','软垫弹跳','滑梯探险','奖杯展示','火焰共鸣','庭院追光'],earth:['认识嫩芽','床边休息','书架整理','浇灌花圃','摆放整齐','庭院漫步'],wind:['云朵观景','吊床摇晃','涂鸦创作','书桌变化','风铃回应','云台远眺'],water:['水面问候','软垫休息','玩偶陪伴','帘后探看','月光泡泡','池边倒影']}
const fx:Record<Element,SceneFx[]>={fire:['sparkle','cushion_squish','glow','sparkle','glow','light_chase'],earth:['leaf_sway','cushion_squish','book_shift','ripple','object_sort','leaf_sway'],wind:['glow','cushion_squish','doodle_trace','object_sort','wind_chime','glow'],water:['ripple','cushion_squish','bubble','glow','bubble','ripple']}
const messages:Record<Element,string[]>={fire:['一起收好今天的阳光。','软软的，好开心！','滑到这里，安全到家。','喜欢的小东西都在这里。','一点暖光，刚刚好。','光点在陪我走回家。'],earth:['小芽在向你问好。','在软软的床边休息一下。','小书们排好队啦。','小叶子喝到水啦。','把喜欢的东西放整齐。','慢慢走，也有新发现。'],wind:['云朵在慢慢旅行。','风轻轻的，真舒服。','这里多了一点新颜色。','试着换一个小排列。','风铃在回应我们。','从这里看看远方。'],water:['涟漪收到你的问候啦。','软软的小角落，好安心。','和小玩偶待一会儿。','找到我了吗？','留住一颗月光泡泡。','水里也有我们的影子。']}
function interactions(e:Element,level:HouseLevel):SceneInteraction[]{
 return Array.from({length:level+1},(_,n)=>{
  const l=n as HouseLevel,slotId:SlotId|undefined=n===1?'left':e==='earth'&&n===2?'right':e==='earth'&&n===3?'garden':e==='wind'&&n===3?'activity':e==='wind'&&n===4?'wall':undefined
  const zoneId:SceneZoneId=n===5?'courtyard':n===4?'gallery':e==='water'&&n===3||e==='fire'&&n===3||e==='earth'&&n===3?'garden':'room'
  const fixtureId=n===0?'initial-marker':e==='fire'&&n===2?'slide':e==='fire'&&n===3?'display':e==='wind'&&n===2?'artwall':e==='water'&&n===2?'toyrack':e==='water'&&n===3?'curtain':n===4?(e==='earth'?'sort-cabinet':e==='water'?'moon-pool':'element-lamp'):undefined
  return{id:`${e}-interaction-${n}`,element:e,level:l,name:names[e][n],motion:e==='fire'&&(n===0||n===4)?'jump':e==='water'&&n===3?'hide_reveal':n===0||e==='water'||e==='wind'?'float':e==='fire'&&n===1?'jump':'move',fx:fx[e][n],targetKind:e==='wind'&&n===4?'chime':slotId?slotDefinitions[slotId].kinds[0]:'fixture',slotId,fixtureId:slotId?undefined:fixtureId,message:messages[e][n],zoneId}
 })
}
function legacySceneDefinition(element:Element,level:HouseLevel):SceneDefinition{
 const ids:SceneZoneId[]=['room'];if(level>=3)ids.push('garden');if(level>=4)ids.push('gallery');if(level>=5)ids.push('courtyard')
 const top=.54-Math.min(level,2)*.025,walkable:ScenePolygon=[p(.12,top),p(.85,top),p(.94,.84),p(.80,.93),p(.20,.93),p(.06,.83)]
 return{element,level,revision:1,zones:ids.map(id=>({id,name:sceneZoneNames[element][id],spawn:p(element==='water'&&id==='garden'?.76:.50,.81),walkable:[walkable],nodes:zoneNodes(element,level,id),entrances:ids.filter(other=>other!==id).map((zoneId,i)=>({zoneId,point:p(i%2?.80:.20,.82)}))})),slots:(Object.entries(slots) as [SlotId,typeof slots[SlotId]][]).filter(([id])=>slotDefinitions[id].level<=level).map(([id,[zoneId,x,y,w,h,ax,ay]])=>({id,zoneId,rect:r(x,y,w,h),support:p(x+w*.5,y+h*.90),approach:p(ax,ay),collision:rectanglePolygon(r(x+.025,y+h*.80,Math.max(.05,w-.05),.045)),depth:Math.round((y+h*.90)*100)})),interactions:interactions(element,level)}
}
export function sceneDefinition(element:Element,level:HouseLevel,revision:1|2|3=sceneRevision):SceneDefinition{const legacy=legacySceneDefinition(element,level),fixed=fixedSceneDefinition(legacy);return revision===1?legacy:revision===2?fixed:currentSceneDefinition(fixed)}
export const allSceneDefinitions=(revision:1|2|3=sceneRevision)=>elements.flatMap(e=>[0,1,2,3,4,5].map(l=>sceneDefinition(e,l as HouseLevel,revision)))
export function placedSceneSlots(scene:SceneDefinition,house:ElementHouse,zoneId:SceneZoneId){return scene.slots.filter(s=>s.zoneId===zoneId&&house.slots[s.id]).map(s=>({...s,owned:house.owned.find(o=>o.instanceId===house.slots[s.id])!})).filter(s=>s.owned)}
export function sceneObstacles(scene:SceneDefinition,house:ElementHouse,zoneId:SceneZoneId):ScenePolygon[]{
 const placed=placedSceneSlots(scene,house,zoneId).filter(s=>!['rug','window','chime'].includes(furnitureRegistry[s.owned.furnitureId].kind)).map(s=>s.collision)
 const fixtures=scene.zones.find(z=>z.id===zoneId)?.nodes.filter(n=>n.fixture&&n.layer!=='foreground').map(n=>rectanglePolygon(r(n.rect.x+.02,n.rect.y+n.rect.height*.80,Math.max(.02,n.rect.width-.04),.035)))??[]
 return [...placed,...fixtures]
}
export function interactionAvailability(spec:SceneInteraction,scene:SceneDefinition,house:ElementHouse,assetReady:(id:string)=>boolean):{ready:boolean;reason:string;zone:SceneZone|undefined;target:ScenePoint;slot?:SceneSlot}{
 let slot=spec.slotId?scene.slots.find(s=>s.id===spec.slotId):undefined
 if(spec.targetKind==='chime')slot=scene.slots.find(s=>{const o=house.owned.find(o=>o.instanceId===house.slots[s.id]);return o&&furnitureRegistry[o.furnitureId]?.kind==='chime'})
 const zone=scene.zones.find(z=>z.id===(slot?.zoneId??spec.zoneId))
 let reason=house.level<spec.level?'让房屋再长大一级，就能一起玩啦。':!zone?'这个区域尚未开放。':''
 if(!reason&&spec.slotId){const own=slot&&house.owned.find(o=>o.instanceId===house.slots[slot.id]);if(!own||furnitureRegistry[own.furnitureId]?.kind!==spec.targetKind)reason='先把对应家具放好，再一起试试。'}
 const targetNode=zone?.nodes.find(n=>n.id===spec.fixtureId)
 if(!reason&&spec.fixtureId&&(!targetNode||!assetReady(targetNode.assetId)))reason='这个小角落的素材暂不可用，请稍后重试。'
 const target=slot?slot.approach:spec.motion==='hide_reveal'?p(.43,.79):spec.level===5?p(.73,.80):targetNode?p(Math.min(.80,Math.max(.20,targetNode.rect.x+targetNode.rect.width*.5)),Math.min(.83,Math.max(.65,targetNode.rect.y+targetNode.rect.height+.06))):zone?.spawn??p(.5,.81)
 return{ready:!reason,reason,zone,target,slot}
}
