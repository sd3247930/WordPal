<template><image class="pet-dress-symbol" :src="source" :style="{width:dimension+'px',height:dimension+'px'}" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import type {PetDressIconName} from '../../services/pet-dress-icons'
import {lifeHouseIcon} from '../../services/pet-lifehouse/LifeHouseAssets'
const props=withDefaults(defineProps<{name:PetDressIconName;size?:number}>(),{size:80})
const dimension=computed(()=>Math.min(112,Math.max(24,Number.isFinite(props.size)?props.size:80)))
const source=computed(()=>lifeHouseIcon('dress-'+props.name as `dress-${PetDressIconName}`))
</script>
<style scoped>.pet-dress-symbol{display:block;flex-shrink:0;max-width:100%}</style>
