<template>
 <view class="study-mode-control" :class="{'compact-mode-control':compact}">
 <view class="study-mode-selector" role="group" aria-label="选择学习方式">
  <WPActionTile v-for="option in options" :key="option.id+(selectedModes?'-group':'-single')" toggle-highlight class="mode-button study-mode-tile" :class="{selected:selectedModes?selectedModes.includes(option.id):modelValue===option.id}" :data-mode="option.id" :selected="selectedModes?selectedModes.includes(option.id):modelValue===option.id" :disabled="disabled||option.disabled" :aria-label="option.name+'，'+option.description+(disabled?'，'+lockedReason:option.disabled?'，当前条件暂不可用':'')" @click="$emit('update:modelValue',option.id)" @cancel="$emit('clear',option.id)">
   <view class="study-mode-art" aria-hidden="true"><image v-if="!failed.has(option.id)" class="study-mode-image" :src="iconSources?.[option.id]||studyModeIcons[option.id].src" mode="aspectFit" @error="failed.add(option.id)"/><text v-else class="study-mode-fallback">{{studyModeIcons[option.id].fallback}}</text></view>
   <text class="study-mode-title">{{option.name}}</text>
  </WPActionTile>
 </view>
 <text v-if="!disabled&&unavailableNames" class="study-mode-availability" role="status">{{unavailableNames}}暂不可用</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import type {LearningMode} from '../../../packages/core_learning'
import WPActionTile from '../button/WPActionTile.vue'
import {studyModeIcons} from '../../services/study-mode-icons'
const props=withDefaults(defineProps<{compact?:boolean;modelValue?:LearningMode;selectedModes?:readonly LearningMode[];iconSources?:Partial<Record<LearningMode,string>>;options:readonly {id:LearningMode;name:string;description:string;disabled?:boolean}[];disabled?:boolean;lockedReason?:string}>(),{disabled:false,lockedReason:'进入下一词后可切换'})
defineEmits<{'update:modelValue':[value:LearningMode];clear:[value:LearningMode]}>()
const failed=ref(new Set<LearningMode>())
const unavailableNames=computed(()=>props.options.filter(option=>option.disabled).map(option=>option.name).join('、'))
</script>
<style scoped>
.study-mode-control{min-width:0;width:100%}
.wp-app .study-space .study-mode-selector{--study-mode-art-size:clamp(36px,calc((100vw - 150px)/5),40px);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;align-content:start;min-width:0;width:100%;padding:6px 4px;border:1px solid var(--wp-border);border-radius:20px;background:var(--wp-surface);box-sizing:border-box}
.wp-app .study-space .study-mode-tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:88px;width:100%;margin:0;padding:8px 0;box-sizing:border-box;border:2px solid transparent;border-radius:14px;background:var(--wp-surface);color:var(--wp-foreground);text-align:center;white-space:normal;transition:background 150ms,border-color 150ms,transform 120ms}
.wp-app .study-space .study-mode-tile.selected{border-color:var(--wp-primary);background:var(--wp-secondary);color:var(--wp-primary)}
.study-mode-art{position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:var(--study-mode-art-size);height:var(--study-mode-art-size)}
.study-mode-image{display:block;width:100%;height:100%;object-fit:contain}
.study-mode-title{display:block;font-size:clamp(16px,var(--wp-font-body),20px);font-weight:600;line-height:1.4;white-space:nowrap}
.selected .study-mode-title{font-weight:700}
.study-mode-availability{display:block;margin-top:6px;font-size:var(--wp-font-caption);line-height:1.4;color:var(--wp-muted-foreground)}
.study-mode-fallback{color:var(--wp-primary);font-size:24px;line-height:1;font-weight:600}
.wp-app .study-space .study-mode-tile:not([disabled]):active{transform:scale(.98);border-color:var(--wp-primary)}
.wp-app .study-space .study-mode-tile:focus-visible{outline:2px solid var(--wp-primary);outline-offset:2px}
.wp-app.high-contrast .study-space .study-mode-tile:not(.selected){border-color:var(--wp-border)}
.wp-app.reduce-motion .study-space .study-mode-tile{transition:none;transform:none}
@media(prefers-reduced-motion:reduce){.wp-app .study-space .study-mode-tile{transition:none}.wp-app .study-space .study-mode-tile:not([disabled]):active{transform:none}}
.wp-app .study-space .compact-mode-control .study-mode-selector{--study-mode-art-size:26px;padding:4px;box-shadow:none}
.wp-app .study-space .compact-mode-control .study-mode-tile{min-height:64px;gap:2px;padding:4px 0}
.compact-mode-control .study-mode-title{font-size:var(--wp-font-small);line-height:1.3}
</style>
