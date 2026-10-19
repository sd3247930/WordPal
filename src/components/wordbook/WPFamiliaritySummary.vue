<template>
 <WPCard class="familiarity-summary" aria-label="教材熟知度总览">
  <view class="section-heading"><text class="section-title">教材熟知度</text><text class="small muted">{{unitTitle||'整册教材'}}</text></view>
  <text v-if="courseTitle" class="small block">{{courseTitle}}</text>
  <view class="familiarity-facts"><view><text class="strong">{{summary.totalOccurrences}}</text><text>教材词条</text></view><view><text class="strong">{{summary.learnedOccurrences}}</text><text>已学习</text></view><view><text class="strong">{{summary.dueUniqueLexemes}}</text><text>今日到期词</text></view></view>
  <text class="small muted block">去重 {{summary.uniqueLexemes}} 词 · 已学按教材出现位置计数</text>
  <view class="coverage-track" role="progressbar" :aria-valuenow="summary.learnedOccurrences" :aria-valuemin="0" :aria-valuemax="summary.totalOccurrences||1" :aria-label="'学习覆盖率 '+summary.learnedOccurrences+' / '+summary.totalOccurrences"><view :style="{width:(summary.totalOccurrences?summary.learnedOccurrences/summary.totalOccurrences*100:0)+'%'}"/></view>
  <text class="small block">学习覆盖 {{summary.learnedOccurrences}} / {{summary.totalOccurrences}} · 不等于掌握率</text>
  <view class="familiarity-distribution"><WPActionTile toggle-highlight v-for="level in familiarityLevels" :key="level" class="familiarity-state" :data-level="level" :aria-label="familiarityLabels[level]+'，'+summary.byFamiliarity[level]+' 个教材词条'"><view class="familiarity-state-art" aria-hidden="true"><image v-if="!failed.has(level)" class="familiarity-state-image" :src="familiarityIcons[level].src" mode="aspectFit" @error="failed.add(level)"/><text v-else class="familiarity-state-fallback">{{familiarityIcons[level].fallback}}</text></view><text class="familiarity-state-label">{{familiarityLabels[level]}}</text><text class="strong familiarity-state-count">{{summary.byFamiliarity[level]}}</text></WPActionTile></view>
  <WPButton kind="quiet" :aria-expanded="explain" @click="explain=!explain">熟知度如何评估 {{explain?'⌃':'⌄'}}</WPButton>
  <text v-if="explain" class="small muted block" role="status">依据真实练习与复习记录保守估算。这不是考试评分；浏览、收藏和听发音不会提高熟知度。跨天独立答对与到期复习提供稳定记忆的证据，答错或使用提示后会重新积累。</text>
 </WPCard>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import {familiarityLevels,familiarityLabels,type FamiliarityLevel} from '../../services/content/FamiliaritySelector'
import {familiarityIcons} from '../../services/familiarity-icons'
import type {summarizeCourseCards} from '../../services/content/WordbookQueryBuilder'
defineProps<{summary:ReturnType<typeof summarizeCourseCards>;unitTitle?:string;courseTitle?:string}>()
const explain=ref(false)
const failed=ref(new Set<FamiliarityLevel>())
</script>
