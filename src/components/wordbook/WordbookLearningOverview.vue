<template>
 <WPCard class="wordbook-learning-overview" aria-label="范围学习总览" :data-total="summary.total">
  <view class="wordbook-overview-heading"><view><WordbookArtwork name="overview"/><text class="section-title">学习总览</text></view><text class="wordbook-overview-context">{{context}} · {{summary.total}} 个独立词</text></view>
  <view v-if="summary.total" class="wordbook-progress" role="img" :aria-label="progressLabel"><view v-for="segment in segments" :key="segment.id" :class="'progress-'+segment.id" :style="{width:segment.count/summary.total*100+'%'}"/></view>
  <view class="wordbook-learning-metrics wordbook-stats">
   <view v-for="segment in segments" :key="segment.id" :data-stage="segment.id"><text class="wordbook-metric-number" :class="'metric-'+segment.id">{{segment.count}}</text><text>{{segment.label}}</text></view>
   <view v-if="!summary.unrated" data-stage="total"><text class="wordbook-metric-number">{{summary.total}}</text><text>总词数</text></view>
  </view>
  <text v-if="!summary.total" class="small muted block">当前范围还没有单词，试试切换教材或范围。</text>
  <text v-else-if="summary.unrated" class="wordbook-unrated-note">待评估：旧记录缺少可靠答题证据，原复习计划保留。</text>
 </WPCard>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import WPCard from '../wp-card/WPCard.vue'
import WordbookArtwork from './WordbookArtwork.vue'
import type {WordbookLearningSummary} from '../../services/content/WordbookLearningSummary'
const props=defineProps<{summary:WordbookLearningSummary;context:string}>()
const segments=computed(()=>[
 {id:'mastered',label:'已掌握',count:props.summary.mastered},
 {id:'learning',label:'学习中',count:props.summary.learning},
 {id:'unseen',label:'未学习',count:props.summary.unseen},
 ...(props.summary.unrated?[{id:'unrated',label:'待评估',count:props.summary.unrated}]:[])
])
const progressLabel=computed(()=>segments.value.map(segment=>segment.label+' '+segment.count).join('，')+'，共 '+props.summary.total+' 个独立词')
</script>
