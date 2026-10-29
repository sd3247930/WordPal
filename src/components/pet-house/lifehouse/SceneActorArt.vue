<template>
 <view class="lh-scene-actor-art" :data-appearance="display.mode" :data-variant="display.variantId" :data-form="form" :data-pose="displayPose" :data-cosmetic="cosmetic||cosmetics?.[0]||undefined" :data-equipment="ids.join(',')">
  <template v-if="display.mode==='chibi'">
   <DressLayers :layers="displayLayers.filter(layer=>layer.depth==='back')" @error="fallback"/>
   <image class="lh-q-body" :src="display.body" mode="aspectFit" :aria-label="label" @error="fallback"/>
   <DressLayers :layers="displayLayers.filter(layer=>layer.depth==='front')" @error="fallback"/>
  </template>
  <PetHousePetArt v-else :element="element" :stage="form" :cosmetics="ids" :badge="false" fit="portrait" fixed-portrait @error="originalFailed=true"/>
  <WPActionTile v-if="originalFailed" class="lh-actor-retry" :aria-label="'重试加载'+label" @click.stop="retry">伙伴图片暂不可用 · 重试</WPActionTile>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue'
import type {Element} from '../../../../packages/pet_engine'
import {petInfo} from '../../../../packages/pet_engine'
import type {PetForm} from '../../../services/pet-growth'
import {sceneActorSource,originalActorSource,type SceneActorSource} from '../../../services/pet-lifehouse/SceneVisualPack'
import {loadSceneImage} from '../../../services/pet-lifehouse/SceneAssetLoader'
import PetHousePetArt from '../PetHousePetArt.vue'
import WPActionTile from '../../button/WPActionTile.vue'
import DressLayers from './DressLayers.vue'
import {equipmentLayers,poseEquipmentLayers,type DressLayer} from '../../../services/pet-lifehouse/DressRenderer'
import {equippedItems} from '../../../services/pet-lifehouse/DressCatalog'
import {poseArt,currentSceneAsset,type ActorPose} from '../../../services/pet-lifehouse/CurrentScenePack'
const props=withDefaults(defineProps<{element:Element;form:PetForm;cosmetic?:string|null;cosmetics?:readonly string[];allowQ?:boolean;pose?:ActorPose}>(),{allowQ:true,pose:'idle'})
const emit=defineEmits<{appearance:[source:SceneActorSource]}>()
const displayPose=ref<ActorPose>('idle')
const display=ref<SceneActorSource>(originalActorSource(props.element,props.form)),originalFailed=ref(false),label=computed(()=>petInfo[props.element].name+' · 精灵')
const ids=computed(()=>equippedItems(props.cosmetics??(props.cosmetic?[props.cosmetic]:[]),props.element)),displayLayers=ref<DressLayer[]>([])
let generation=0,actorKey=''
function publish(source:SceneActorSource){display.value=source;emit('appearance',source)}
function fallback(){generation++;displayPose.value='idle';publish(originalActorSource(props.element,props.form))}
async function retry(){
 const token=++generation;originalFailed.value=false;const key=props.element+':'+props.form+':'+ids.value.join(',');if(key!==actorKey){actorKey=key;displayLayers.value=[];displayPose.value='idle';publish(originalActorSource(props.element,props.form))}const target=sceneActorSource(props.element,props.form,undefined,props.allowQ)
 if(target.mode!=='chibi'){displayLayers.value=[];displayPose.value='idle';publish(target);return}
 const layers=equipmentLayers(props.element,props.form,ids.value,'chibi'),art=poseArt(props.element,props.form,props.pose),body=art&&currentSceneAsset(art.fileId)
 const posed=body&&await loadSceneImage(body),ok=await Promise.all([target.body,...layers.map(layer=>layer.src)].map(loadSceneImage))
 if(token!==generation)return
 if(!ok.every(Boolean)){fallback();return}
 displayLayers.value=art&&posed?poseEquipmentLayers(props.element,props.form,layers,art):layers;displayPose.value=art&&posed?art.pose:'idle'
 publish(art&&posed?{...target,body:body!,support:art.support,pose:art.pose}:target)
}
watch(()=>[props.element,props.form,ids.value.join(','),props.allowQ,props.pose],retry,{immediate:true});onUnmounted(()=>generation++)
</script>
<style scoped>
.lh-scene-actor-art{position:relative;width:100%;height:100%;isolation:isolate;overflow:visible}.lh-q-body,.lh-q-wear{position:absolute;display:block;width:100%;height:100%;left:0;top:0;pointer-events:none}.lh-q-body{z-index:1}.lh-q-wear{left:50%;top:50%;transform:translate(-50%,-50%)}.lh-q-back{z-index:0}.lh-q-front{z-index:2}.lh-actor-retry{position:absolute;inset:0;z-index:5;background:var(--lh-surface);font-size:var(--wp-font-caption);min-height:44px}
</style>
