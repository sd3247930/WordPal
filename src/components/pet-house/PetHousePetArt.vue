<template>
 <view class="pet-cutout" :class="{'pet-cutout-evolved':form>=3}" :data-form="form" :aria-label="identity">
  <image v-if="asset&&accessory" class="pet-wearable-back pet-wearable-layer" :src="petWearableSource(element,form,accessory,'back')" :style="imageSize" mode="aspectFit" aria-hidden="true"/>
  <image v-if="asset" class="pet-cutout-image" :src="asset" :style="imageSize" mode="aspectFit" :aria-label="identity+' · '+petStages[form-1].title"/>
  <view v-if="asset&&accessory" class="pet-accessory" :class="'accessory-'+accessory" :data-fit="element+'-'+form" :aria-label="accessoryName+'已穿戴'"><image class="pet-wearable-layer" :src="petWearableSource(element,form,accessory,'front')" :style="imageSize" mode="aspectFit" aria-hidden="true"/></view>
  <text v-if="asset&&badge&&form>1" class="pet-stage-badge">{{petStages[form-1].title}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {petInfo,type Element} from '../../../packages/pet_engine'
import {petGrowthAsset,petStages} from '../../services/pet-growth'
import {usePetFormsStore} from '../../stores/pet-forms'
import {isPetDressIconName} from '../../services/pet-dress-icons'
import {petWearableSource} from '../../services/pet-wearables'
const props=withDefaults(defineProps<{element:Element;stage?:number;cosmetic?:string;badge?:boolean}>(),{badge:true})
const forms=usePetFormsStore(),form=computed(()=>props.stage??forms.stage(props.element))
const asset=computed(()=>petGrowthAsset(props.element,form.value)),scale=computed(()=>(petStages[form.value-1]?.scale||0)*100)
const imageSize=computed(()=>({width:scale.value+'%',height:scale.value+'%'}))
const identity=computed(()=>petInfo[props.element].elementName+'精灵 · '+petInfo[props.element].name)
const accessory=computed(()=>isPetDressIconName(props.cosmetic)?props.cosmetic:undefined)
const accessoryName=computed(()=>({ribbon:'探索丝带',scarf:'暖暖围巾',star:'星星徽章'}[props.cosmetic||'']||''))
</script>
<style scoped>
.pet-cutout{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;overflow:hidden;isolation:isolate}.pet-cutout-image{position:relative;z-index:1;display:block;flex-shrink:0}.pet-accessory{position:absolute;inset:0;z-index:2;pointer-events:none}.pet-wearable-layer{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:block;pointer-events:none}.pet-wearable-back{z-index:0}.pet-stage-badge{position:absolute;z-index:3;bottom:2px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--pet-surface,var(--wp-surface));color:var(--pet-accent,var(--wp-primary));font-size:var(--wp-font-caption);padding:3px 10px;border-radius:12px}
</style>
