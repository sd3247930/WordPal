<template>
 <view class="learning-level-icon" aria-hidden="true">
  <image v-if="!failed" :key="source" class="learning-level-image" :src="source" mode="aspectFit" @error="failed=true"/>
  <text v-else class="learning-level-fallback">L{{level}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import type {EntryLevel} from '../../../packages/parent_settings'
import {learningLevelIconSource} from '../../services/learning-level-icons'
const props=defineProps<{level:EntryLevel;imageSrc?:string}>(),failed=ref(false)
const source=computed(()=>props.imageSrc||learningLevelIconSource(props.level))
watch(source,()=>{failed.value=false})
</script>
<style scoped>
.learning-level-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;aspect-ratio:1;flex-shrink:0}
.learning-level-image{display:block;width:100%;height:100%;object-fit:contain}
.learning-level-fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:var(--wp-radius-sm);background:var(--wp-surface-tonal);color:var(--wp-primary);font-size:var(--wp-font-section);font-weight:700}
</style>
