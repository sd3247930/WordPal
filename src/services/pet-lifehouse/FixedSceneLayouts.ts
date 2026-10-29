import type {Element} from '../../../packages/pet_engine'
import {slotDefinitions} from './HouseRegistry'
import type {HouseLevel,SlotId} from './types'
import {rectanglePolygon,type ScenePoint,type SceneRect} from './SceneGeometry'
import type {SceneDefinition,SceneSlot,SceneZoneId} from './SceneConfig'

// Per-scene camera/floor measurements on the published 1536 × 1024 clean backgrounds.
// [floor horizon, left bank, right bank, idle x, idle y, actor width, wall attachment x]
type Calibration=readonly [number,number,number,number,number,number,number]
const calibration:Record<Element,readonly Calibration[]>={
 water:[[.57,.10,.90,.50,.84,.34,.36],[.51,.10,.88,.53,.85,.32,.76],[.50,.09,.88,.53,.85,.30,.77],[.51,.08,.76,.48,.84,.28,.78],[.56,.10,.83,.48,.85,.26,.76],[.53,.08,.88,.50,.84,.25,.80]],
 fire:[[.56,.11,.89,.50,.84,.34,.36],[.53,.11,.90,.53,.85,.32,.70],[.51,.10,.89,.51,.85,.30,.12],[.49,.09,.90,.52,.84,.28,.72],[.54,.09,.90,.51,.85,.26,.76],[.52,.08,.91,.52,.85,.25,.77]],
 earth:[[.55,.10,.90,.50,.84,.34,.36],[.53,.10,.89,.51,.84,.32,.74],[.52,.09,.89,.52,.84,.30,.76],[.50,.08,.87,.51,.84,.28,.75],[.55,.10,.88,.52,.85,.26,.75],[.52,.08,.90,.51,.84,.25,.78]],
 wind:[[.57,.11,.89,.50,.84,.34,.36],[.52,.10,.90,.52,.84,.32,.76],[.51,.09,.90,.52,.84,.30,.77],[.50,.09,.90,.52,.84,.28,.76],[.55,.10,.88,.51,.85,.26,.78],[.53,.09,.90,.52,.84,.25,.79]]
}
const point=(x:number,y:number):ScenePoint=>({x,y})
const rect=(x:number,y:number,width:number,height:number):SceneRect=>({x,y,width,height})
const placements:Record<SlotId,[SceneZoneId,SceneRect,ScenePoint]>={
 left:['room',rect(.07,.48,.27,.32),point(.38,.85)],right:['room',rect(.75,.30,.18,.39),point(.66,.79)],center:['room',rect(.34,.72,.34,.15),point(.51,.88)],wall:['room',rect(.75,.15,.18,.27),point(.66,.75)],light:['room',rect(.04,.42,.13,.25),point(.27,.78)],plant:['room',rect(.81,.63,.15,.24),point(.73,.82)],garden:['garden',rect(.71,.55,.25,.32),point(.62,.83)],activity:['room',rect(.65,.68,.23,.23),point(.55,.86)],extra:['gallery',rect(.70,.35,.19,.33),point(.61,.78)],balcony:['courtyard',rect(.09,.42,.20,.30),point(.34,.80)]
}
export const fixedSceneRevision=2 as const
export const fixedSceneKeys=Object.keys(calibration).flatMap(e=>[0,1,2,3,4,5].map(l=>`${e}-l${l}-r2`))
export function fixedSceneDefinition(legacy:SceneDefinition):SceneDefinition{
 const {element,level}=legacy,c=calibration[element][level],previous=level?Object.keys(slotDefinitions).filter(id=>slotDefinitions[id as SlotId].level<=level-1):[],newSlots=legacy.slots.filter(s=>!previous.includes(s.id)).map(s=>s.id)
 const slots:SceneSlot[]=legacy.slots.map(old=>{
  const [zoneId,base,approach]=placements[old.id],r={...base},target={...approach},far=level>=4?.90:level===3?.95:1
  if(zoneId==='room'){
   if(old.id==='wall')r.x=c[6]
   if(old.id==='plant'&&element==='water'&&level===3){r.x=.66;target.x=.60}
   if(old.id==='right'&&element==='water'&&level===3){r.x=.63;target.x=.57}
   if(level>=4){r.width*=far;r.height*=far;r.y+=.025}
  }
  const support=point(r.x+r.width*.5,r.y+r.height*.94),flat=old.id==='center'||old.id==='wall'
  return{...old,zoneId,rect:r,support,approach:target,collision:rectanglePolygon(rect(r.x+.015,r.y+r.height*.82,Math.max(.025,r.width-.03),.035)),depth:flat?3:Math.round(support.y*100),capacity:1,allowedKinds:[...slotDefinitions[old.id].kinds],poseKey:`${element}-l${level}-${old.id}-${zoneId==='room'?'near':'middle'}`,hitRegion:r}
 })
 const zones=legacy.zones.map(z=>{
  const outdoors=z.id==='garden',horizon=outdoors?.52:z.id==='gallery'?.54:c[0],left=outdoors?.08:c[1],right=outdoors?.91:c[2],idle=z.id==='room'?point(c[3],c[4]):z.id==='garden'&&element==='water'?point(.73,.90):point(.5,.84)
  const floor=[point(left+.04,horizon),point(right-.04,horizon),point(right,.88),point(right-.08,.93),point(left+.08,.93),point(left,.87)]
  const nodes=z.nodes.filter(n=>n.fixture).map(n=>({...n,rect:{...n.rect}}))
  if(z.id==='room'&&level>0){const marker=nodes.find(n=>n.id==='initial-marker');if(marker)marker.rect=rect(.015,.30,.10,.18)}
  if(z.id==='room'&&element==='water'){const rack=nodes.find(n=>n.id==='toyrack');if(rack)rack.rect=rect(.18,.28,.14,.22)}
  // Old generic walls/roofs are not stacked over a newly composed architectural background.
  const backgroundLevel=outdoors?0:level,background=`room-${element}-l${backgroundLevel}`
  nodes.unshift({id:'fixed-background',assetId:background,layer:'ambient',rect:rect(0,0,1,1),depth:0})
  nodes.push({id:'fixed-near-edge',assetId:`fixed-${element}-l${backgroundLevel}-front`,layer:'foreground',rect:rect(0,0,1,1),depth:150})
  return{...z,spawn:idle,walkable:[floor],nodes,anchors:[idle,point(Math.max(left+.16,.39),.87),point(Math.min(right-.14,.62),.87)],cameraPresetId:`${element}-l${level}-${z.id}`,backgroundAsset:background}
 })
 return{...legacy,revision:2,key:`${element}-l${level}-r2`,baseSize:{width:1536,height:1024},actorWidth:c[5],slots,zones,growth:{newSlots,newZones:level===3?['garden']:level===4?['gallery']:level===5?['courtyard']:[],label:['出生地与安全待机点','第一间小屋与休息位置','新增窗边和绿植角落','新增庭院与活动桌位','新增错层空间与楼上角落','新增露台与完整庭院'][level]}}
}
export function validateFixedScene(scene:SceneDefinition,assetReady:(id:string)=>boolean):string[]{
 const issues:string[]=[],unit=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1,pointOk=(p:ScenePoint)=>unit(p.x)&&unit(p.y)
 if(scene.revision!==2||scene.key!==`${scene.element}-l${scene.level}-r2`||scene.baseSize?.width!==1536||scene.baseSize?.height!==1024)issues.push('scene-contract')
 if(new Set(scene.slots.map(s=>s.id)).size!==scene.slots.length)issues.push('duplicate-slot')
 for(const z of scene.zones){if(!pointOk(z.spawn)||!z.anchors?.every(pointOk)||!z.nodes.every(n=>assetReady(n.assetId)))issues.push('zone:'+z.id)}
 for(const s of scene.slots){if(!s.allowedKinds?.length||s.capacity!==1||slotDefinitions[s.id].level>scene.level||!pointOk(s.support)||!pointOk(s.approach)||![s.rect.x,s.rect.y,s.rect.width,s.rect.height,s.rect.x+s.rect.width,s.rect.y+s.rect.height].every(unit)||!scene.zones.some(z=>z.id===s.zoneId))issues.push('slot:'+s.id)}
 return issues
}
