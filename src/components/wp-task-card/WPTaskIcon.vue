<template><view class="task-symbol" aria-hidden="true"><image v-if="attempt<2" :key="source" class="task-symbol-image" :src="source" mode="aspectFit" @error="onError"/><text v-else class="task-symbol-fallback">{{fallback[name]}}</text></view></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {taskIconSource,taskIconFallbackSource,type TaskIconName} from '../../services/task-icons'
const props=defineProps<{name:TaskIconName}>(),theme=useThemeStore(),attempt=ref(0)
const appearance=computed(()=>({dark:theme.mode==='dark',highContrast:theme.settings.highContrast}))
const primary=computed(()=>taskIconSource(props.name,appearance.value)),backup=computed(()=>taskIconFallbackSource(props.name,appearance.value))
const source=computed(()=>attempt.value===0?primary.value:backup.value)
const fallback={new:'词',listen:'听',spell:'拼',review:'复'}
function onError(){attempt.value=primary.value===backup.value?2:Math.min(2,attempt.value+1)}
watch([primary,backup],()=>attempt.value=0)
</script>
<style scoped>.task-symbol{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;aspect-ratio:1;flex-shrink:0}.task-symbol-image{display:block;width:100%;height:100%}.task-symbol-fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border:1px solid currentColor;border-radius:12px;background:var(--wp-surface-tonal);color:var(--wp-foreground);font-size:20px;font-weight:600}</style>
