<template><image class="pet-food-symbol" :src="source" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {petFoodIconSvg,type PetFoodIconName} from '../../services/pet-food-icons'
const props=defineProps<{name:PetFoodIconName}>(),theme=useThemeStore()
const source=computed(()=>{
 // #ifdef MP-WEIXIN
 return `/static/icons/pet-foods/${theme.mode}-${theme.settings.highContrast?'contrast':'normal'}-${props.name}.png`
 // #endif
 // #ifndef MP-WEIXIN
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(petFoodIconSvg(props.name,{dark:theme.mode==='dark',highContrast:theme.settings.highContrast}))
 // #endif
})
</script>
<style scoped>.pet-food-symbol{display:block;width:64px;height:64px;flex-shrink:0}</style>
