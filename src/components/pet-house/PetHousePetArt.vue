<template><view class="pet-cutout" :class="{'pet-cutout-evolved':stage===3}" :aria-label="petInfo[element].elementName+'精灵 · '+petInfo[element].name"><image class="pet-cutout-image" :src="'/static/pet-house/'+element+'-pet.png'" mode="aspectFit" :aria-label="petInfo[element].name"/><text v-if="cosmetic" class="pet-accessory" :class="'accessory-'+cosmetic" :aria-label="accessoryName">{{cosmetic==='ribbon'?'⋈':cosmetic==='scarf'?'≈':'★'}}</text><text v-if="stage&&stage>1" class="pet-stage-badge">{{stage===3?'进化期':'成长期'}}</text></view></template>
<script setup lang="ts">
import {computed} from 'vue'
import {petInfo,type Element} from '../../../packages/pet_engine'
const props=defineProps<{element:Element;stage?:number;cosmetic?:string}>()
const accessoryName=computed(()=>({ribbon:'探索丝带',scarf:'暖暖围巾',star:'星星徽章'}[props.cosmetic||'']||''))
</script>
<style scoped>
.pet-cutout{position:relative;width:100%;height:100%;min-width:0}.pet-cutout-image{display:block;width:100%;height:100%}.pet-accessory{position:absolute;right:18%;bottom:26%;font-size:30px;color:var(--pet-accent);background:var(--pet-surface);border-radius:50%;width:38px;height:38px;line-height:38px;text-align:center}.accessory-scarf{border-radius:12px}.pet-stage-badge{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--pet-surface);color:var(--pet-accent);font-size:var(--wp-font-caption);padding:3px 10px;border-radius:12px}
</style>
