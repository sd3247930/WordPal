<template>
 <view class="study-stats-row" role="group" aria-label="当前教材学习统计">
  <view v-for="item in items" :key="item.id" class="study-stat-card" :class="{'is-highlighted':highlighted===item.id}" :data-stat="item.id">
   <WPActionTile toggle-highlight :selected="highlighted===item.id" class="study-stat-action" :aria-label="item.label+'，'+item.value+'，'+item.hint" :aria-expanded="item.id==='today'?todayOpen:undefined" @click="activate(item.id)" @cancel="cancel(item.id)">
    <view class="study-stat-art" aria-hidden="true"><image v-if="!failed.has(item.id)" class="study-stat-image" :src="item.src" mode="aspectFit" @error="failed.add(item.id)"/><text v-else class="study-stat-fallback">{{item.fallback}}</text></view>
    <view class="study-stat-copy"><text class="study-stat-label">{{item.label}}</text><view class="study-stat-number"><text class="study-stat-value"><template v-if="item.id==='round'&&round.total>0">{{round.completed}}<text class="study-stat-denominator"> / {{round.total}}</text></template><template v-else>{{item.value}}</template></text><text v-if="item.id!=='round'" class="study-stat-unit">词</text></view></view>
   </WPActionTile>
   <view v-if="item.id==='round'&&round.total>0" class="study-stat-meter"><WPProgress :value="round.completed" :total="round.total" label="本轮已完成题步"/><text class="study-stat-percent">{{Math.floor(round.completed/round.total*100)}}%</text></view>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import type {StudyRoundProgress} from '../../services/learning/StudyStats'
const props=defineProps<{today:number;due:number;round:StudyRoundProgress;daily:boolean;todayOpen:boolean;readyHint:string}>()
const emit=defineEmits<{today:[];review:[];round:[]}>()
type StatKind='today'|'review'|'round'
const highlighted=ref<StatKind|null>(props.todayOpen?'today':null)
watch(()=>props.todayOpen,open=>{if(open)highlighted.value='today';else if(highlighted.value==='today')highlighted.value=null})
function activate(kind:StatKind){highlighted.value=kind;if(kind==='today')emit('today');else if(kind==='review')emit('review');else emit('round')}
function cancel(kind:StatKind){highlighted.value=null;if(kind==='today'&&props.todayOpen)emit('today')}
const failed=ref(new Set<string>())
const items=computed(()=>[
 {id:'today' as const,label:'今日已学新词',value:String(props.today),hint:'当前教材 · 查看明细',src:'/static/icons/study-stats/wordpal_study_today_new_256.png',fallback:'新'},
 {id:'review' as const,label:'待复习',value:String(props.due),hint:props.due?'当前教材 · 到期复习':'当前教材 · 暂无到期',src:'/static/icons/study-stats/wordpal_study_due_review_256.png',fallback:'↻'},
 {id:'round' as const,label:'本轮进度',value:props.round.status==='ready'?'待开始':props.round.status==='unavailable'?'暂不可用':`${props.round.completed} / ${props.round.total}`,hint:props.round.status==='ready'?props.readyHint:props.round.status==='unavailable'?'查看当前学习':props.round.status==='completed'?'本轮题步已完成':props.daily?'六环节 · 已完成题步':'已提交题步 · 继续学习',src:'/static/icons/study-stats/wordpal_study_round_progress_256.png',fallback:'↗'}
])
</script>
<style scoped>
.study-stats-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px;min-width:0}
.study-stat-card{display:flex;flex-direction:column;min-width:0;background:var(--wp-surface);border:1px solid var(--wp-border);border-radius:var(--wp-radius);box-shadow:var(--wp-elevation)}
.study-stat-card.is-highlighted,.study-stat-card:active{background:var(--wp-secondary);border-color:var(--wp-primary);box-shadow:inset 0 0 0 1px var(--wp-primary)}
.wp-app .study-stat-action{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;min-width:0;width:100%;min-height:48px;margin:0;padding:10px 6px;border:0;border-radius:var(--wp-radius);background:transparent;color:var(--wp-foreground);text-align:center;white-space:normal;transition:transform 150ms ease}
.study-stat-art{width:56px;height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.study-stat-image{display:block;width:100%;height:100%;object-fit:contain}
.study-stat-fallback{font-size:32px;line-height:1;color:var(--wp-primary)}
.study-stat-copy{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;width:100%;overflow-wrap:anywhere}
.study-stat-label{font-size:var(--wp-font-small);font-weight:600;line-height:1.5}
.study-stat-number{display:flex;align-items:baseline;justify-content:center;gap:4px;flex-wrap:wrap;max-width:100%;font-variant-numeric:tabular-nums}
.study-stat-value{font-size:calc(var(--wp-font-body) + 8px);font-weight:700;line-height:1.25;white-space:nowrap}
.study-stat-denominator{font-size:.6em;font-weight:500;color:var(--wp-muted-foreground)}
.study-stat-unit,.study-stat-percent{font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground)}
.study-stat-meter{display:flex;align-items:center;gap:6px;padding:0 8px 8px}.study-stat-meter :deep(.progress){flex:1;min-width:0;height:6px}.study-stat-percent{font-variant-numeric:tabular-nums;white-space:nowrap}
.reduce-motion .study-stat-action{transition:none}.wp-app.reduce-motion .study-stat-action:active{transform:none}.reduce-motion .study-stat-meter :deep(.bar){transition:none}
@media(prefers-reduced-motion:reduce){.study-stat-action{transition:none}.wp-app .study-stat-action:active{transform:none}.study-stat-meter :deep(.bar){transition:none}}
@media(min-width:600px){.study-stat-art{width:64px;height:64px}.study-stat-label{font-size:calc(var(--wp-font-small) + 1px)}.study-stat-value{font-size:calc(var(--wp-font-body) + 12px)}.wp-app .study-stat-action{padding:12px 10px}}
@media(min-width:1100px){.wp-app .study-stat-action{flex-direction:row;justify-content:center;gap:14px;min-height:88px;text-align:left}.study-stat-copy{align-items:flex-start;width:auto}.study-stat-number{justify-content:flex-start}.study-stat-meter{padding:0 12px 8px}}
@media(max-width:359px){.study-stats-row{grid-template-columns:minmax(0,1fr)}.wp-app .study-stat-action{flex-direction:row;justify-content:flex-start;min-height:80px;padding:10px 14px;gap:12px;text-align:left}.study-stat-copy{align-items:flex-start;width:auto}.study-stat-number{justify-content:flex-start}}
.large-text .study-stats-row,.scaled-text .study-stats-row{grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))}
.wp-app.large-text .study-stat-action,.wp-app.scaled-text .study-stat-action{flex-direction:row;justify-content:flex-start;gap:12px;text-align:left}.large-text .study-stat-copy,.scaled-text .study-stat-copy{align-items:flex-start;width:auto}.large-text .study-stat-number,.scaled-text .study-stat-number{justify-content:flex-start}
</style>
