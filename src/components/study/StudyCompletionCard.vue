<template>
 <WPCard class="study-completion study-completion-card" role="region" :aria-label="daily?'今日六环节完成结果':'本轮学习结果'">
  <image v-if="!heroFailed" class="completion-art" :src="compactStudyIcons.complete" mode="aspectFit" aria-hidden="true" @error="heroFailed=true"/>
  <text class="completion-title">{{daily?'今日六环节完成啦！':'这一轮，完成啦！'}}</text>
  <view class="completion-saved" role="status"><image :src="compactStudyIcons.saved" mode="aspectFit" aria-hidden="true"/><text>学习进度已保存</text></view>
  <view class="completion-counts">
   <view class="completion-result"><image :src="compactStudyIcons.correct" mode="aspectFit" aria-hidden="true"/><text class="completion-number">{{correct}} / {{total}}</text><text class="completion-label">正式回答正确</text></view>
   <view class="completion-result"><image :src="compactStudyIcons.revisit" mode="aspectFit" aria-hidden="true"/><text class="completion-number">{{revisited}}</text><text class="completion-label">额外回看错词</text></view>
  </view>
  <slot/>
  <view class="completion-actions"><slot name="actions"><DailyTaskAction @click="$emit('return')">回到今日任务</DailyTaskAction></slot></view>
 </WPCard>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import WPCard from '../wp-card/WPCard.vue'
import DailyTaskAction from './DailyTaskAction.vue'
import {compactStudyIcons} from '../../services/study-compact-icons'
defineProps<{daily:boolean;correct:number;total:number;revisited:number}>()
defineEmits<{return:[]}>()
const heroFailed=ref(false)
</script>
<style scoped>
.study-completion.study-completion-card.wp-card{display:flex;flex-direction:column;align-items:center;gap:8px;min-height:0;min-width:0;max-width:760px;width:100%;margin:12px auto;padding:16px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface);box-shadow:var(--wp-elevation);text-align:center}
.completion-art{display:block;width:80px;height:80px}
.completion-title{display:block;max-width:100%;font-size:var(--wp-font-section);font-weight:700;line-height:1.4;overflow-wrap:anywhere;color:var(--wp-foreground)}
.completion-saved{display:flex;align-items:center;justify-content:center;gap:5px;font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-muted-foreground)}
.completion-saved image{width:22px;height:22px;flex:0 0 22px}
.study-completion-card .completion-counts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;margin:4px 0}
.study-completion-card .completion-result{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;padding:10px 6px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface-raised)}
.completion-result image{width:32px;height:32px}
.study-completion-card .completion-number{max-width:100%;font-size:var(--wp-font-card);font-weight:700;line-height:1.4;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.completion-label{font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.completion-actions{width:100%;min-width:0;margin-top:4px}
.completion-actions :deep(.wp-button){width:100%;min-height:48px;margin:0}
.completion-actions :deep(.button-row){margin-top:0}
.high-contrast .study-completion-card.wp-card{border-width:2px;box-shadow:none}
</style>
