import type {SceneDefinition} from './SceneConfig'
import {houseLevelName} from './HouseIdentity'
import {validateFixedScene} from './FixedSceneLayouts'

/** Revision 3 has its own art IDs. Frozen revision 1/2 memories retain their sources. */
export function currentSceneDefinition(previous:SceneDefinition):SceneDefinition{
 const {element,level}=previous
 const slots=previous.slots.map(s=>s.id==='light'?{...s,rect:{x:.062,y:.41,width:.12,height:.24},support:{x:.122,y:.6356},depth:73,parentAnchor:{nodeId:'v6-bedside-support',surface:{x:.122,y:.6356}}}:s)
 return {...previous,slots,revision:3,key:element+'-l'+level+'-r3',interactions:previous.interactions.map(action=>({...action,...(element==='fire'&&action.level===3?{pose:'sit' as const}:element==='earth'&&action.level===3?{pose:'sit' as const,fx:'watering' as const}:element==='earth'&&action.level===5?{fx:'harvest' as const}:action.level===1?{name:'软软小床歇一歇',pose:'sleep' as const,motion:'idle' as const}:action.level===2&&element!=='fire'?{pose:'sit' as const}:{} )})),zones:previous.zones.map(zone=>{
  const backgroundLevel=zone.id==='garden'?0:level,background='v6-room-'+element+'-l'+backgroundLevel
  const nodes=zone.nodes.map(node=>node.id==='fixed-background'?{...node,assetId:'v6-floor-'+element+'-l'+backgroundLevel,layer:'floor' as const}:node.id==='fixed-near-edge'?{...node,assetId:'v6-front-'+element+'-l'+backgroundLevel}:node)
  nodes.splice(1,0,{id:'v6-architecture',assetId:'v6-architecture-'+element+'-l'+backgroundLevel,layer:'architecture',rect:{x:0,y:0,width:1,height:1},depth:1})
  if(level>0&&zone.id==='room')nodes.splice(2,0,{id:'v6-bedside-support',assetId:element+'-furniture-l3-v1',layer:'back-props',rect:{x:.035,y:.58,width:.20,height:.19},depth:72,fixture:true})
  if(element==='wind'&&zone.id==='gallery')nodes.splice(2,0,{id:'v6-windmill',assetId:'v6-prop-windmill-base',layer:'back-props',rect:{x:.05,y:.30,width:.23,height:.345},depth:3})
  return {...zone,name:zone.id==='room'?houseLevelName(element,level):zone.name,backgroundAsset:background,nodes}
 })}
}
export function validateCurrentScene(scene:SceneDefinition,assetReady:(id:string)=>boolean){
 if(scene.revision!==3||scene.key!==scene.element+'-l'+scene.level+'-r3')return ['scene-contract']
 return validateFixedScene({...scene,revision:2,key:scene.element+'-l'+scene.level+'-r2'},assetReady)
}
