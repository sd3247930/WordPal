<template>
 <view class="pet-asset" :class="['pet-'+element,'element-'+element,variant]" :style="{width:size+'px',height:(variant==='portrait'?Math.round(size*1.33):size)+'px'}">
  <PetHousePetArt :element="element" :stage="stage" :cosmetic="variant==='portrait'?cosmetic:undefined" :badge="false"/>
  <!-- 紧凑头像保留完整宠物图像，避免装扮和成长徽章叠加遮挡。 -->
 </view>
</template>
<script setup lang="ts">import PetHousePetArt from './pet-house/PetHousePetArt.vue';import {type Element} from '../../packages/pet_engine';withDefaults(defineProps<{element:Element;size?:number;cosmetic?:string;stage?:number;variant?:'portrait'|'avatar'}>(),{size:160,variant:'portrait'})</script>
<style scoped>.pet-asset{position:relative;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;max-width:100%;border-radius:var(--wp-radius);overflow:hidden;background:var(--wp-element-soft)}.avatar{border-radius:50%}</style>
