<template>
 <view class="custom-route" :class="{'custom-route-compact':compact}" :style="compact?{gridTemplateColumns:'repeat('+session.modes.length+',minmax(0,1fr))'}:undefined" role="list" aria-label="本次练习模式进度">
  <view v-for="(mode,index) in session.modes" :key="mode" role="listitem" class="custom-route-step" :class="{current:session.status!=='completed'&&session.modeIndex===index,done:session.results[mode].completedWordIds.length===session.wordIds.length}">
   <text class="custom-route-number">{{index+1}}</text>
   <image v-if="!failed.has(mode)" class="custom-route-icon" :src="studyModeIcons[mode].src" mode="aspectFit" aria-hidden="true" @error="failed.add(mode)"/><text v-else aria-hidden="true">{{studyModeIcons[mode].fallback}}</text>
   <view class="custom-route-copy"><text class="strong">{{CUSTOM_MODE_NAMES[mode]}}</text><text v-if="!compact" class="small muted block">{{descriptions[mode]}}</text></view>
   <view class="custom-route-status"><text>{{session.results[mode].completedWordIds.length}}/{{session.wordIds.length}}</text><text v-if="!compact" class="small muted block">{{session.results[mode].completedWordIds.length===session.wordIds.length?'已完成':session.modeIndex===index?'当前阶段':'未开始'}}</text></view>
  </view>
 </view>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import type {LearningMode} from '../../../packages/core_learning'
import type {CustomPracticeSession} from '../../../packages/core_learning/custom-practice'
import {CUSTOM_MODE_NAMES} from '../../services/learning/CustomPractice'
import {studyModeIcons} from '../../services/study-mode-icons'
defineProps<{session:CustomPracticeSession;compact?:boolean}>()
const failed=ref(new Set<LearningMode>())
const descriptions:Record<LearningMode,string>={flash:'认识词形，回想词义',connect:'分组配对，连接词与词义',listen:'听一听，选出对应单词',spell:'看词义，写出英文',dictation:'听发音，独立写出英文'}
</script>
<style scoped>
.custom-route{display:flex;flex-direction:column;gap:10px;min-width:0}.custom-route-step{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--wp-border);border-radius:var(--wp-radius);background:var(--wp-surface);min-width:0}.custom-route-number{display:grid;place-items:center;border:1px solid var(--wp-border);border-radius:50%;width:28px;height:28px;flex-shrink:0;font-size:var(--wp-font-small)}.custom-route-icon{width:44px;height:44px;flex-shrink:0}.custom-route-copy{min-width:0;flex:1;overflow-wrap:anywhere}.custom-route-status{text-align:right;font-size:var(--wp-font-small);flex-shrink:0}.current{border-color:var(--wp-primary);background:var(--wp-secondary)}.current .custom-route-number{background:var(--wp-primary);color:var(--wp-on-primary)}.done .custom-route-number{border-color:var(--wp-success);color:var(--wp-success)}.custom-route-compact{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.custom-route-compact .custom-route-step{padding:8px 2px;gap:4px;flex-direction:column;text-align:center;border-radius:14px}.custom-route-compact .custom-route-number{display:none}.custom-route-compact .custom-route-icon{width:30px;height:30px}.custom-route-compact .custom-route-copy{font-size:var(--wp-font-small)}.custom-route-compact .custom-route-status{text-align:center;font-size:var(--wp-font-caption)}
@media(min-width:1000px){.custom-route-compact{display:flex}.custom-route-compact .custom-route-step{padding:14px;gap:10px;flex-direction:row;text-align:left}.custom-route-compact .custom-route-copy{flex:1}.custom-route-compact .custom-route-icon{width:36px;height:36px}}
</style>
