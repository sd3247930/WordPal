<template><image class="pet-food-symbol" :src="source" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import type {PetFoodIconName} from '../../services/pet-food-icons'
import {lifeHouseIcon} from '../../services/pet-lifehouse/LifeHouseAssets'
const props=defineProps<{name:PetFoodIconName}>()
const source=computed(()=>lifeHouseIcon('food-'+props.name as `food-${PetFoodIconName}`))
</script>
<style scoped>.pet-food-symbol{display:block;width:64px;height:64px;flex-shrink:0}</style>
