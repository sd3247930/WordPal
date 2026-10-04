<template><view class="avatar"><WPPetAsset :element="element" :size="size" variant="avatar" /></view></template>
<script setup lang="ts">
import WPPetAsset from '../WPPetAsset.vue'
import type {Element} from '../../../packages/pet_engine';withDefaults(defineProps<{element:Element;size?:number}>(),{size:48})</script>
<style scoped>.avatar{border-radius:var(--wp-radius-lg);background:var(--wp-muted);display:inline-flex;padding:4px}</style>
