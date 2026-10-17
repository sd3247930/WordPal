<template><view class="pet-action-symbol" aria-hidden="true"><image v-if="attempt<2" :key="source" class="pet-action-image" :src="source" mode="aspectFit" @error="onError"/><text v-else class="pet-action-fallback">{{fallback[name]}}</text></view></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {petActionIconSource,petActionFallbackSource,type PetActionIconName} from '../../services/pet-action-icons'
const props=defineProps<{name:PetActionIconName}>(),theme=useThemeStore(),attempt=ref(0)
const appearance=computed(()=>({dark:theme.mode==='dark',highContrast:theme.settings.highContrast}))
const primary=computed(()=>petActionIconSource(props.name,appearance.value)),backup=computed(()=>petActionFallbackSource(props.name,appearance.value))
const source=computed(()=>attempt.value===0?primary.value:backup.value)
const fallback={home:'家',feed:'喂',growth:'长',dress:'装',album:'册'}
function onError(){attempt.value=primary.value===backup.value?2:Math.min(2,attempt.value+1)}
watch([primary,backup],()=>attempt.value=0)
</script>
<style scoped>.pet-action-symbol{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;aspect-ratio:1;flex-shrink:0}.pet-action-image{display:block;width:100%;height:100%}.pet-action-fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border:1px solid currentColor;border-radius:12px;color:var(--pet-accent);background:var(--pet-tonal);font-size:20px;font-weight:600}</style>
