<template><image class="pet-home-learning-symbol" :src="source" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {petHomeLearningIconSource,type PetHomeLearningIconName} from '../../services/pet-home-learning-icons'
const props=defineProps<{name:PetHomeLearningIconName}>(),theme=useThemeStore()
const source=computed(()=>petHomeLearningIconSource(props.name,{dark:theme.mode==='dark',highContrast:theme.settings.highContrast}))
</script>
<style scoped>.pet-home-learning-symbol{display:block;width:72px;height:72px;min-width:72px;max-width:72px;aspect-ratio:1;flex-shrink:0}</style>
