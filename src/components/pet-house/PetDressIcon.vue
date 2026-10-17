<template><image class="pet-dress-symbol" :src="source" :style="{width:dimension+'px',height:dimension+'px'}" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {petDressIconSource,type PetDressIconName} from '../../services/pet-dress-icons'
const props=withDefaults(defineProps<{name:PetDressIconName;size?:number}>(),{size:80}),theme=useThemeStore()
const dimension=computed(()=>Math.min(112,Math.max(24,Number.isFinite(props.size)?props.size:80)))
const source=computed(()=>petDressIconSource(props.name,{dark:theme.mode==='dark',highContrast:theme.settings.highContrast}))
</script>
<style scoped>.pet-dress-symbol{display:block;flex-shrink:0;max-width:100%}</style>
