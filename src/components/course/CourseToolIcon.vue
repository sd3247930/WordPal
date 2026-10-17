<template><view class="course-tool-symbol" aria-hidden="true"><image v-if="attempt<2" :key="source" class="course-tool-symbol-image" :src="source" mode="aspectFit" @error="onError"/><text v-else class="course-tool-symbol-fallback">{{fallback[name]}}</text></view></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {courseToolIconSource,courseToolFallbackSource,type CourseToolIconName} from '../../services/course-tool-icons'
const props=defineProps<{name:CourseToolIconName}>(),theme=useThemeStore(),attempt=ref(0)
const appearance=computed(()=>({dark:theme.mode==='dark',highContrast:theme.settings.highContrast}))
const primary=computed(()=>courseToolIconSource(props.name,appearance.value)),backup=computed(()=>courseToolFallbackSource(props.name,appearance.value)),source=computed(()=>attempt.value===0?primary.value:backup.value)
const fallback:Record<CourseToolIconName,string>={return:'返',installed:'已',search:'找',uninstall:'减'}
function onError(){attempt.value=primary.value===backup.value?2:Math.min(2,attempt.value+1)}
watch([primary,backup],()=>attempt.value=0)
</script>
<style scoped>.course-tool-symbol{display:flex;align-items:center;justify-content:center;width:100%;height:100%;aspect-ratio:1;min-width:0;flex-shrink:0}.course-tool-symbol-image{display:block;width:100%;height:100%}.course-tool-symbol-fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border:1px solid currentColor;border-radius:var(--wp-radius-lg);background:var(--wp-surface-tonal);color:var(--wp-foreground);font-size:20px;font-weight:600}</style>
