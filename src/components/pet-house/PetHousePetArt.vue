<template>
 <view class="pet-cutout" :class="{'pet-cutout-evolved':form>=3}" :data-form="form" :aria-label="identity">
  <view v-if="asset" class="pet-artboard" :style="artboardStyle">
   <DressLayers :layers="layers.filter(layer=>layer.depth==='back')" @error="$emit('error')"/>
   <image class="pet-cutout-image" :src="asset" mode="aspectFit" :aria-label="identity+' · '+petStages[form-1].title" @error="$emit('error')"/>
   <DressLayers :layers="layers.filter(layer=>layer.depth==='front')" @error="$emit('error')"/>
  </view>
  <text v-if="asset&&badge&&form>1" class="pet-stage-badge">{{petStages[form-1].title}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,getCurrentInstance,onMounted,onUnmounted,watch,nextTick} from 'vue'
import {petInfo,type Element} from '../../../packages/pet_engine'
import {petGrowthAsset,petStages} from '../../services/pet-growth'
import {usePetFormsStore} from '../../stores/pet-forms'
import type {PetForm} from '../../services/pet-growth'
import {equipmentLayers} from '../../services/pet-lifehouse/DressRenderer'
import DressLayers from './lifehouse/DressLayers.vue'
// Scene actors own a guaranteed 3:4 plane. Avoid native cross-thread queries for that plane:
// a preloaded Q replacement may unmount this fallback before a selector reply arrives.
const props=withDefaults(defineProps<{element:Element;stage?:number;cosmetic?:string;cosmetics?:readonly string[];badge?:boolean;fit?:'growth'|'portrait';thumbnail?:boolean;fixedPortrait?:boolean}>(),{badge:true,fit:'growth'})
defineEmits<{error:[]}>()
const forms=usePetFormsStore(),form=computed(()=>props.stage??forms.stage(props.element))
const asset=computed(()=>props.thumbnail?`/static/pet-house/lifehouse/companions/${props.element}-${form.value}-256.png`:petGrowthAsset(props.element,form.value)),scale=computed(()=>(props.fit==='portrait'?1:petStages[form.value-1]?.scale||0)*100)
const identity=computed(()=>petInfo[props.element].elementName+'精灵 · '+petInfo[props.element].name)
const layers=computed(()=>equipmentLayers(props.element,form.value as PetForm,props.cosmetics??(props.cosmetic?[props.cosmetic]:[]),'original-fallback'))
const instance=getCurrentInstance(),frame=ref<{width:number;height:number}|null>(null)
const artboardStyle=computed(()=>{const width=props.fixedPortrait?undefined:frame.value&&Math.min(frame.value.width,frame.value.height*.75)*scale.value/100;return width?{width:width+'px',height:width/ .75+'px'}:{width:scale.value+'%',height:scale.value+'%'}})
let mounted=false,observer:ResizeObserver|undefined
function keepFrame(width:number|undefined,height:number|undefined){if(mounted&&width&&height&&width>0&&height>0&&(frame.value?.width!==width||frame.value?.height!==height))frame.value={width,height}}
function measure(){if(!mounted||props.fixedPortrait)return;uni.createSelectorQuery().in(instance?.proxy).select('.pet-cutout').boundingClientRect(rect=>{if(!Array.isArray(rect))keepFrame(rect?.width,rect?.height)}).exec()}
onMounted(()=>{mounted=true;if(props.fixedPortrait)return;const node=instance?.proxy?.$el;if(typeof globalThis.ResizeObserver==='function'&&typeof globalThis.Element==='function'&&node instanceof globalThis.Element){observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect)keepFrame(rect.width,rect.height)});observer.observe(node)}uni.onWindowResize?.(measure);measure()})
watch(()=>props.fixedPortrait,()=>{void nextTick(measure)})
onUnmounted(()=>{mounted=false;observer?.disconnect();uni.offWindowResize?.(measure)})
</script>
<style scoped>
.pet-cutout{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;overflow:visible;isolation:isolate}.pet-artboard{position:relative;flex-shrink:0;overflow:visible;isolation:isolate}.pet-cutout-image{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block}.pet-stage-badge{position:absolute;z-index:6;bottom:2px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--pet-surface,var(--wp-surface));color:var(--pet-accent,var(--wp-primary));font-size:var(--wp-font-caption);padding:3px 10px;border-radius:12px}
</style>
