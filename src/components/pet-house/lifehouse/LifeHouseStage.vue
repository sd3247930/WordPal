<template>
 <view class="lh-stage lh-v4-stage" :class="{'lh-stage-dress-preview':dressPreview}" :data-house-level="house.level" :data-element="pet.element" :data-engine="scene.revision===3?'fixed-v6':scene.revision===2?'fixed-v5':'layered-v3'" aria-label="精灵家园舞台">
  <view class="lh-v4-heading"><view><text class="lh-pet-name lh-block">{{protectedHouse?'家园待恢复':houseLevelName(pet.element,house.level)}}</text><text class="lh-caption">{{petInfo[pet.element].name}} · {{petMoods[pet.mood]}} · Lv.{{pet.level}}</text></view><WPActionTile class="lh-house-badge" :aria-label="protectedHouse?'家园待恢复':'房屋 Lv.'+house.level+'，查看升级'" @click="emit('upgrade')"><LifeHouseAsset class="lh-badge-icon" :src="lifeHouseIcon('home')" decorative/><text>{{protectedHouse?'家园待恢复':'房屋 Lv.'+house.level}}</text></WPActionTile></view>
  <view v-if="!dressPreview&&zonesOpen&&scene.zones.length>1" class="lh-zone-tabs" role="group" aria-label="家园区域"><WPActionTile v-for="z in scene.zones" :key="z.id" :selected="zone.id===z.id" :aria-pressed="zone.id===z.id" :aria-label="'进入'+z.name" @click="changeZone(z.id)">{{z.name}}</WPActionTile></view>
  <view class="lh-stage-scene-wrap"><SceneCanvas :key="pet.element+house.level+zone.id+retryAttempt" :scene="scene" :zone="zone" :house="house" :form="form" :cosmetics="pet.equippedCosmetics" :actor-position="state.position" :actor-motion="state.motion" :actor-pose="state.pose||'idle'" :active-fx="state.fx" :target-id="state.targetId" :duration="state.duration" :reduced="reduced" :allow-q="liveChibiEnabled" :preview="preview" interactive @ground="ground" @actor="run(scene.interactions[0])" @object="object" @slot="emit('slot',$event)" @appearance="appearance" @asset-error="sceneFailure"/><view v-if="!dressPreview" class="lh-scene-quick-actions" :class="{'lh-quick-dock':state.phase!=='ready'||distance(state.position,zone.spawn)>.025}"><WPActionTile class="lh-quick-action" aria-label="打开家园相册" @click.stop="emit('album')">家园相册</WPActionTile><WPActionTile class="lh-quick-action" :aria-expanded="actionsOpen" @click.stop="actionsOpen=!actionsOpen">{{actionsOpen?'收起互动':'一起玩 · '+scene.interactions.length}}</WPActionTile></view></view>
  <view v-if="!dressPreview" class="lh-v4-stage-caption" role="status" aria-live="polite"><text class="lh-stage-message" :class="{'lh-has-feedback':notice||state.message||speech}">{{notice||state.message||speech||'给伙伴一个软乎乎的家。'}}</text><WPActionTile v-if="loadFailed" class="lh-text-button" aria-label="重试加载家园互动素材" @click="retryZone">重试</WPActionTile><WPActionTile v-if="scene.zones.length>1" class="lh-text-button lh-stage-region" aria-label="切换家园区域" :aria-expanded="zonesOpen" @click="zonesOpen=!zonesOpen">{{zone.name}} · 区域</WPActionTile><WPActionTile class="lh-text-button lh-stage-help" aria-label="精灵屋帮助" @click="emit('help')">小提示</WPActionTile></view>
  <view v-if="managedObject" class="lh-scene-object-tools"><text class="lh-caption">{{furnitureRegistry[managedObject.furnitureId].name}}</text><WPActionTile class="lh-text-button" @click="emit('manage',managedObject.instanceId)">调整或收纳</WPActionTile></view>

  <view v-if="actionsOpen&&!dressPreview" class="lh-scene-actions" role="group" aria-label="已解锁家园互动"><WPActionTile v-for="spec in scene.interactions" :key="spec.id" :aria-label="spec.name" :disabled="state.phase!=='ready'||loading" @click="run(spec)">{{spec.name}}</WPActionTile></view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,getCurrentInstance,nextTick} from 'vue'
