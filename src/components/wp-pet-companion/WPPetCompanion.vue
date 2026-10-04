<template><view class="companion"><WPPetAsset :element="element" :size="size" /><text class="companion-name">{{name}}</text><text class="companion-copy">{{message}}</text><slot /></view></template>
<script setup lang="ts">
import WPPetAsset from '../WPPetAsset.vue'
import type {Element} from '../../../packages/pet_engine';withDefaults(defineProps<{element:Element;name:string;message:string;size?:number}>(),{size:210})</script>
<style scoped>.companion{display:flex;align-items:center;flex-direction:column;gap:8px;text-align:center}.companion-name{font-size:24px;font-weight:800}.companion-copy{color:var(--wp-muted-foreground);font-size:14px;max-width:260px}</style>
