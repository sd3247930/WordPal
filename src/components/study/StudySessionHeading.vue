<template>
 <view class="study-session-heading block-practice-heading">
  <view class="study-session-title-row"><slot name="back"/><view class="study-session-title"><image class="study-session-icon" :src="studyModeIcons[mode].src" mode="aspectFit" aria-hidden="true"/><text class="page-title">{{title}}</text></view><CustomPracticeEntry @click="$emit('custom')"/></view>
  <view class="study-session-meta" role="status"><text>本轮 {{index}} / {{total}}</text><text v-if="position" class="study-word-position">教材第 {{position.index}} / {{position.total}} 词</text><text v-if="caption" class="study-session-caption">{{caption}}</text></view>
  <WPProgress :value="value" :total="total" label="本轮学习进度"/>
 </view>
</template>
<script setup lang="ts">
import type {LearningMode} from '../../../packages/core_learning'
import CustomPracticeEntry from './CustomPracticeEntry.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import {studyModeIcons} from '../../services/study-mode-icons'
defineProps<{title:string;mode:LearningMode;index:number;total:number;value:number;position?:{index:number;total:number}|null;caption?:string}>()
defineEmits<{custom:[]}>()
</script>
<style scoped>
.study-session-heading{width:100%;max-width:760px;box-sizing:border-box;margin:0 auto 6px;min-width:0}
.study-session-title-row{display:flex;align-items:center;gap:8px;min-height:48px;flex-wrap:wrap}
.study-session-title{display:flex;align-items:center;gap:7px;flex:1;min-width:80px}
.study-session-icon{width:34px;height:34px;flex-shrink:0}
.study-session-title .page-title{font-size:var(--wp-font-section);line-height:1.3;margin:0;overflow-wrap:anywhere}
.study-session-title-row :deep(.wp-button:not(.study-practice-entry-button)){min-height:48px;margin:0;padding:6px 8px;font-size:var(--wp-font-small);white-space:normal;line-height:1.4}
.study-session-meta{display:flex;align-items:center;flex-wrap:wrap;gap:3px 14px;margin:6px 0 2px;font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground)}
.study-session-meta .study-word-position{font-size:inherit;margin:0;line-height:inherit}
.study-session-caption{margin-left:auto}
@media(max-width:359px){.study-session-icon{width:28px;height:28px}.study-session-title{gap:4px}.study-session-meta{column-gap:10px}}
</style>
