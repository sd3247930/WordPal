import type {Element} from '../../../packages/pet_engine'
import type {PetForm} from '../pet-growth'
import {isPetDressIconName} from '../pet-dress-icons'
import {petWearableSource} from '../pet-wearables'
import {designWearable} from './ItemVisualRegistry'
import {sceneActorSource} from './SceneVisualPack'
import type {WearablePlacement} from './WearablePlacement'
import {dressDefinition,equippedItems,newDressAsset,equipmentBySlot,type DressSlot} from './DressCatalog'
import {dressAnchor,type ActorArtMode} from './DressFits'
import type {PoseArt} from './CurrentScenePack'

export interface DressLayer {key:string;id:string;name:string;slot:DressSlot;depth:'front'|'back';src:string;poseTransform?:string;placement?:WearablePlacement;rect?:{x:number;y:number;width:number;height:number;rotation:number}}
/** Re-anchor each slot separately; neckwear never follows a rotated head as one flat group. */
export function poseEquipmentLayers(element:Element,form:PetForm,layers:readonly DressLayer[],art:PoseArt):DressLayer[]{
 return layers.map(layer=>{const base=dressAnchor(element,form,layer.slot,'chibi'),target=art.anchors[layer.slot],scale=target.width/base.width
  return {...layer,poseTransform:`translate(${target.x*100}%,${target.y*100}%) rotate(${target.rotation-base.rotation}deg) scale(${scale}) translate(${-base.x*100}%,${-base.y*100}%)`}
 })
}
export function equipmentLayers(element:Element,form:PetForm,ids:readonly string[],mode:ActorArtMode):DressLayer[]{
 const layers:DressLayer[]=[],onNeck=!!equipmentBySlot(ids,element).neck
 for(const id of equippedItems(ids,element)){
  const item=dressDefinition(id,element)!
  if(item.kind==='new'){
   const anchor=dressAnchor(element,form,item.slot,mode,onNeck)
   for(const depth of ['back','front'] as const){
    const asset=newDressAsset(id,depth);if(!asset)continue
    const width=anchor.width,height=width*asset.height/asset.width*.75
    layers.push({key:id+':'+depth,id,name:item.name,slot:item.slot,depth,src:asset.src,rect:{x:anchor.x-width/2,y:anchor.y-height*(depth==='back'?.7:item.slot==='neck'?.32:.5),width,height,rotation:anchor.rotation}})
   }
   continue
  }
  const source=mode==='chibi'?sceneActorSource(element,form,id):isPetDressIconName(id)?{front:petWearableSource(element,form,id,'front'),back:id==='star'?undefined:petWearableSource(element,form,id,'back'),frontPlacement:undefined,backPlacement:undefined}:designWearable(id,element,form)
  if(!source?.front)continue
  for(const depth of ['back','front'] as const){const src=source[depth];if(!src)continue;let placement=depth==='back'?source.backPlacement:source.frontPlacement
   if(item.slot==='badge'&&onNeck)placement={scale:placement?.scale??1,offsetX:(placement?.offsetX??0)+3,offsetY:(placement?.offsetY??0)-6,rotation:placement?.rotation??0}
   layers.push({key:id+':'+depth,id,name:item.name,slot:item.slot,depth,src,placement})
  }
 }
 return layers
}
export function dressLayerStyle(layer:DressLayer){
 if(layer.rect){const r=layer.rect;return{left:r.x*100+'%',top:r.y*100+'%',width:r.width*100+'%',height:r.height*100+'%',transform:`rotate(${r.rotation}deg)`}}
 const p=layer.placement
 return{left:'50%',top:'50%',width:'100%',height:'100%',transform:'translate(-50%,-50%)'+(p?` translate(${p.offsetX/3.6}%,${p.offsetY/4.8}%) rotate(${p.rotation}deg) scale(${p.scale})`:'')}
}