import {houseLevelName} from '../../../services/pet-lifehouse/HouseIdentity'
import {poseArt,currentSceneAsset} from '../../../services/pet-lifehouse/CurrentScenePack'
import {onHide,onShow} from '@dcloudio/uni-app'
import {petInfo,type PetState} from '../../../../packages/pet_engine'
import {petMoods} from '../../../styles/pet-house'
import {usePetFormsStore} from '../../../stores/pet-forms'
import {lifeHouseIcon} from '../../../services/pet-lifehouse/LifeHouseAssets'
import {furnitureRegistry} from '../../../services/pet-lifehouse/HouseRegistry'
import {furnitureVisual} from '../../../services/pet-lifehouse/SceneVisualRegistry'
import {sceneDefinition,interactionAvailability,placedSceneSlots,sceneObstacles,type SceneInteraction,type SceneZoneId} from '../../../services/pet-lifehouse/SceneConfig'
import {sceneAsset,liveChibiEnabled,type SceneActorSource} from '../../../services/pet-lifehouse/SceneVisualPack'
import {loadSceneImage} from '../../../services/pet-lifehouse/SceneAssetLoader'
import {SceneActionController,type SceneActionState} from '../../../services/pet-lifehouse/SceneActionController'
import {scenePointer,sceneViewport,scenePath,distance,type ScenePoint} from '../../../services/pet-lifehouse/SceneGeometry'
import type {ElementHouse,SlotId} from '../../../services/pet-lifehouse/types'
import SceneCanvas from './SceneCanvas.vue'
import LifeHouseAsset from './LifeHouseAsset.vue'
import WPActionTile from '../../button/WPActionTile.vue'
const props=withDefaults(defineProps<{pet:PetState;house:ElementHouse;preview?:{furnitureId:string;slotId?:SlotId}|null;protectedHouse?:boolean;dark?:boolean;reduced?:boolean;motion?:'idle'|'react'|'celebrate';speech?:string;active?:boolean;dressPreview?:boolean}>(),{preview:null,active:true})
const emit=defineEmits<{manage:[id:string];slot:[slot:SlotId];interact:[];upgrade:[];album:[];help:[];appearance:[source:SceneActorSource]}>()
const forms=usePetFormsStore(),form=computed(()=>forms.stage(props.pet.element)),scene=computed(()=>sceneDefinition(props.pet.element,props.house.level)),zoneId=ref<SceneZoneId>('room'),zone=computed(()=>scene.value.zones.find(z=>z.id===zoneId.value)??scene.value.zones[0])
const state=ref<SceneActionState>({phase:'ready',position:{...zone.value.spawn},motion:'idle',fx:'none',targetId:null,message:'',duration:0,generation:0})
const controller=new SceneActionController(zone.value.spawn,s=>state.value=s),notice=ref(''),loading=ref(true),loadFailed=ref(false),actionsOpen=ref(false),zonesOpen=ref(false),retryAttempt=ref(0),readyAssets=ref(new Set<string>()),managedId=ref<string|null>(null)
const managedObject=computed(()=>props.house.owned.find(o=>o.instanceId===managedId.value)),instance=getCurrentInstance();let generation=0,intent=0,visible=true,alive=true
function retryZone(){retryAttempt.value++;void loadZone()}
async function loadZone(){const token=++generation;loading.value=true;loadFailed.value=false;readyAssets.value=new Set();const list=zone.value.nodes.map(n=>({id:n.assetId,src:sceneAsset(n.assetId)}));for(const s of placedSceneSlots(scene.value,props.house,zone.value.id))list.push({id:s.owned.furnitureId,src:furnitureVisual(s.owned.furnitureId,props.pet.element,'stage',2)});const results=await Promise.all(list.map(async a=>({id:a.id,ok:!!a.src&&await loadSceneImage(a.src)})));if(!alive||token!==generation)return;readyAssets.value=new Set(results.filter(a=>a.ok).map(a=>a.id));loading.value=false;loadFailed.value=results.some(a=>!a.ok);if(loadFailed.value)notice.value='有些小物件暂未加载，可点重试。'}
function stop(){intent++;visible=false;generation++;controller.cancel();managedId.value=null}
function sceneFailure(){loadFailed.value=true;notice.value='场景图片暂未准备好，可点重试。';controller.cancel()}
function cancel(){intent++;controller.cancel();notice.value='';managedId.value=null}
function changeZone(id:SceneZoneId){if(!scene.value.zones.some(z=>z.id===id))return;cancel();zonesOpen.value=false;zoneId.value=id;controller.reset(zone.value.spawn);return loadZone()}
function obstacles(){return sceneObstacles(scene.value,props.house,zone.value.id)}
function pathTo(target:ScenePoint){return scenePath(state.value.position,target,zone.value.walkable,obstacles())}
async function run(spec:SceneInteraction){
 if(!visible||!props.active||props.protectedHouse||state.value.phase!=='ready'||loadFailed.value)return
 notice.value='';const available=interactionAvailability(spec,scene.value,props.house,id=>!!sceneAsset(id))
 if(!available.ready||!available.zone){notice.value=available.reason;return}
 if(available.zone.id!==zone.value.id){const pending=changeZone(available.zone.id),token=intent;await pending;if(token!==intent)return}
 const actual=interactionAvailability(spec,scene.value,props.house,id=>readyAssets.value.has(id));if(!visible||!props.active||!actual.ready||loading.value){notice.value=actual.reason||'小屋正在准备，请稍等一下。';return}
 if(actual.slot){const own=props.house.owned.find(o=>o.instanceId===props.house.slots[actual.slot!.id]);if(!own||!readyAssets.value.has(own.furnitureId)){notice.value='家具图片暂不可用，加载后再试试。';return}}
 if(scene.value.revision===3){const token=intent,art=spec.pose&&poseArt(props.pet.element,form.value,spec.pose),sources=[...(spec.pose?[art&&currentSceneAsset(art.fileId)]:[]),...(spec.pose==='sleep'?[sceneAsset('v6-bed-front-'+props.pet.element)]:[]),...(spec.fx==='watering'?[sceneAsset('v6-prop-watering-can')]:spec.fx==='harvest'?[sceneAsset('v6-prop-harvest-basket')]:[])];if(sources.length){const ready=(await Promise.all(sources.map(src=>src?loadSceneImage(src):Promise.resolve(false)))).every(Boolean);if(token!==intent||!visible||!props.active)return;if(!ready){notice.value='这个动作的图片暂未准备好，稍后再一起试试。';return}}}
 let path=pathTo(scene.value.revision===1&&spec.element==='fire'&&spec.level===2?{x:.36,y:.79}:actual.target);if(spec.element==='fire'&&spec.level===5){const waypoints=[{x:.32,y:.84},{x:.66,y:.86},actual.target],route=[state.value.position];for(const target of waypoints){const segment=scenePath(route[route.length-1],target,zone.value.walkable,obstacles());if(!segment){path=undefined;break}route.push(...segment.slice(1))}if(path)path=route}if(!path){notice.value='这里暂时走不过去，换个位置试试。';return}
 await controller.run({...spec,returnToStart:scene.value.revision>=2,...(scene.value.revision===3&&spec.pose==='sleep'&&actual.slot?{responseAnchor:{x:actual.slot.rect.x+actual.slot.rect.width*.5,y:actual.slot.rect.y+actual.slot.rect.height*.74}}:{}),targetId:spec.fixtureId??actual.slot?.id??spec.id,...(scene.value.revision===1&&spec.element==='fire'&&spec.level===2?{responsePath:[{x:.39,y:.63},{x:.55,y:.78}]}:{})},path,props.reduced)
}
function object(slot:SlotId,id:string){managedId.value=id;const spec=scene.value.interactions.find(s=>s.slotId===slot||s.targetKind==='chime'&&furnitureRegistry[managedObject.value?.furnitureId??'']?.kind==='chime');if(spec)void run(spec);else notice.value='喜欢这个小角落，可以调整或收纳。'}
function ground(event:any){if(!visible||!props.active||props.preview||state.value.phase!=='ready')return;const touch=event.changedTouches?.[0]??event.touches?.[0],x=touch?.clientX??event.detail?.x,y=touch?.clientY??event.detail?.y;if(!Number.isFinite(x)||!Number.isFinite(y))return;uni.createSelectorQuery().in(instance?.proxy).select('.lh-scene-canvas').boundingClientRect(rect=>{if(!visible||!rect||Array.isArray(rect)||state.value.phase!=='ready')return;const view=sceneViewport(rect.width??0,rect.height??0);if(!view)return;const tapped=scenePointer({x:x-(rect.left??0),y:y-(rect.top??0)},view),point=scene.value.revision>=2&&tapped?[...(zone.value.anchors??[zone.value.spawn])].filter(a=>pathTo(a)).sort((a,b)=>distance(a,tapped)-distance(b,tapped))[0]:tapped,path=point&&pathTo(point);if(!path){notice.value='走在软软的地面上就好。';return}notice.value='';managedId.value=null;void controller.run({id:'walk',targetId:'ground',motion:'idle',fx:'none',message:'到这里看看。'},path,props.reduced)}).exec()}
function appearance(source:SceneActorSource){emit('appearance',source)}
watch(()=>[props.pet.element,props.house.level,form.value,props.pet.equippedCosmetics.join(',')],()=>{cancel();zoneId.value='room';controller.reset(zone.value.spawn);void loadZone()})
watch(()=>JSON.stringify(props.house.slots),async(next,previous)=>{
 const before=JSON.parse(previous||'{}'),after=JSON.parse(next),slot=Object.keys(after).find(k=>after[k]!==before[k]) as SlotId|undefined
 controller.cancel();const token=intent;await loadZone();await nextTick();if(token!==intent||!props.active||!slot)return
 const placed=props.house.owned.find(o=>o.instanceId===after[slot]),kind=placed&&furnitureRegistry[placed.furnitureId]?.kind,spec=scene.value.interactions.find(s=>s.slotId===slot&&s.targetKind===kind||s.targetKind==='chime'&&kind==='chime')
 if(spec)void run(spec)
})
watch(()=>props.preview?.slotId,slot=>{const z=scene.value.slots.find(s=>s.id===slot)?.zoneId;if(z&&z!==zone.value.id)changeZone(z)})
watch(()=>[props.active,props.reduced],()=>{cancel();if(props.active){visible=true;void loadZone()}})
function windowResize(){controller.cancel()}
onMounted(()=>{void loadZone();uni.onWindowResize?.(windowResize)});onShow(()=>{visible=true;if(alive)void loadZone()});onHide(stop);onUnmounted(()=>{alive=false;stop();controller.dispose();uni.offWindowResize?.(windowResize)})
defineExpose({cancel,run,changeZone})
</script>
<style scoped>
.lh-v4-stage.lh-stage{aspect-ratio:auto;max-height:none;min-height:0;padding:10px;background:var(--lh-surface);overflow:visible}.lh-v4-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 3px 6px}.lh-zone-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:0 0 5px}.lh-zone-tabs .wp-action-tile{font-size:var(--wp-font-caption);padding:4px 9px;min-height:44px;background:var(--lh-tint);border-radius:14px}.lh-v4-stage-caption{display:flex;align-items:center;justify-content:center;min-height:38px;gap:6px;padding:5px 8px;text-align:center;color:var(--lh-muted);font-size:var(--wp-font-caption);line-height:1.4}.lh-scene-controls,.lh-scene-object-tools{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:0 4px}.lh-scene-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding-top:5px}.lh-scene-actions .wp-action-tile{padding:6px 4px;min-height:44px;border-radius:14px;background:var(--lh-tint);font-size:var(--wp-font-caption)}@media(max-width:359px){.lh-scene-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
<style scoped>
@media(max-width:999px){.lh-stage-dress-preview :deep(.lh-scene-canvas){max-width:300px;margin:0 auto}.lh-stage-dress-preview.lh-stage{padding-bottom:8px}}
</style>

<style scoped>
.lh-stage-scene-wrap{position:relative;min-width:0}.lh-scene-quick-actions{position:absolute;left:6px;right:6px;top:6px;z-index:190;display:flex;justify-content:space-between;pointer-events:none}.lh-scene-quick-actions .lh-quick-action{display:flex;align-items:center;justify-content:center;min-height:44px;max-width:28%;padding:6px 6px;border:1px solid var(--lh-line);border-radius:18px;background:var(--lh-product-surface,var(--lh-surface));color:var(--lh-ink);font-size:var(--wp-font-caption);line-height:1.3;box-shadow:0 2px 6px #38596812;pointer-events:auto}.lh-scene-quick-actions.lh-quick-dock{position:static;gap:10px;padding-top:4px}.lh-quick-dock .lh-quick-action{flex:1;max-width:none}.lh-v4-stage .lh-v4-stage-caption{justify-content:space-between;padding:0 3px;min-height:44px;text-align:left}.lh-stage-message{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lh-stage-message.lh-has-feedback{white-space:normal;overflow-wrap:anywhere}.lh-stage-help{padding:6px!important}.lh-v4-heading>view{min-width:0}.lh-v4-heading .lh-caption{display:block;line-height:1.4}.lh-zone-tabs .wp-action-tile[aria-pressed=true]{background:var(--lh-selection);color:var(--lh-selection-ink);border-color:var(--lh-selection-line)}
@media(max-width:599px){.lh-stage-scene-wrap{max-width:320px;margin-inline:auto}.lh-v4-stage.lh-stage{padding:8px}}
@media(max-width:599px) and (max-height:780px){.lh-stage-scene-wrap{max-width:260px;margin-inline:auto}.lh-v4-stage.lh-stage{padding:8px}.lh-v4-heading{padding-bottom:4px}.lh-v4-heading .lh-caption{font-size:var(--wp-font-caption)}}
</style>
