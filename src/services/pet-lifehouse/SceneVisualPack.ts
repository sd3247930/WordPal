import {currentSceneAsset} from './CurrentScenePack'
import fixedPublished from '../../static/pet-house/lifehouse/v5/manifest.json'
import published from '../../static/pet-house/lifehouse/v3/manifest.json'
import {itemDesignImage,designWearable} from './ItemVisualRegistry'
import {releasedVisual} from './VisualPack'
import {petGrowthAsset,type PetForm} from '../pet-growth'
import {isPetDressIconName} from '../pet-dress-icons'
import {petWearableSource} from '../pet-wearables'
import type {Element} from '../../../packages/pet_engine'
import {validWearablePlacement,type WearablePlacement} from './WearablePlacement'
export interface ScenePublishedFile {id:string;path:string;width:number;height:number;sha256Base64:string}
export interface SceneActorVariant {id:string;element:Element;form:PetForm;fileId:string;sourceSHA256:string;support:{x:number;y:number};bounds:{left:number;top:number;right:number;bottom:number}}
export interface SceneWearableFit {key:string;front:WearablePlacement;back?:WearablePlacement;reviewed:boolean}
export interface ScenePack {schemaVersion:number;assetVersion:number;status:string;metadataClean:boolean;actors:SceneActorVariant[];files:ScenePublishedFile[];wearableFits:SceneWearableFit[]}
const pack=published as unknown as ScenePack
/** Live rollback changes actor rendering only; archived snapshots still select their frozen variant. */
export const liveChibiEnabled=true
export function isScenePackReady(p:ScenePack){
 try{
  if(p.schemaVersion!==1||p.assetVersion!==3||p.status!=='ready'||!p.metadataClean||p.actors.length!==16||p.wearableFits.length!==144)return false
  const ids=new Set(p.files.map(f=>f.id)),actorIds=new Set(p.actors.map(a=>a.element+':'+a.form)),fitIds=new Set(p.wearableFits.map(f=>f.key))
  return ids.size===p.files.length&&actorIds.size===16&&fitIds.size===144&&p.files.every(f=>/^[a-z0-9-]+\.png$/.test(f.path)&&f.width>0&&f.height>0&&/^[a-zA-Z0-9+/]{43}=$/.test(f.sha256Base64))&&['water','fire','earth','wind'].every(e=>[1,2,3,4].every(f=>actorIds.has(e+':'+f)))&&p.actors.every(a=>a.id===`chibi-${a.element}-f${a.form}-r1`&&ids.has(a.fileId)&&[a.support.x,a.support.y].every(v=>Number.isFinite(v)&&v>0&&v<1))&&p.wearableFits.every(f=>f.reviewed&&validWearablePlacement(f.front)&&(!f.back||validWearablePlacement(f.back)))
 }catch{return false}
}
export const scenePackReady=isScenePackReady(pack)
const fixedFiles=new Map(fixedPublished.files.map(f=>[f.id,f]))
const files=new Map(pack.files.map(f=>[f.id,f])),actors=new Map(pack.actors.map(a=>[a.element+':'+a.form,a])),fits=new Map(pack.wearableFits.map(f=>[f.key,f]))
export function sceneAsset(id:string):string|undefined{
 const current=currentSceneAsset(id);if(current)return current
 const foreground=fixedFiles.get(id);if(foreground&&fixedPublished.metadataClean)return '/static/pet-house/lifehouse/v5/'+foreground.path
 if(id.startsWith('room-'))return releasedVisual(id+':stage')
 const file=files.get(id);if(file&&pack.metadataClean)return '/static/pet-house/lifehouse/v3/'+file.path
 if(id.startsWith('shared-'))return releasedVisual(id+':preview')
 return itemDesignImage(id,'preview')
}
export const sceneAssetReady=(id:string)=>!!sceneAsset(id)
export interface SceneActorSource {mode:'chibi'|'original-fallback';body:string;variantId:string;support:{x:number;y:number};pose?:'idle'|'sit'|'sleep';front?:string;back?:string;frontPlacement?:WearablePlacement;backPlacement?:WearablePlacement;fitRevision:number}
export function originalActorSource(element:Element,form:PetForm):SceneActorSource{return{mode:'original-fallback',body:petGrowthAsset(element,form),variantId:`original-${element}-f${form}`,support:{x:.5,y:.96},fitRevision:0}}
export function sceneActorSource(element:Element,form:PetForm,cosmetic?:string|null,allowQ=true):SceneActorSource{
 const original=originalActorSource(element,form),actor=actors.get(element+':'+form),body=actor&&sceneAsset(actor.fileId)
 if(!allowQ||!scenePackReady||!actor||!body)return original
 const q:SceneActorSource={mode:'chibi',body,variantId:actor.id,support:actor.support,fitRevision:1}
 if(!cosmetic)return q
 const fit=fits.get(`${element}-f${form}:${cosmetic}`);if(!fit?.reviewed)return original
 const wearable=isPetDressIconName(cosmetic)?{front:petWearableSource(element,form,cosmetic,'front'),back:cosmetic==='star'?undefined:petWearableSource(element,form,cosmetic,'back')}:designWearable(cosmetic,element,form)
 if(!wearable?.front||wearable.back&&!fit.back)return original
 return{...q,front:wearable.front,back:wearable.back,frontPlacement:fit.front,backPlacement:fit.back}
}
export const sceneActorVariants=()=>pack.actors
